import { natureMod, NATURES } from './data/natures.js';
import { ITEMS_PAR_ID } from './data/items.js';
import { getEspece } from './data/especes.js';
import { getSortDef } from './data/sorts.js';
import type {
  EvsPerso,
  GradeGenes,
  IvsPerso,
  IvsSort,
  PersoPossede,
  SortPossede,
  SortPret,
  StatKey,
  StatsCalculees,
} from './types.js';
import { TOUTES_STATS } from './types.js';
import type { Rng } from './rng.js';

export const IV_MAX = 31;
export const NIVEAU_MAX = 50;
export const EV_MAX_PAR_STAT = 252;
export const EV_TOTAL_MAX = 510;

/** Les PV calculés sont multipliés par ce facteur pour donner des combats de bonne longueur. */
export const ECHELLE_PV = 2.7;

export function ivsVides(): IvsPerso {
  return { pv: 0, atq: 0, def: 0, mag: 0, res: 0, vit: 0, chance: 0 };
}

export function evsVides(): EvsPerso {
  return { pv: 0, atq: 0, def: 0, mag: 0, res: 0, vit: 0, chance: 0 };
}

/** Tire des gènes (IV) aléatoires. `plancher` garantit un minimum par stat. */
export function tirerIvs(rng: Rng, plancher = 0): IvsPerso {
  const out = ivsVides();
  for (const s of TOUTES_STATS) out[s] = rng.int(plancher, IV_MAX);
  return out;
}

export function tirerIvsSort(rng: Rng, plancher = 0): IvsSort {
  return {
    puissance: rng.int(plancher, IV_MAX),
    precision: rng.int(plancher, IV_MAX),
    critique: rng.int(plancher, IV_MAX),
    cout: rng.int(plancher, IV_MAX),
  };
}

export function tirerNature(rng: Rng): string {
  return rng.pick(NATURES).id;
}

/** Pourcentage de perfection des gènes d'un personnage (0-100). */
export function perfectionIvs(ivs: IvsPerso): number {
  const total = TOUTES_STATS.reduce((s, k) => s + ivs[k], 0);
  return Math.round((total / (IV_MAX * TOUTES_STATS.length)) * 100);
}

export function perfectionIvsSort(ivs: IvsSort): number {
  const total = ivs.puissance + ivs.precision + ivs.critique + ivs.cout;
  return Math.round((total / (IV_MAX * 4)) * 100);
}

export function gradeDepuisPourcent(p: number): GradeGenes {
  if (p >= 90) return 'S';
  if (p >= 75) return 'A';
  if (p >= 55) return 'B';
  if (p >= 35) return 'C';
  return 'D';
}

/**
 * Formule de stats inspirée de Pokémon :
 *   PV   = ⌊(2·base + IV + ⌊EV/4⌋) · niv / 100⌋ + niv + 10
 *   Stat = ⌊(⌊(2·base + IV + ⌊EV/4⌋) · niv / 100⌋ + 5) · nature⌋
 */
export function calculerStats(perso: PersoPossede): StatsCalculees {
  const espece = getEspece(perso.especeId);
  const niv = Math.max(1, Math.min(NIVEAU_MAX, perso.niveau));
  const brut = (k: StatKey): number =>
    2 * espece.base[k] + (perso.ivs[k] ?? 0) + Math.floor((perso.evs[k] ?? 0) / 4);

  const stats: StatsCalculees = {
    pv: Math.round((Math.floor((brut('pv') * niv) / 100) + niv + 10) * ECHELLE_PV),
    atq: 0,
    def: 0,
    mag: 0,
    res: 0,
    vit: 0,
    chance: 0,
  };

  for (const k of ['atq', 'def', 'mag', 'res', 'vit', 'chance'] as const) {
    const socle = Math.floor((brut(k) * niv) / 100) + 5;
    stats[k] = Math.max(1, Math.floor(socle * natureMod(perso.natureId, k)));
  }

  // Objet tenu : bonus plats.
  const item = perso.itemId ? ITEMS_PAR_ID[perso.itemId] : undefined;
  if (item) {
    for (const [k, v] of Object.entries(item.bonus) as [StatKey, number][]) {
      stats[k] = Math.max(1, stats[k] + v);
    }
  }
  return stats;
}

/** Applique les gènes du sort à ses valeurs de base. */
export function preparerSort(possede: SortPossede): SortPret {
  const def = getSortDef(possede.defId);
  const iv = possede.ivs;
  const facteurPuissance = 0.85 + (0.3 * iv.puissance) / IV_MAX;
  const note = perfectionIvsSort(iv);
  return {
    uid: possede.uid,
    def,
    ivs: iv,
    puissance: Math.round(def.puissance * facteurPuissance),
    soin: Math.round(def.soin * facteurPuissance),
    cout: Math.max(0, def.cout - Math.round((4 * iv.cout) / IV_MAX)),
    precision: Math.min(100, def.precision + Math.round((10 * iv.precision) / IV_MAX)),
    critique: Math.round((12 * iv.critique) / IV_MAX),
    note,
    grade: gradeDepuisPourcent(note),
  };
}

/** Multiplicateur de palier façon Pokémon, borné à ±6. */
export function multiplicateurPalier(palier: number): number {
  const p = Math.max(-6, Math.min(6, palier));
  return p >= 0 ? (2 + p) / 2 : 2 / (2 - p);
}

export function paliersVides(): Record<Exclude<StatKey, 'pv'>, number> {
  return { atq: 0, def: 0, mag: 0, res: 0, vit: 0, chance: 0 };
}
