import {
  calculerElo,
  calculerRecompenses,
  choisirAction,
  choisirRemplacant,
  construireEquipe,
  creerCombat,
  equipeBot,
  jouerAction,
  niveauDepuisXp,
  repartirXp,
  Rng,
  seedAleatoire,
  uid,
  unitesSurvivantes,
  vuePour,
  type BattleAction,
  type Cote,
  type Difficulte,
  type EtatCombat,
  type EvtCombat,
  type ModeMatch,
  type PersoPossede,
  type EquipeCombat,
  type SortPossede,
} from '@arene/engine';
import { base, nombre } from './db.js';
import {
  carteSortsDe,
  compteParId,
  compteParIdAvec,
  enregistrerMatch,
  equipeDe,
  majPerso,
  persosDe,
} from './depot.js';
import type { Pilote } from './pilote.js';

export const DUREE_TOUR_MS = 75_000;
export const ATTENTE_AVANT_FANTOME_MS = 18_000;

export interface JoueurCombat {
  compteId: string | null;
  pseudo: string;
  elo: number;
  difficulteBot?: Difficulte;
  persos: PersoPossede[];
}

export interface RecompensesJoueur {
  credits: number;
  eclats: number;
  xp: number;
  deltaElo: number;
  nouveauElo: number;
  monteesNiveau: { uid: string; nom: string; niveau: number }[];
  victoire: boolean;
}

interface LigneCombat {
  id: string;
  mode: ModeMatch;
  classe: number;
  etat: string;
  joueurs: string;
  termine: number;
  nb_evenements: number;
  resultats: string | null;
  cree_le: number;
  maj_le: number;
}

export interface CombatCharge {
  id: string;
  mode: ModeMatch;
  classe: boolean;
  etat: EtatCombat;
  joueurs: [JoueurCombat, JoueurCombat];
  termine: boolean;
  nbEvenements: number;
  resultats: (RecompensesJoueur | null)[] | null;
  majLe: number;
}

function parser(l: LigneCombat): CombatCharge {
  return {
    id: l.id,
    mode: l.mode,
    classe: nombre(l.classe) === 1,
    etat: JSON.parse(l.etat) as EtatCombat,
    joueurs: JSON.parse(l.joueurs) as [JoueurCombat, JoueurCombat],
    termine: nombre(l.termine) === 1,
    nbEvenements: nombre(l.nb_evenements),
    resultats: l.resultats ? JSON.parse(l.resultats) : null,
    majLe: nombre(l.maj_le),
  };
}

export function auTour(etat: EtatCombat): Cote | null {
  if (etat.phase === 'TERMINE') return null;
  return etat.remplacement ?? etat.file[0] ?? null;
}

function estBot(c: CombatCharge, cote: Cote): boolean {
  return c.joueurs[cote].compteId === null;
}

export function coteDe(c: CombatCharge, compteId: string): Cote | null {
  if (c.joueurs[0].compteId === compteId) return 0;
  if (c.joueurs[1].compteId === compteId) return 1;
  return null;
}

// ───────────────────────── Chargement des équipes ─────────────────────────

export interface EquipeChargee {
  persos: PersoPossede[];
  sorts: Map<string, SortPossede>;
}

export async function chargerEquipeJoueur(
  compteId: string,
): Promise<EquipeChargee | { erreur: string }> {
  const membres = await equipeDe(compteId);
  const tous = new Map((await persosDe(compteId)).map((p) => [p.uid, p]));
  const persos = membres.map((m) => tous.get(m)).filter((p): p is PersoPossede => !!p);
  if (persos.length === 0) return { erreur: 'Compose d’abord ton équipe dans l’Atelier.' };
  const sorts = await carteSortsDe(compteId);
  if (persos.some((p) => p.sorts.filter((s) => s && sorts.has(s)).length === 0)) {
    return { erreur: 'Un de tes personnages n’a aucun sort équipé.' };
  }
  return { persos, sorts };
}

// ───────────────────────────── Persistance ─────────────────────────────

async function ecrireEvenements(
  db: Pilote,
  combatId: string,
  depuisIdx: number,
  evts: EvtCombat[],
): Promise<void> {
  let i = depuisIdx;
  for (const e of evts) {
    await db.run(
      'INSERT INTO combat_evenements (combat_id, idx, charge) VALUES (?, ?, ?) ON CONFLICT (combat_id, idx) DO NOTHING',
      [combatId, i, JSON.stringify(e)],
    );
    i++;
  }
}

export async function evenementsDepuis(
  combatId: string,
  depuis: number,
): Promise<EvtCombat[]> {
  const db = await base();
  const lignes = await db.all<{ idx: number; charge: string }>(
    'SELECT idx, charge FROM combat_evenements WHERE combat_id = ? AND idx >= ? ORDER BY idx',
    [combatId, depuis],
  );
  return lignes.map((l) => JSON.parse(l.charge) as EvtCombat);
}

export async function lireCombat(id: string): Promise<CombatCharge | null> {
  const db = await base();
  const l = await db.get<LigneCombat>('SELECT * FROM combats WHERE id = ?', [id]);
  return l ? parser(l) : null;
}

async function sauverCombat(db: Pilote, c: CombatCharge): Promise<void> {
  await db.run(
    `UPDATE combats SET etat = ?, termine = ?, nb_evenements = ?, resultats = ?, maj_le = ? WHERE id = ?`,
    [
      JSON.stringify(c.etat),
      c.termine ? 1 : 0,
      c.nbEvenements,
      c.resultats ? JSON.stringify(c.resultats) : null,
      Date.now(),
      c.id,
    ],
  );
}

/** Combat en cours d'un joueur, pour reprendre après un rechargement de page. */
export async function combatEnCours(compteId: string): Promise<CombatCharge | null> {
  const db = await base();
  const lignes = await db.all<LigneCombat>(
    `SELECT * FROM combats WHERE termine = 0 AND (joueurs LIKE ? OR joueurs LIKE ?)
     ORDER BY cree_le DESC LIMIT 5`,
    [`%"${compteId}"%`, `%${compteId}%`],
  );
  for (const l of lignes) {
    const c = parser(l);
    if (coteDe(c, compteId) !== null) return c;
  }
  return null;
}

// ───────────────────────────── Création ─────────────────────────────

export async function creerSession(
  mode: ModeMatch,
  classe: boolean,
  a: { joueur: JoueurCombat; equipe: EquipeChargee },
  b: { joueur: JoueurCombat; equipe: EquipeChargee },
  idForce?: string,
  /**
   * Retouche des unités juste après leur construction et avant le premier
   * tour. Sert à la Tour des Rattrapages pour appliquer les bénédictions et
   * reporter les points de vie de l'étage précédent.
   */
  apresConstruction?: (equipe: EquipeCombat) => void,
): Promise<CombatCharge> {
  const db = await base();
  const seed = seedAleatoire();
  const id = idForce ?? uid('m');
  const eqA = construireEquipe(
    a.joueur.compteId ?? 'bot',
    a.joueur.pseudo,
    a.equipe.persos,
    a.equipe.sorts,
  );
  const eqB = construireEquipe(
    b.joueur.compteId ?? 'bot',
    b.joueur.pseudo,
    b.equipe.persos,
    b.equipe.sorts,
  );
  if (apresConstruction) apresConstruction(eqA);
  const etat = creerCombat(eqA, eqB, { id, seed });

  const charge: CombatCharge = {
    id,
    mode,
    classe,
    etat,
    joueurs: [a.joueur, b.joueur],
    termine: false,
    nbEvenements: 0,
    resultats: null,
    majLe: Date.now(),
  };

  const evts = [...etat.journal];
  evts.push(...faireJouerBots(charge));

  await db.tx(async (tx) => {
    await tx.run(
      `INSERT INTO combats (id, mode, classe, etat, joueurs, termine, nb_evenements, resultats, cree_le, maj_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mode,
        classe ? 1 : 0,
        JSON.stringify(charge.etat),
        JSON.stringify(charge.joueurs),
        0,
        0,
        null,
        Date.now(),
        Date.now(),
      ],
    );
    await ecrireEvenements(tx, id, 0, evts);
    charge.nbEvenements = evts.length;
    // La clôture d'abord : elle positionne `termine`, que la sauvegarde écrit.
    if (charge.etat.phase === 'TERMINE') await cloturer(tx, charge);
    await sauverCombat(tx, charge);
  });

  return charge;
}

/** Fait jouer tous les tours consécutifs contrôlés par l'IA. */
function faireJouerBots(c: CombatCharge): EvtCombat[] {
  const evts: EvtCombat[] = [];
  let garde = 0;
  while (!c.termine && garde++ < 80) {
    const cote = auTour(c.etat);
    if (cote === null || !estBot(c, cote)) break;
    const difficulte = c.joueurs[cote].difficulteBot ?? 'NORMAL';
    const graine = (seedAleatoire() ^ Math.imul(garde, 2654435761)) >>> 0;
    const action: BattleAction =
      c.etat.remplacement === cote
        ? { type: 'SWITCH', index: choisirRemplacant(c.etat, cote, difficulte, graine) }
        : choisirAction(c.etat, cote, difficulte, graine).action;
    evts.push(...jouerAction(c.etat, cote, action));
  }
  return evts;
}

// ───────────────────────────── Jouer un coup ─────────────────────────────

export interface ResultatCoup {
  ok: boolean;
  message?: string;
  combat?: CombatCharge;
  evenements?: EvtCombat[];
}

export async function jouerCoup(
  combatId: string,
  compteId: string,
  action: BattleAction,
): Promise<ResultatCoup> {
  const db = await base();
  return db.tx(async (tx) => {
    const l = await tx.get<LigneCombat>('SELECT * FROM combats WHERE id = ?', [combatId]);
    if (!l) return { ok: false, message: 'Combat introuvable.' };
    const c = parser(l);
    if (c.termine) return { ok: false, message: 'Ce combat est terminé.' };

    const cote = coteDe(c, compteId);
    if (cote === null) return { ok: false, message: 'Tu ne participes pas à ce combat.' };
    if (auTour(c.etat) !== cote) return { ok: false, message: 'Ce n’est pas ton tour.' };

    const evts = jouerAction(c.etat, cote, action);
    if (evts.length === 0) return { ok: false, message: 'Action impossible.' };
    evts.push(...faireJouerBots(c));

    const depuis = c.nbEvenements;
    await ecrireEvenements(tx, c.id, depuis, evts);
    c.nbEvenements = depuis + evts.length;
    if (c.etat.phase === 'TERMINE') await cloturer(tx, c);
    await sauverCombat(tx, c);
    return { ok: true, combat: c, evenements: evts };
  });
}

/**
 * Sans serveur persistant, aucun minuteur ne tourne : c'est la lecture de
 * l'état qui détecte un joueur absent et joue une action par défaut à sa place.
 */
export async function appliquerTempsEcoule(combatId: string): Promise<CombatCharge | null> {
  const db = await base();
  return db.tx(async (tx) => {
    const l = await tx.get<LigneCombat>('SELECT * FROM combats WHERE id = ?', [combatId]);
    if (!l) return null;
    const c = parser(l);
    if (c.termine) return c;
    const cote = auTour(c.etat);
    if (cote === null || estBot(c, cote)) return c;
    if (Date.now() - c.majLe < DUREE_TOUR_MS) return c;

    const action: BattleAction =
      c.etat.remplacement === cote
        ? { type: 'SWITCH', index: choisirRemplacant(c.etat, cote, 'NORMAL', seedAleatoire()) }
        : { type: 'ATTAQUE' };
    const evts: EvtCombat[] = [
      { t: 'MESSAGE', texte: 'Temps écoulé : action automatique.', ton: 'info' },
      ...jouerAction(c.etat, cote, action),
    ];
    evts.push(...faireJouerBots(c));

    const depuis = c.nbEvenements;
    await ecrireEvenements(tx, c.id, depuis, evts);
    c.nbEvenements = depuis + evts.length;
    if (c.etat.phase === 'TERMINE') await cloturer(tx, c);
    await sauverCombat(tx, c);
    return c;
  });
}

export async function abandonner(combatId: string, compteId: string): Promise<ResultatCoup> {
  return jouerCoup(combatId, compteId, { type: 'ABANDON' });
}

// ───────────────────────────── Fin de partie ─────────────────────────────

async function cloturer(db: Pilote, c: CombatCharge): Promise<void> {
  if (c.termine) return;
  c.termine = true;
  const vainqueur = c.etat.vainqueur;
  const resultats: (RecompensesJoueur | null)[] = [null, null];

  for (const cote of [0, 1] as Cote[]) {
    const j = c.joueurs[cote];
    if (!j.compteId) continue;
    const compte = await compteParIdAvec(db, j.compteId);
    if (!compte) continue;

    const victoire = vainqueur === cote;
    const recompenses = calculerRecompenses(c.mode, victoire, {
      roundsJoues: c.etat.round,
      unitesSurvivantes: unitesSurvivantes(c.etat, cote),
      serie: compte.serie,
    });

    const adverse = c.joueurs[cote === 0 ? 1 : 0];
    let delta = 0;
    let nouveauElo = compte.elo;
    if (c.classe && vainqueur !== null) {
      const r = calculerElo(compte.elo, adverse.elo, victoire, compte.parties);
      delta = r.delta;
      nouveauElo = r.nouveauElo;
    }

    const nouvelleSerie = victoire ? compte.serie + 1 : 0;
    await db.run(
      `UPDATE comptes SET credits = credits + ?, eclats = eclats + ?, elo = ?,
         parties = parties + 1, victoires = victoires + ?, defaites = defaites + ?,
         serie = ?, meilleure_serie = CASE WHEN ? > meilleure_serie THEN ? ELSE meilleure_serie END
       WHERE id = ?`,
      [
        recompenses.credits,
        recompenses.eclats,
        nouveauElo,
        victoire ? 1 : 0,
        victoire ? 0 : 1,
        nouvelleSerie,
        nouvelleSerie,
        nouvelleSerie,
        compte.id,
      ],
    );

    const montees: RecompensesJoueur['monteesNiveau'] = [];
    const xpParPerso = repartirXp(recompenses.xp, j.persos.length);
    for (const p of j.persos) {
      const avant = p.niveau;
      p.xp += xpParPerso;
      p.niveau = niveauDepuisXp(p.xp);
      await majPerso(db, compte.id, p);
      if (p.niveau > avant) {
        montees.push({ uid: p.uid, nom: p.surnom ?? p.especeId, niveau: p.niveau });
      }
    }

    // Progression des objectifs : premiers pas et contrats du jour.
    {
      const { avancer } = await import('./objectifs.js');
      await avancer(db, compte.id, {
        type: 'COMBAT',
        victoire,
        mode: c.mode,
        stats: c.etat.stats[cote],
        elements: c.etat.equipes[cote].unites.map((u) => u.element),
      });
    }

    resultats[cote] = {
      credits: recompenses.credits,
      eclats: recompenses.eclats,
      xp: recompenses.xp,
      deltaElo: delta,
      nouveauElo,
      monteesNiveau: montees,
      victoire,
    };
  }

  c.resultats = resultats;

  // Un combat de tour fait avancer (ou terminer) la tentative en cours.
  if (c.mode === 'TOUR') {
    const cote = (c.joueurs[0].compteId ? 0 : 1) as Cote;
    const compteId = c.joueurs[cote].compteId;
    if (compteId) {
      const { majApresCombat } = await import('./tours.js');
      await majApresCombat(db, compteId, c, cote);
    }
  }

  await enregistrerMatch(db, {
    id: c.id,
    mode: c.mode,
    compte_a: c.joueurs[0].compteId ?? 'bot',
    compte_b: c.joueurs[1].compteId,
    nom_a: c.joueurs[0].pseudo,
    nom_b: c.joueurs[1].pseudo,
    vainqueur: vainqueur === null ? null : (c.joueurs[vainqueur].compteId ?? 'bot'),
    delta_a: resultats[0]?.deltaElo ?? 0,
    delta_b: resultats[1]?.deltaElo ?? 0,
    rounds: c.etat.round,
    credits: resultats[0]?.credits ?? 0,
    xp: resultats[0]?.xp ?? 0,
    cree_le: Date.now(),
  });
  await db.run('DELETE FROM file_attente WHERE combat_id = ?', [c.id]);
}

// ───────────────────────────── Vue client ─────────────────────────────

export function vueClient(c: CombatCharge, cote: Cote, evenements: EvtCombat[], depuis: number) {
  const autre = (cote === 0 ? 1 : 0) as Cote;
  return {
    combatId: c.id,
    mode: c.mode,
    classe: c.classe,
    vue: vuePour(c.etat, cote),
    evenements,
    curseur: depuis + evenements.length,
    termine: c.termine,
    resultats: c.termine ? (c.resultats?.[cote] ?? null) : null,
    adversaire: {
      pseudo: c.joueurs[autre].pseudo,
      elo: c.joueurs[autre].elo,
      bot: c.joueurs[autre].compteId === null,
    },
    limiteTour: c.majLe + DUREE_TOUR_MS,
  };
}

// ───────────────────────────── Adversaires IA ─────────────────────────────

const NOMS_BOTS: Record<Difficulte, string[]> = {
  FACILE: ['Bizuth Confiant', 'Première Année', 'Stagiaire Perdu'],
  NORMAL: ['Doublant Aguerri', 'Chargé de TD', 'Ancien du BDE'],
  DIFFICILE: ['Le Jury', 'Directeur des Études', 'Le Rattrapage Final'],
};

export function nomBot(d: Difficulte): string {
  const liste = NOMS_BOTS[d];
  return liste[Math.floor(Math.random() * liste.length)];
}

export function niveauMoyen(persos: PersoPossede[]): number {
  if (persos.length === 0) return 10;
  return Math.max(3, Math.round(persos.reduce((s, p) => s + p.niveau, 0) / persos.length));
}

/** Adversaire « fantôme » : l'équipe réelle d'un autre joueur, pilotée par l'IA. */
export async function adversaireFantome(
  compteId: string,
  elo: number,
): Promise<{ joueur: JoueurCombat; equipe: EquipeChargee }> {
  const db = await base();
  const candidat = await db.get<{ id: string; pseudo: string; elo: number }>(
    `SELECT id, pseudo, elo FROM comptes
     WHERE id <> ? AND parties > 0 AND elo BETWEEN ? AND ?
     ORDER BY RANDOM() LIMIT 1`,
    [compteId, elo - 350, elo + 350],
  );

  if (candidat) {
    const eq = await chargerEquipeJoueur(candidat.id);
    if (!('erreur' in eq)) {
      return {
        joueur: {
          compteId: null,
          pseudo: `${candidat.pseudo} · équipe pilotée par l’IA`,
          elo: nombre(candidat.elo),
          difficulteBot: 'DIFFICILE',
          persos: eq.persos,
        },
        equipe: eq,
      };
    }
  }

  const rng = new Rng(seedAleatoire());
  const palier: Difficulte = elo >= 1400 ? 'DIFFICILE' : elo >= 1150 ? 'NORMAL' : 'FACILE';
  const niveau = Math.max(5, Math.min(50, Math.round(10 + (elo - 900) / 25)));
  const g = equipeBot(palier, niveau, rng);
  return {
    joueur: {
      compteId: null,
      pseudo: 'Champion du Campus',
      elo,
      difficulteBot: 'DIFFICILE',
      persos: g.persos,
    },
    equipe: { persos: g.persos, sorts: g.sorts },
  };
}
