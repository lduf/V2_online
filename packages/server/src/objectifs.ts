import {
  cible,
  CONTRATS_PAR_ID,
  contratsDuJour,
  CYCLE_CONNEXION,
  objetParId,
  PREMIERS_PAS,
  PREMIERS_PAS_PAR_ID,
  Rng,
  type Element,
  type ModeMatch,
  type Objectif,
  type StatsCote,
} from '@arene/engine';
import { base, nombre } from './db.js';
import { compteParId } from './depot.js';
import type { Pilote } from './pilote.js';

const JOUR_MS = 24 * 60 * 60 * 1000;

export function jourActuel(maintenant = Date.now()): number {
  return Math.floor(maintenant / JOUR_MS);
}

/** Les premiers pas ne se réinitialisent jamais : ils vivent au jour 0. */
const JOUR_PERMANENT = 0;

export type EvenementJeu =
  | {
      type: 'COMBAT';
      victoire: boolean;
      mode: ModeMatch;
      stats: StatsCote;
      elements: Element[];
    }
  | { type: 'BOOSTER'; nombre: number }
  | { type: 'ETAGE_TOUR'; etage: number }
  | { type: 'EQUIPER_SORT' }
  | { type: 'COMPOSER_EQUIPE' };

interface LigneProgression {
  objectif_id: string;
  jour: number;
  valeur: number;
  reclame: number;
}

async function lireProgression(
  db: Pilote,
  compteId: string,
  jour: number,
): Promise<Map<string, LigneProgression>> {
  const lignes = await db.all<LigneProgression>(
    'SELECT objectif_id, jour, valeur, reclame FROM progression_objectifs WHERE compte = ? AND jour = ?',
    [compteId, jour],
  );
  return new Map(
    lignes.map((l) => [
      l.objectif_id,
      { ...l, valeur: nombre(l.valeur), reclame: nombre(l.reclame), jour: nombre(l.jour) },
    ]),
  );
}

async function ajouter(
  db: Pilote,
  compteId: string,
  objectifId: string,
  jour: number,
  delta: number,
  mode: 'incremente' | 'maximum',
): Promise<void> {
  if (delta <= 0) return;
  await db.run(
    `INSERT INTO progression_objectifs (compte, objectif_id, jour, valeur, reclame)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT (compte, objectif_id, jour) DO UPDATE SET valeur = ${
       mode === 'maximum'
         ? 'CASE WHEN EXCLUDED.valeur > progression_objectifs.valeur THEN EXCLUDED.valeur ELSE progression_objectifs.valeur END'
         : 'progression_objectifs.valeur + EXCLUDED.valeur'
     }`,
    [compteId, objectifId, jour, delta],
  );
}

/** Ce qu'un événement de jeu apporte à un objectif donné. */
function apport(o: Objectif, e: EvenementJeu): { delta: number; mode: 'incremente' | 'maximum' } {
  const c = o.condition;
  switch (c.type) {
    case 'VICTOIRES':
      if (e.type !== 'COMBAT' || !e.victoire) break;
      if (c.modes && !c.modes.includes(e.mode)) break;
      return { delta: 1, mode: 'incremente' };
    case 'VICTOIRE_ELEMENT':
      if (e.type !== 'COMBAT' || !e.victoire) break;
      if (!e.elements.includes(c.element)) break;
      return { delta: 1, mode: 'maximum' };
    case 'VICTOIRE_SANS_CHANGER':
      if (e.type !== 'COMBAT' || !e.victoire || e.stats.changements > 0) break;
      return { delta: 1, mode: 'maximum' };
    case 'DES_PARFAITS':
      if (e.type !== 'COMBAT') break;
      return { delta: e.stats.desParfaits, mode: 'incremente' };
    case 'CRITIQUES':
      if (e.type !== 'COMBAT') break;
      return { delta: e.stats.critiques, mode: 'incremente' };
    case 'SUPER_EFFICACES':
      if (e.type !== 'COMBAT') break;
      return { delta: e.stats.superEfficaces, mode: 'incremente' };
    case 'COUP_PUISSANT':
      if (e.type !== 'COMBAT' || e.stats.meilleurCoup < c.montant) break;
      return { delta: 1, mode: 'maximum' };
    case 'BOOSTERS':
      if (e.type !== 'BOOSTER') break;
      return { delta: e.nombre, mode: 'incremente' };
    case 'ETAGE_TOUR':
      if (e.type !== 'ETAGE_TOUR' || e.etage < c.etage) break;
      return { delta: 1, mode: 'maximum' };
    case 'EQUIPER_SORT':
      if (e.type !== 'EQUIPER_SORT') break;
      return { delta: 1, mode: 'maximum' };
    case 'COMPOSER_EQUIPE':
      if (e.type !== 'COMPOSER_EQUIPE') break;
      return { delta: 1, mode: 'maximum' };
    default:
      break;
  }
  return { delta: 0, mode: 'incremente' };
}

/** Fait progresser les premiers pas et les contrats du jour. */
export async function avancer(
  db: Pilote,
  compteId: string,
  evenement: EvenementJeu,
): Promise<void> {
  const jour = jourActuel();
  for (const o of PREMIERS_PAS) {
    const { delta, mode } = apport(o, evenement);
    await ajouter(db, compteId, o.id, JOUR_PERMANENT, delta, mode);
  }
  for (const id of contratsDuJour(new Rng(jour >>> 0))) {
    const o = CONTRATS_PAR_ID[id];
    if (!o) continue;
    const { delta, mode } = apport(o, evenement);
    await ajouter(db, compteId, o.id, jour, delta, mode);
  }
}

// ───────────────────────────── Vue client ─────────────────────────────

export interface ObjectifVue {
  id: string;
  nom: string;
  texte: string;
  emoji: string;
  valeur: number;
  cible: number;
  fait: boolean;
  reclame: boolean;
  recompense: { credits?: number; eclats?: number };
}

async function vueListe(
  db: Pilote,
  compteId: string,
  objectifs: Objectif[],
  jour: number,
): Promise<ObjectifVue[]> {
  const prog = await lireProgression(db, compteId, jour);
  return objectifs.map((o) => {
    const p = prog.get(o.id);
    const valeur = p?.valeur ?? 0;
    const c = cible(o.condition);
    return {
      id: o.id,
      nom: o.nom,
      texte: o.texte,
      emoji: o.emoji,
      valeur: Math.min(valeur, c),
      cible: c,
      fait: valeur >= c,
      reclame: (p?.reclame ?? 0) === 1,
      recompense: o.recompense,
    };
  });
}

export interface VueObjectifs {
  premiersPas: ObjectifVue[];
  contrats: ObjectifVue[];
  /** Nombre de récompenses en attente, pour la pastille de la navigation. */
  aReclamer: number;
  connexion: {
    palier: number;
    reclamableAujourdhui: boolean;
    cycle: typeof CYCLE_CONNEXION;
  };
  /** Écrans dont l'introduction a déjà été vue. */
  vuIntro: string[];
  /** Les premiers pas sont-ils tous terminés et récupérés ? */
  premiersPasFinis: boolean;
}

export async function vueObjectifs(compteId: string): Promise<VueObjectifs> {
  const db = await base();
  const jour = jourActuel();
  const compte = (await compteParId(compteId))!;
  const premiersPas = await vueListe(db, compteId, PREMIERS_PAS, JOUR_PERMANENT);
  const idsContrats = contratsDuJour(new Rng(jour >>> 0));
  const contrats = await vueListe(
    db,
    compteId,
    idsContrats.map((id) => CONTRATS_PAR_ID[id]).filter(Boolean),
    jour,
  );

  const vuIntroBrut = (compte as unknown as { vu_intro: string | null }).vu_intro;
  let vuIntro: string[] = [];
  try {
    vuIntro = vuIntroBrut ? (JSON.parse(vuIntroBrut) as string[]) : [];
  } catch {
    vuIntro = [];
  }

  return {
    premiersPas,
    contrats,
    aReclamer: [...premiersPas, ...contrats].filter((o) => o.fait && !o.reclame).length,
    connexion: {
      palier: compte.connexion_palier,
      reclamableAujourdhui: compte.connexion_jour !== jour,
      cycle: CYCLE_CONNEXION,
    },
    vuIntro,
    premiersPasFinis: premiersPas.every((o) => o.fait && o.reclame),
  };
}

// ───────────────────────────── Récupération ─────────────────────────────

export async function reclamer(
  compteId: string,
  objectifId: string,
): Promise<{ erreur?: string; credits?: number; eclats?: number }> {
  const o = objetParId(objectifId);
  if (!o) return { erreur: 'Objectif inconnu.' };
  const permanent = !!PREMIERS_PAS_PAR_ID[objectifId];
  const jour = permanent ? JOUR_PERMANENT : jourActuel();

  const db = await base();
  return db.tx(async (tx) => {
    const l = await tx.get<LigneProgression>(
      'SELECT objectif_id, jour, valeur, reclame FROM progression_objectifs WHERE compte = ? AND objectif_id = ? AND jour = ?',
      [compteId, objectifId, jour],
    );
    if (!l) return { erreur: 'Objectif non commencé.' };
    if (nombre(l.valeur) < cible(o.condition)) return { erreur: 'Objectif non terminé.' };
    if (nombre(l.reclame) === 1) return { erreur: 'Récompense déjà récupérée.' };

    await tx.run(
      'UPDATE progression_objectifs SET reclame = 1 WHERE compte = ? AND objectif_id = ? AND jour = ?',
      [compteId, objectifId, jour],
    );
    await tx.run('UPDATE comptes SET credits = credits + ?, eclats = eclats + ? WHERE id = ?', [
      o.recompense.credits ?? 0,
      o.recompense.eclats ?? 0,
      compteId,
    ]);
    return { credits: o.recompense.credits ?? 0, eclats: o.recompense.eclats ?? 0 };
  });
}

/**
 * Récompense de connexion. Le cycle avance d'un cran par jour joué ; il ne se
 * remet pas à zéro quand on saute un jour — punir une absence n'a jamais
 * ramené personne.
 */
export async function reclamerConnexion(
  compteId: string,
): Promise<{ erreur?: string; palier?: number; credits?: number; eclats?: number; booster?: boolean }> {
  const db = await base();
  return db.tx(async (tx) => {
    const compte = await tx.get<{ connexion_jour: number; connexion_palier: number }>(
      'SELECT connexion_jour, connexion_palier FROM comptes WHERE id = ?',
      [compteId],
    );
    if (!compte) return { erreur: 'Compte introuvable.' };
    const jour = jourActuel();
    if (nombre(compte.connexion_jour) === jour) {
      return { erreur: 'Récompense du jour déjà récupérée.' };
    }
    const palier = (nombre(compte.connexion_palier) % CYCLE_CONNEXION.length) + 1;
    const p = CYCLE_CONNEXION[palier - 1];
    await tx.run(
      'UPDATE comptes SET connexion_jour = ?, connexion_palier = ?, credits = credits + ?, eclats = eclats + ? WHERE id = ?',
      [jour, palier % CYCLE_CONNEXION.length, p.recompense.credits ?? 0, p.recompense.eclats ?? 0, compteId],
    );
    return {
      palier,
      credits: p.recompense.credits ?? 0,
      eclats: p.recompense.eclats ?? 0,
      booster: p.booster,
    };
  });
}

/** Mémorise qu'un écran a montré son introduction. */
export async function marquerIntroVue(compteId: string, ecran: string): Promise<string[]> {
  const db = await base();
  const compte = await compteParId(compteId);
  const brut = (compte as unknown as { vu_intro: string | null } | undefined)?.vu_intro;
  let liste: string[] = [];
  try {
    liste = brut ? (JSON.parse(brut) as string[]) : [];
  } catch {
    liste = [];
  }
  if (!liste.includes(ecran)) liste.push(ecran);
  await db.run('UPDATE comptes SET vu_intro = ? WHERE id = ?', [JSON.stringify(liste), compteId]);
  return liste;
}
