import {
  appliquerBonus,
  BONUS_PAR_ID,
  calculerStats,
  construireEquipe,
  creerRunTour,
  equipeEtage,
  ETAGES_TOUR,
  nomEtage,
  proposerBonus,
  recompensesTour,
  Rng,
  seedAleatoire,
  soinsEntreEtages,
  type EtatTour,
  type PersoPossede,
} from '@arene/engine';
import { base, nombre } from './db.js';
import { compteParId } from './depot.js';
import {
  chargerEquipeJoueur,
  creerSession,
  niveauMoyen,
  type CombatCharge,
  type EquipeChargee,
} from './combats.js';
import type { Pilote } from './pilote.js';

export const COUT_TENTATIVE_SUPPLEMENTAIRE = 900;

interface LigneTour {
  compte: string;
  etat: string;
  combat_id: string | null;
  niveau_equipe: number;
  jour_gratuit: number;
  cree_le: number;
  maj_le: number;
}

export interface RunTour {
  etat: EtatTour;
  combatId: string | null;
  niveauEquipe: number;
  jourGratuit: number;
}

const JOUR_MS = 24 * 60 * 60 * 1000;

export function jourActuel(maintenant = Date.now()): number {
  return Math.floor(maintenant / JOUR_MS);
}

function parser(l: LigneTour): RunTour {
  return {
    etat: JSON.parse(l.etat) as EtatTour,
    combatId: l.combat_id,
    niveauEquipe: nombre(l.niveau_equipe),
    jourGratuit: nombre(l.jour_gratuit),
  };
}

export async function lireRun(compteId: string): Promise<RunTour | null> {
  const db = await base();
  const l = await db.get<LigneTour>('SELECT * FROM tours WHERE compte = ?', [compteId]);
  return l ? parser(l) : null;
}

async function ecrireRun(db: Pilote, compteId: string, run: RunTour): Promise<void> {
  await db.run(
    `INSERT INTO tours (compte, etat, combat_id, niveau_equipe, jour_gratuit, cree_le, maj_le)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (compte) DO UPDATE SET
       etat = EXCLUDED.etat, combat_id = EXCLUDED.combat_id,
       niveau_equipe = EXCLUDED.niveau_equipe, jour_gratuit = EXCLUDED.jour_gratuit,
       maj_le = EXCLUDED.maj_le`,
    [
      compteId,
      JSON.stringify(run.etat),
      run.combatId,
      run.niveauEquipe,
      run.jourGratuit,
      Date.now(),
      Date.now(),
    ],
  );
}

export interface VueTour {
  enCours: boolean;
  etage: number;
  etages: number;
  nomEtage: string;
  bonus: string[];
  choix: string[] | null;
  combatId: string | null;
  termine: boolean;
  victoire: boolean;
  /** Points de vie reportés, pour l'affichage. */
  pv: Record<string, number>;
  tentativeGratuiteDispo: boolean;
  coutTentative: number;
}

export async function vueTour(compteId: string): Promise<VueTour> {
  const run = await lireRun(compteId);
  const gratuite = !run || run.jourGratuit !== jourActuel();
  if (!run || run.etat.termine) {
    return {
      enCours: false,
      etage: 0,
      etages: ETAGES_TOUR,
      nomEtage: '',
      bonus: run?.etat.bonus ?? [],
      choix: null,
      combatId: null,
      termine: true,
      victoire: run?.etat.victoire ?? false,
      pv: {},
      tentativeGratuiteDispo: gratuite,
      coutTentative: COUT_TENTATIVE_SUPPLEMENTAIRE,
    };
  }
  return {
    enCours: true,
    etage: run.etat.etage,
    etages: ETAGES_TOUR,
    nomEtage: nomEtage(run.etat.etage),
    bonus: run.etat.bonus,
    choix: run.etat.choix,
    combatId: run.combatId,
    termine: false,
    victoire: false,
    pv: run.etat.pv,
    tentativeGratuiteDispo: gratuite,
    coutTentative: COUT_TENTATIVE_SUPPLEMENTAIRE,
  };
}

/** Construit le combat d'un étage, avec les PV reportés et les bénédictions. */
async function lancerEtage(
  compteId: string,
  run: RunTour,
  equipe: EquipeChargee,
): Promise<CombatCharge | null> {
  // Garde-fou : on ne lance jamais un étage sans un combattant debout. Ça ne
  // devrait pas arriver (on n'avance qu'après une victoire), mais un état
  // corrompu bloquerait la tentative pour toujours.
  const uids = Object.keys(run.etat.pv);
  if (uids.length > 0 && uids.every((u) => run.etat.pv[u] <= 0)) return null;

  const compte = (await compteParId(compteId))!;
  const rng = new Rng((run.etat.seed ^ (run.etat.etage * 2654435761)) >>> 0);
  const adverse = equipeEtage(run.etat.etage, run.niveauEquipe, rng);

  const combat = await creerSession(
    'TOUR',
    false,
    {
      joueur: {
        compteId,
        pseudo: compte.pseudo,
        elo: compte.elo,
        persos: equipe.persos,
      },
      equipe,
    },
    {
      joueur: {
        compteId: null,
        pseudo: `${run.etat.etage}. ${nomEtage(run.etat.etage)}`,
        elo: compte.elo,
        difficulteBot: run.etat.etage >= 8 ? 'DIFFICILE' : run.etat.etage >= 4 ? 'NORMAL' : 'FACILE',
        persos: adverse.persos,
      },
      equipe: { persos: adverse.persos, sorts: adverse.sorts },
    },
    undefined,
    // Les bénédictions et les PV reportés s'appliquent juste après la
    // construction des unités, avant le premier tour.
    (eq) => {
      appliquerBonus(eq, run.etat.bonus, run.etat.pv);
    },
  );
  return combat;
}

export interface ResultatDemarrage {
  erreur?: string;
  combatId?: string;
}

export async function demarrerTour(compteId: string): Promise<ResultatDemarrage> {
  const existante = await lireRun(compteId);
  if (existante && !existante.etat.termine) {
    return { erreur: 'Une tentative est déjà en cours.' };
  }
  const equipe = await chargerEquipeJoueur(compteId);
  if ('erreur' in equipe) return { erreur: equipe.erreur };

  const compte = (await compteParId(compteId))!;
  const jour = jourActuel();
  const gratuite = !existante || existante.jourGratuit !== jour;
  if (!gratuite && compte.credits < COUT_TENTATIVE_SUPPLEMENTAIRE) {
    return {
      erreur: `Tentative gratuite déjà utilisée aujourd’hui. La suivante coûte ${COUT_TENTATIVE_SUPPLEMENTAIRE} crédits.`,
    };
  }

  const db = await base();
  if (!gratuite) {
    await db.run('UPDATE comptes SET credits = credits - ? WHERE id = ?', [
      COUT_TENTATIVE_SUPPLEMENTAIRE,
      compteId,
    ]);
  }

  const run: RunTour = {
    etat: creerRunTour(seedAleatoire()),
    combatId: null,
    niveauEquipe: niveauMoyen(equipe.persos),
    jourGratuit: gratuite ? jour : (existante?.jourGratuit ?? jour),
  };

  const combat = await lancerEtage(compteId, run, equipe);
  if (!combat) return { erreur: 'Ton équipe n’a plus personne debout.' };
  run.combatId = combat.id;
  await ecrireRun(db, compteId, run);
  return { combatId: combat.id };
}

/**
 * Appelée à la clôture d'un combat de tour. Reporte les PV, fait monter d'un
 * étage et propose trois bénédictions, ou termine la tentative.
 */
export async function majApresCombat(
  db: Pilote,
  compteId: string,
  combat: CombatCharge,
  coteJoueur: 0 | 1,
): Promise<void> {
  const l = await db.get<LigneTour>('SELECT * FROM tours WHERE compte = ?', [compteId]);
  if (!l) return;
  const run = parser(l);
  if (run.combatId !== combat.id || run.etat.termine) return;

  const equipe = combat.etat.equipes[coteJoueur];
  const pv: Record<string, number> = {};
  for (const u of equipe.unites) pv[u.uid] = u.ko ? 0 : u.pv;
  run.etat.pv = pv;
  run.combatId = null;

  const gagne = combat.etat.vainqueur === coteJoueur;
  if (!gagne) {
    run.etat.termine = true;
    run.etat.victoire = false;
    await verserRecompenses(db, compteId, run.etat.etage - 1, false);
  } else if (run.etat.etage >= ETAGES_TOUR) {
    run.etat.termine = true;
    run.etat.victoire = true;
    await verserRecompenses(db, compteId, ETAGES_TOUR, true);
  } else {
    const rng = new Rng((run.etat.seed ^ (run.etat.etage * 40503)) >>> 0);
    run.etat.choix = proposerBonus(rng, run.etat);
    run.etat.etage += 1;
  }
  await ecrireRun(db, compteId, run);
}

async function verserRecompenses(
  db: Pilote,
  compteId: string,
  etagesReussis: number,
  victoire: boolean,
): Promise<void> {
  const r = recompensesTour(etagesReussis, victoire);
  await db.run('UPDATE comptes SET credits = credits + ?, eclats = eclats + ? WHERE id = ?', [
    r.credits,
    r.eclats,
    compteId,
  ]);
}

export async function choisirBonus(
  compteId: string,
  bonusId: string,
): Promise<ResultatDemarrage> {
  const db = await base();
  const l = await db.get<LigneTour>('SELECT * FROM tours WHERE compte = ?', [compteId]);
  if (!l) return { erreur: 'Aucune tentative en cours.' };
  const run = parser(l);
  if (run.etat.termine) return { erreur: 'La tentative est terminée.' };
  if (!run.etat.choix?.includes(bonusId)) return { erreur: 'Cette bénédiction n’est pas proposée.' };
  if (run.combatId) return { erreur: 'Termine d’abord le combat en cours.' };

  const equipe = await chargerEquipeJoueur(compteId);
  if ('erreur' in equipe) return { erreur: equipe.erreur };

  // Les soins prennent effet avant l'étage suivant : il faut les PV max
  // effectifs, bénédictions de PV comprises.
  const pvMax = pvMaxEffectifs(equipe.persos, run.etat.bonus.concat(bonusId));
  run.etat.pv = soinsEntreEtages(run.etat.pv, pvMax, run.etat.bonus, [bonusId]);
  run.etat.bonus = [...run.etat.bonus, bonusId];
  run.etat.choix = null;

  const combat = await lancerEtage(compteId, run, equipe);
  if (!combat) {
    run.etat.termine = true;
    await verserRecompenses(db, compteId, Math.max(0, run.etat.etage - 1), false);
    await ecrireRun(db, compteId, run);
    return { erreur: 'Ton équipe n’a plus personne debout.' };
  }
  run.combatId = combat.id;
  await ecrireRun(db, compteId, run);
  return { combatId: combat.id };
}

/** PV max de chaque personnage une fois les bénédictions de PV appliquées. */
function pvMaxEffectifs(persos: PersoPossede[], bonusIds: string[]): Record<string, number> {
  const facteur =
    1 +
    bonusIds
      .flatMap((id) => BONUS_PAR_ID[id]?.effets ?? [])
      .filter((e) => e.type === 'PV_MAX')
      .reduce((s, e) => s + (e as { pourcent: number }).pourcent / 100, 0);
  const out: Record<string, number> = {};
  for (const p of persos) {
    // Recalcul léger : on passe par le moteur pour rester cohérent.
    out[p.uid] = Math.round(calculerStats(p).pv * facteur);
  }
  return out;
}

export async function abandonnerTour(compteId: string): Promise<void> {
  const db = await base();
  const l = await db.get<LigneTour>('SELECT * FROM tours WHERE compte = ?', [compteId]);
  if (!l) return;
  const run = parser(l);
  if (run.etat.termine) return;
  run.etat.termine = true;
  run.etat.victoire = false;
  run.combatId = null;
  await verserRecompenses(db, compteId, Math.max(0, run.etat.etage - 1), false);
  await ecrireRun(db, compteId, run);
}

export { ETAGES_TOUR, nomEtage, construireEquipe };
