import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  BANNIERES,
  COUT_GENE_ESSENCE,
  COUT_RESPEC_TALENT,
  coutFabrication,
  COUT_REROLL_GENES,
  COUT_REROLL_GENES_SORT,
  DIVISIONS,
  divisionPourElo,
  ESPECES_PAR_ID,
  invoquer,
  ITEMS_PAR_ID,
  IV_MAX,
  numeroSaison,
  Rng,
  SORTS_PAR_ID,
  STARTERS_PAR_ID,
  seedAleatoire,
  TAILLE_EQUIPE,
  tirerChromatique,
  tirerIvs,
  tirerIvsSort,
  tirerNature,
  tirerPrisme,
  PALIERS_TALENT,
  talentsDuPerso,
  valeurDissolutionPerso,
  valeurDissolutionSort,
  PLANCHER_IV_FABRICATION,
  TOUTES_STATS,
  uid,
  validerEquipe,
  type Difficulte,
  type PersoPossede,
  type SortPossede,
  type StatKey,
  type TypeBanniere,
} from '@arene/engine';
import { base } from './db.js';
import {
  ajouterItem,
  ajouterPerso,
  ajouterSort,
  carteSortsDe,
  classement,
  compteParId,
  compteParPseudo,
  creerCompte,
  definirEquipe,
  equipeDe,
  historiqueDe,
  itemsDe,
  majPerso,
  majSort,
  majVu,
  nouveauPersoVide,
  persoDe,
  persosDe,
  profilComplet,
  publicCompte,
  rangDe,
  sortDe,
} from './depot.js';
import {
  hacher,
  middlewareAuth,
  signerToken,
  validerInscription,
  verifier,
  type RequeteAuth,
} from './auth.js';
import { boutiqueDuJour, prixFinal, trouverOffre } from './boutique.js';
import { CONFIG } from './config.js';
import {
  abandonner,
  appliquerTempsEcoule,
  chargerEquipeJoueur,
  combatEnCours,
  coteDe,
  creerSession,
  evenementsDepuis,
  jouerCoup,
  lireCombat,
  niveauMoyen,
  nomBot,
  vueClient,
} from './combats.js';
import { equipeBot, type ModeMatch } from '@arene/engine';
import {
  avancer,
  marquerIntroVue,
  reclamer,
  reclamerConnexion,
  vueObjectifs,
} from './objectifs.js';
import {
  abandonnerTour,
  choisirBonus,
  demarrerTour,
  vueTour,
} from './tours.js';
import {
  creerSalon,
  etatFile,
  etatSalon,
  quitterFile,
  rejoindreFile,
  rejoindreSalon,
} from './appariement.js';

export const routes = Router();

function erreur(res: Response, code: number, message: string): void {
  res.status(code).json({ erreur: message });
}

/** Enrobe un handler asynchrone pour que les rejets remontent proprement. */
function a(
  fn: (req: RequeteAuth, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req as RequeteAuth, res).catch(next);
  };
}

// ───────────────────────────── Authentification ─────────────────────────────

routes.post(
  '/auth/inscription',
  a(async (req, res) => {
    const { pseudo, motDePasse, starter } = req.body ?? {};
    const v = validerInscription(pseudo, motDePasse);
    if (!v.ok) return erreur(res, 400, v.message);
    if (await compteParPseudo(pseudo)) return erreur(res, 409, 'Ce pseudo est déjà pris.');
    const starterId =
      typeof starter === 'string' && STARTERS_PAR_ID[starter] ? starter : undefined;
    const compte = await creerCompte(pseudo, hacher(motDePasse), starterId);
    res.json({ token: signerToken(compte.id), compte: publicCompte(compte) });
  }),
);

routes.post(
  '/auth/connexion',
  a(async (req, res) => {
    const { pseudo, motDePasse } = req.body ?? {};
    if (typeof pseudo !== 'string' || typeof motDePasse !== 'string') {
      return erreur(res, 400, 'Pseudo et mot de passe requis.');
    }
    const compte = await compteParPseudo(pseudo);
    if (!compte || !verifier(motDePasse, compte.mot_de_passe)) {
      return erreur(res, 401, 'Pseudo ou mot de passe incorrect.');
    }
    await majVu(compte.id);
    res.json({ token: signerToken(compte.id), compte: publicCompte(compte) });
  }),
);

// ───────────────────────── Tout le reste demande un compte ─────────────────────────

routes.use(middlewareAuth);

routes.get(
  '/moi',
  a(async (req, res) => {
    const id = req.compte!.id;
    await majVu(id);
    const profil = await profilComplet(id);
    res.json({
      ...profil,
      compte: { ...profil.compte, division: divisionPourElo(profil.compte.elo).id },
    });
  }),
);

// ───────────────────────────── Équipe ─────────────────────────────

routes.put(
  '/equipe',
  a(async (req, res) => {
    const compteId = req.compte!.id;
    const membres = req.body?.membres;
    if (!Array.isArray(membres) || membres.length !== TAILLE_EQUIPE) {
      return erreur(res, 400, `Une équipe compte exactement ${TAILLE_EQUIPE} personnages.`);
    }
    const possedes = new Set((await persosDe(compteId)).map((p) => p.uid));
    if (!membres.every((m) => typeof m === 'string' && possedes.has(m))) {
      return erreur(res, 400, 'Un de ces personnages ne t’appartient pas.');
    }
    if (new Set(membres).size !== membres.length) {
      return erreur(res, 400, 'Impossible d’aligner deux fois le même personnage.');
    }
    const db = await base();
    await definirEquipe(db, compteId, membres);
    await avancer(db, compteId, { type: 'COMPOSER_EQUIPE' });
    res.json({ equipe: membres });
  }),
);

routes.get(
  '/equipe/validation',
  a(async (req, res) => {
    const compteId = req.compte!.id;
    const membres = await equipeDe(compteId);
    const tous = new Map((await persosDe(compteId)).map((p) => [p.uid, p]));
    const persos = membres.map((m) => tous.get(m)).filter((p): p is PersoPossede => !!p);
    res.json({ problemes: validerEquipe(persos, await carteSortsDe(compteId)) });
  }),
);

// ───────────────────────────── Personnages ─────────────────────────────

routes.put(
  '/persos/:uid',
  a(async (req, res) => {
    const compteId = req.compte!.id;
    const perso = await persoDe(compteId, req.params.uid);
    if (!perso) return erreur(res, 404, 'Personnage introuvable.');
    const espece = ESPECES_PAR_ID[perso.especeId];
    const { sorts, itemId, surnom } = req.body ?? {};

    if (sorts !== undefined) {
      if (!Array.isArray(sorts) || sorts.length !== 4) {
        return erreur(res, 400, 'Il faut exactement 4 emplacements de sorts.');
      }
      const mesSorts = await carteSortsDe(compteId);
      // Un exemplaire de sort n'appartient qu'à un personnage à la fois.
      const ailleurs = new Set(
        (await persosDe(compteId))
          .filter((p) => p.uid !== perso.uid)
          .flatMap((p) => p.sorts.filter((x): x is string => !!x)),
      );
      const vus = new Set<string>();
      for (const s of sorts) {
        if (s === null) continue;
        if (typeof s !== 'string' || !mesSorts.has(s)) {
          return erreur(res, 400, 'Sort inconnu ou non possédé.');
        }
        if (ailleurs.has(s)) {
          return erreur(res, 400, 'Cet exemplaire est déjà équipé sur un autre personnage.');
        }
        const def = mesSorts.get(s)!.defId;
        if (!espece.pool.includes(def)) {
          return erreur(
            res,
            400,
            `${espece.nom} ne peut pas apprendre ${SORTS_PAR_ID[def]?.nom ?? def}.`,
          );
        }
        if (vus.has(def)) return erreur(res, 400, 'Deux fois le même sort sur un personnage.');
        vus.add(def);
      }
      perso.sorts = sorts as (string | null)[];
    }

    if (itemId !== undefined) {
      if (itemId !== null) {
        if (typeof itemId !== 'string' || !ITEMS_PAR_ID[itemId]) {
          return erreur(res, 400, 'Objet inconnu.');
        }
        const stock = await itemsDe(compteId);
        if (!stock[itemId]) return erreur(res, 400, 'Tu ne possèdes pas cet objet.');
        const porteurs = (await persosDe(compteId)).filter(
          (p) => p.itemId === itemId && p.uid !== perso.uid,
        );
        if (porteurs.length >= stock[itemId]) {
          return erreur(res, 400, 'Tous tes exemplaires de cet objet sont déjà équipés.');
        }
      }
      perso.itemId = itemId;
    }

    if (surnom !== undefined) {
      if (surnom !== null && (typeof surnom !== 'string' || surnom.length > 16)) {
        return erreur(res, 400, 'Surnom invalide (16 caractères maximum).');
      }
      perso.surnom = surnom ?? undefined;
    }

    const db = await base();
    await majPerso(db, compteId, perso);
    if (sorts !== undefined && perso.sorts.some((x) => !!x)) {
      await avancer(db, compteId, { type: 'EQUIPER_SORT' });
    }
    res.json({ perso });
  }),
);

routes.post(
  '/persos/:uid/genes',
  a(async (req, res) => {
    const compte = req.compte!;
    const perso = await persoDe(compte.id, req.params.uid);
    if (!perso) return erreur(res, 404, 'Personnage introuvable.');
    if (compte.credits < COUT_REROLL_GENES) return erreur(res, 402, 'Pas assez de crédits.');
    perso.ivs = tirerIvs(new Rng(seedAleatoire()));
    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('UPDATE comptes SET credits = credits - ? WHERE id = ?', [
        COUT_REROLL_GENES,
        compte.id,
      ]);
      await majPerso(tx, compte.id, perso);
    });
    res.json(await profilComplet(compte.id));
  }),
);

routes.post(
  '/persos/:uid/hyper',
  a(async (req, res) => {
    const compte = req.compte!;
    const stat = req.body?.stat as StatKey;
    if (!TOUTES_STATS.includes(stat)) return erreur(res, 400, 'Statistique inconnue.');
    const perso = await persoDe(compte.id, req.params.uid);
    if (!perso) return erreur(res, 404, 'Personnage introuvable.');
    if (perso.ivs[stat] >= IV_MAX) return erreur(res, 400, 'Ce gène est déjà parfait.');
    if (compte.essence < COUT_GENE_ESSENCE) {
      return erreur(res, 402, `Il faut ${COUT_GENE_ESSENCE} essence — dissous des doublons.`);
    }
    perso.ivs[stat] = IV_MAX;
    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('UPDATE comptes SET essence = essence - ? WHERE id = ?', [
        COUT_GENE_ESSENCE,
        compte.id,
      ]);
      await majPerso(tx, compte.id, perso);
    });
    res.json(await profilComplet(compte.id));
  }),
);

// ───────────────────────────── Talents ─────────────────────────────

routes.post(
  '/persos/:uid/talent',
  a(async (req, res) => {
    const compte = req.compte!;
    const palier = Number(req.body?.palier);
    const talentId = String(req.body?.talentId ?? '');
    if (!PALIERS_TALENT.includes(palier as (typeof PALIERS_TALENT)[number])) {
      return erreur(res, 400, 'Palier inconnu.');
    }
    const perso = await persoDe(compte.id, req.params.uid);
    if (!perso) return erreur(res, 404, 'Personnage introuvable.');

    const etat = talentsDuPerso(perso).find((t) => t.palier === palier)!;
    if (!etat.debloque) return erreur(res, 400, `Palier ${palier} pas encore atteint.`);
    if (!etat.choix.some((t) => t.id === talentId)) {
      return erreur(res, 400, 'Ce talent n’est pas proposé à ce personnage.');
    }
    if (etat.choisi?.id === talentId) return erreur(res, 400, 'Ce talent est déjà actif.');

    // Le premier choix est offert ; se raviser coûte de l'essence.
    const cout = etat.choisi ? COUT_RESPEC_TALENT : 0;
    if (compte.essence < cout) {
      return erreur(res, 402, `Changer d’avis coûte ${COUT_RESPEC_TALENT} essence.`);
    }

    const autres = (perso.talents ?? []).filter(
      (id) => !etat.choix.some((t) => t.id === id),
    );
    perso.talents = [...autres, talentId];

    const db = await base();
    await db.tx(async (tx) => {
      if (cout > 0) {
        await tx.run('UPDATE comptes SET essence = essence - ? WHERE id = ?', [cout, compte.id]);
      }
      await majPerso(tx, compte.id, perso);
    });
    res.json({ cout, ...(await profilComplet(compte.id)) });
  }),
);

// ───────────────────────────── Essence ─────────────────────────────

routes.post(
  '/persos/:uid/dissoudre',
  a(async (req, res) => {
    const compte = req.compte!;
    const perso = await persoDe(compte.id, req.params.uid);
    if (!perso) return erreur(res, 404, 'Personnage introuvable.');

    const equipe = await equipeDe(compte.id);
    if (equipe.includes(perso.uid)) {
      return erreur(res, 400, 'Retire-le d’abord de ton équipe.');
    }
    const tous = await persosDe(compte.id);
    if (tous.length <= 3) {
      return erreur(res, 400, 'Il te faut au moins trois personnages pour aligner une équipe.');
    }

    const gain = valeurDissolutionPerso(perso);
    const db = await base();
    await db.tx(async (tx) => {
      // Les sorts équipés sur ce personnage redeviennent libres.
      await tx.run('DELETE FROM persos WHERE uid = ? AND compte = ?', [perso.uid, compte.id]);
      await tx.run('UPDATE comptes SET essence = essence + ? WHERE id = ?', [gain, compte.id]);
    });
    res.json({ gain, ...(await profilComplet(compte.id)) });
  }),
);

routes.post(
  '/sorts/:uid/dissoudre',
  a(async (req, res) => {
    const compte = req.compte!;
    const sort = await sortDe(compte.id, req.params.uid);
    if (!sort) return erreur(res, 404, 'Sort introuvable.');

    const porteur = (await persosDe(compte.id)).find((p) => p.sorts.includes(sort.uid));
    if (porteur) return erreur(res, 400, 'Ce sort est équipé sur un personnage.');

    const gain = valeurDissolutionSort(sort);
    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('DELETE FROM sorts_possedes WHERE uid = ? AND compte = ?', [
        sort.uid,
        compte.id,
      ]);
      await tx.run('UPDATE comptes SET essence = essence + ? WHERE id = ?', [gain, compte.id]);
    });
    res.json({ gain, ...(await profilComplet(compte.id)) });
  }),
);

routes.post(
  '/fabriquer',
  a(async (req, res) => {
    const compte = req.compte!;
    const defId = String(req.body?.defId ?? '');
    if (!SORTS_PAR_ID[defId]) return erreur(res, 400, 'Sort inconnu.');
    const cout = coutFabrication(defId);
    if (compte.essence < cout) {
      return erreur(res, 402, `Il faut ${cout} essence pour fabriquer ce sort.`);
    }
    const rng = new Rng(seedAleatoire());
    const nouveau: SortPossede = {
      uid: uid('s'),
      defId,
      ivs: tirerIvsSort(rng, PLANCHER_IV_FABRICATION),
      obtenuLe: Date.now(),
      prisme: tirerPrisme(rng),
    };
    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('UPDATE comptes SET essence = essence - ? WHERE id = ?', [cout, compte.id]);
      await ajouterSort(tx, compte.id, nouveau);
    });
    res.json({ sort: nouveau, ...(await profilComplet(compte.id)) });
  }),
);

routes.post(
  '/sorts/:uid/genes',
  a(async (req, res) => {
    const compte = req.compte!;
    const sort = await sortDe(compte.id, req.params.uid);
    if (!sort) return erreur(res, 404, 'Sort introuvable.');
    if (compte.credits < COUT_REROLL_GENES_SORT) return erreur(res, 402, 'Pas assez de crédits.');
    sort.ivs = tirerIvsSort(new Rng(seedAleatoire()));
    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('UPDATE comptes SET credits = credits - ? WHERE id = ?', [
        COUT_REROLL_GENES_SORT,
        compte.id,
      ]);
      await majSort(tx, compte.id, sort);
    });
    res.json(await profilComplet(compte.id));
  }),
);

// ───────────────────────────── Invocation ─────────────────────────────

routes.post(
  '/invocation',
  a(async (req, res) => {
    const compte = req.compte!;
    const type = req.body?.banniere as TypeBanniere;
    const banniere = BANNIERES[type];
    if (!banniere) return erreur(res, 400, 'Bannière inconnue.');

    const lot = req.body?.lot === true;
    const nombreBoosters = lot ? banniere.boostersParLot : 1;
    const cout = lot ? banniere.coutLot : banniere.coutBooster;
    const credits = cout.credits ?? 0;
    const eclats = cout.eclats ?? 0;
    if (compte.credits < credits) return erreur(res, 402, 'Pas assez de crédits.');
    if (compte.eclats < eclats) return erreur(res, 402, 'Pas assez d’éclats.');

    const pitieActuelle = type === 'STANDARD' ? compte.pitie_standard : compte.pitie_legendaire;
    const { boosters, nouveauCompteurPitie } = invoquer(
      banniere,
      new Rng(seedAleatoire()),
      pitieActuelle,
      nombreBoosters,
    );

    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('UPDATE comptes SET credits = credits - ?, eclats = eclats - ? WHERE id = ?', [
        credits,
        eclats,
        compte.id,
      ]);
      await tx.run(
        type === 'STANDARD'
          ? 'UPDATE comptes SET pitie_standard = ? WHERE id = ?'
          : 'UPDATE comptes SET pitie_legendaire = ? WHERE id = ?',
        [nouveauCompteurPitie, compte.id],
      );
      for (const booster of boosters) {
        for (const t of booster.cartes) {
          if (t.kind === 'PERSO') {
            const p = nouveauPersoVide(t.especeId, t.natureId);
            p.ivs = t.ivs;
            p.chromatique = t.chromatique;
            await ajouterPerso(tx, compte.id, p);
          } else if (t.kind === 'SORT') {
            const sp: SortPossede = {
              uid: uid('s'),
              defId: t.defId,
              ivs: t.ivs,
              obtenuLe: Date.now(),
              prisme: t.prisme,
            };
            await ajouterSort(tx, compte.id, sp);
          } else {
            await ajouterItem(tx, compte.id, t.itemId, 1);
          }
        }
      }
    });

    await avancer(db, compte.id, { type: 'BOOSTER', nombre: boosters.length });
    res.json({ boosters, ...(await profilComplet(compte.id)) });
  }),
);

// ───────────────────────────── Boutique ─────────────────────────────

routes.get('/boutique', (_req, res) => {
  res.json(boutiqueDuJour());
});

routes.post(
  '/boutique/achat',
  a(async (req, res) => {
    const compte = req.compte!;
    const { kind, id } = req.body ?? {};
    if (!['PERSO', 'SORT', 'ITEM'].includes(kind) || typeof id !== 'string') {
      return erreur(res, 400, 'Achat invalide.');
    }
    const offre = trouverOffre(kind, id);
    if (!offre) return erreur(res, 404, 'Cet article n’est pas en vente aujourd’hui.');
    const prix = prixFinal(offre);
    if (compte.credits < prix) return erreur(res, 402, 'Pas assez de crédits.');

    const rng = new Rng(seedAleatoire());
    let obtenu: unknown = null;
    const db = await base();
    await db.tx(async (tx) => {
      await tx.run('UPDATE comptes SET credits = credits - ? WHERE id = ?', [prix, compte.id]);
      if (kind === 'PERSO') {
        const p = nouveauPersoVide(id, tirerNature(rng));
        p.ivs = tirerIvs(rng);
        p.chromatique = tirerChromatique(rng);
        await ajouterPerso(tx, compte.id, p);
        obtenu = { kind, perso: p };
      } else if (kind === 'SORT') {
        const s: SortPossede = {
          uid: uid('s'),
          defId: id,
          ivs: tirerIvsSort(rng),
          obtenuLe: Date.now(),
          prisme: tirerPrisme(rng),
        };
        await ajouterSort(tx, compte.id, s);
        obtenu = { kind, sort: s };
      } else {
        await ajouterItem(tx, compte.id, id, 1);
        obtenu = { kind, itemId: id };
      }
    });
    res.json({ obtenu, prix, ...(await profilComplet(compte.id)) });
  }),
);

// ───────────────────────────── Classement ─────────────────────────────

routes.get(
  '/classement',
  a(async (req, res) => {
    res.json({
      saison: {
        numero: numeroSaison(CONFIG.debutSaison, Date.now()),
        debut: CONFIG.debutSaison,
      },
      divisions: DIVISIONS,
      lignes: await classement(100),
      monRang: await rangDe(req.compte!.id),
    });
  }),
);

routes.get(
  '/historique',
  a(async (req, res) => {
    res.json({ matchs: await historiqueDe(req.compte!.id, 25) });
  }),
);

// ───────────────────────────── Combats ─────────────────────────────

routes.post(
  '/combat/solo',
  a(async (req, res) => {
    const compte = req.compte!;
    const brut = req.body?.difficulte;
    const difficulte: Difficulte =
      brut === 'FACILE' || brut === 'DIFFICILE' ? brut : 'NORMAL';
    const eq = await chargerEquipeJoueur(compte.id);
    if ('erreur' in eq) return erreur(res, 400, eq.erreur);

    const rng = new Rng(seedAleatoire());
    const niveau = niveauMoyen(eq.persos);
    const ecart = difficulte === 'DIFFICILE' ? 3 : difficulte === 'FACILE' ? -3 : 0;
    const g = equipeBot(difficulte, Math.max(3, Math.min(50, niveau + ecart)), rng);
    const mode: ModeMatch =
      difficulte === 'FACILE'
        ? 'SOLO_FACILE'
        : difficulte === 'DIFFICILE'
          ? 'SOLO_DIFFICILE'
          : 'SOLO_NORMAL';

    const combat = await creerSession(
      mode,
      false,
      {
        joueur: { compteId: compte.id, pseudo: compte.pseudo, elo: compte.elo, persos: eq.persos },
        equipe: eq,
      },
      {
        joueur: {
          compteId: null,
          pseudo: nomBot(difficulte),
          elo: compte.elo,
          difficulteBot: difficulte,
          persos: g.persos,
        },
        equipe: { persos: g.persos, sorts: g.sorts },
      },
    );
    const evts = await evenementsDepuis(combat.id, 0);
    res.json(vueClient(combat, 0, evts, 0));
  }),
);

routes.get(
  '/combat/encours',
  a(async (req, res) => {
    const c = await combatEnCours(req.compte!.id);
    res.json({ combatId: c?.id ?? null });
  }),
);

routes.get(
  '/combat/:id',
  a(async (req, res) => {
    const depuis = Math.max(0, Number(req.query.depuis ?? 0) || 0);
    await appliquerTempsEcoule(req.params.id);
    const c = await lireCombat(req.params.id);
    if (!c) return erreur(res, 404, 'Combat introuvable.');
    const cote = coteDe(c, req.compte!.id);
    if (cote === null) return erreur(res, 403, 'Ce combat ne te concerne pas.');
    const evts = await evenementsDepuis(c.id, depuis);
    res.json(vueClient(c, cote, evts, depuis));
  }),
);

routes.post(
  '/combat/:id/action',
  a(async (req, res) => {
    const depuis = Math.max(0, Number(req.body?.depuis ?? 0) || 0);
    const r = await jouerCoup(req.params.id, req.compte!.id, req.body?.action);
    if (!r.ok || !r.combat) return erreur(res, 400, r.message ?? 'Action impossible.');
    const cote = coteDe(r.combat, req.compte!.id)!;
    const evts = await evenementsDepuis(r.combat.id, depuis);
    res.json(vueClient(r.combat, cote, evts, depuis));
  }),
);

routes.post(
  '/combat/:id/abandon',
  a(async (req, res) => {
    const depuis = Math.max(0, Number(req.body?.depuis ?? 0) || 0);
    const r = await abandonner(req.params.id, req.compte!.id);
    if (!r.ok || !r.combat) return erreur(res, 400, r.message ?? 'Abandon impossible.');
    const cote = coteDe(r.combat, req.compte!.id)!;
    res.json(vueClient(r.combat, cote, await evenementsDepuis(r.combat.id, depuis), depuis));
  }),
);

// ───────────────────────── Objectifs & onboarding ─────────────────────────

routes.get(
  '/objectifs',
  a(async (req, res) => {
    res.json(await vueObjectifs(req.compte!.id));
  }),
);

routes.post(
  '/objectifs/:id/reclamer',
  a(async (req, res) => {
    const r = await reclamer(req.compte!.id, req.params.id);
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json({ ...r, ...(await profilComplet(req.compte!.id)) });
  }),
);

routes.post(
  '/connexion/reclamer',
  a(async (req, res) => {
    const r = await reclamerConnexion(req.compte!.id);
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json({ ...r, ...(await profilComplet(req.compte!.id)) });
  }),
);

routes.post(
  '/intro/:ecran',
  a(async (req, res) => {
    res.json({ vuIntro: await marquerIntroVue(req.compte!.id, req.params.ecran) });
  }),
);

// ───────────────────────── Tour des Rattrapages ─────────────────────────

routes.get(
  '/tour',
  a(async (req, res) => {
    res.json(await vueTour(req.compte!.id));
  }),
);

routes.post(
  '/tour/demarrer',
  a(async (req, res) => {
    const r = await demarrerTour(req.compte!.id);
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json(await vueTour(req.compte!.id));
  }),
);

routes.post(
  '/tour/bonus',
  a(async (req, res) => {
    const id = String(req.body?.id ?? '');
    const r = await choisirBonus(req.compte!.id, id);
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json(await vueTour(req.compte!.id));
  }),
);

routes.post(
  '/tour/abandonner',
  a(async (req, res) => {
    await abandonnerTour(req.compte!.id);
    res.json(await vueTour(req.compte!.id));
  }),
);

// ───────────────────────── File classée & salons ─────────────────────────

routes.post(
  '/file/rejoindre',
  a(async (req, res) => {
    const r = await rejoindreFile(req.compte!.id);
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json(await etatFile(req.compte!.id));
  }),
);

routes.get(
  '/file/etat',
  a(async (req, res) => {
    res.json(await etatFile(req.compte!.id));
  }),
);

routes.post(
  '/file/quitter',
  a(async (req, res) => {
    await quitterFile(req.compte!.id);
    res.json({ enFile: false });
  }),
);

routes.post(
  '/salon/creer',
  a(async (req, res) => {
    const r = await creerSalon(req.compte!.id);
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json({ code: r.code });
  }),
);

routes.get(
  '/salon/:code',
  a(async (req, res) => {
    res.json(await etatSalon(req.compte!.id, req.params.code));
  }),
);

routes.post(
  '/salon/rejoindre',
  a(async (req, res) => {
    const r = await rejoindreSalon(req.compte!.id, String(req.body?.code ?? ''));
    if (r.erreur) return erreur(res, 400, r.erreur);
    res.json({ combatId: r.combatId });
  }),
);
