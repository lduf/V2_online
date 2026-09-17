import { NIVEAU_MAX } from './stats.js';

/** XP cumulée nécessaire pour atteindre le niveau n. */
export function xpCumulPourNiveau(n: number): number {
  const lvl = Math.max(1, Math.min(NIVEAU_MAX, Math.floor(n)));
  return 12 * (lvl - 1) * (lvl - 1) + 38 * (lvl - 1);
}

export function niveauDepuisXp(xp: number): number {
  let n = 1;
  while (n < NIVEAU_MAX && xp >= xpCumulPourNiveau(n + 1)) n++;
  return n;
}

export interface ProgressionNiveau {
  niveau: number;
  xpDansNiveau: number;
  xpPourNiveauSuivant: number;
  ratio: number;
  max: boolean;
}

export function progression(xp: number): ProgressionNiveau {
  const niveau = niveauDepuisXp(xp);
  if (niveau >= NIVEAU_MAX) {
    return {
      niveau,
      xpDansNiveau: 0,
      xpPourNiveauSuivant: 0,
      ratio: 1,
      max: true,
    };
  }
  const socle = xpCumulPourNiveau(niveau);
  const plafond = xpCumulPourNiveau(niveau + 1);
  const dans = xp - socle;
  const besoin = plafond - socle;
  return {
    niveau,
    xpDansNiveau: dans,
    xpPourNiveauSuivant: besoin,
    ratio: besoin > 0 ? dans / besoin : 1,
    max: false,
  };
}

export type ModeMatch =
  | 'SOLO_FACILE'
  | 'SOLO_NORMAL'
  | 'SOLO_DIFFICILE'
  | 'CLASSE'
  | 'AMICAL'
  | 'TOUR';

export interface Recompenses {
  credits: number;
  xp: number;
  eclats: number;
}

const BASES: Record<ModeMatch, { credits: number; xp: number; eclats: number }> = {
  SOLO_FACILE: { credits: 110, xp: 320, eclats: 1 },
  SOLO_NORMAL: { credits: 185, xp: 520, eclats: 2 },
  SOLO_DIFFICILE: { credits: 300, xp: 820, eclats: 4 },
  CLASSE: { credits: 260, xp: 700, eclats: 3 },
  AMICAL: { credits: 90, xp: 260, eclats: 0 },
  // Un étage de tour paie peu : l'essentiel de la récompense tombe à la fin
  // de la tentative, pour que monter plus haut soit le seul objectif.
  TOUR: { credits: 45, xp: 210, eclats: 0 },
};

/**
 * Récompenses de fin de match. On récompense aussi la défaite (moitié moins)
 * pour ne jamais rendre une partie « inutile ».
 */
export function calculerRecompenses(
  mode: ModeMatch,
  victoire: boolean,
  opts: { roundsJoues?: number; unitesSurvivantes?: number; serie?: number } = {},
): Recompenses {
  const base = BASES[mode];
  const facteur = victoire ? 1 : 0.42;
  // Bonus de domination : finir avec toute l'équipe debout.
  const bonusDomination = victoire ? 1 + 0.12 * Math.max(0, (opts.unitesSurvivantes ?? 1) - 1) : 1;
  // Bonus de série de victoires, plafonné.
  const bonusSerie = victoire ? 1 + Math.min(0.5, 0.06 * (opts.serie ?? 0)) : 1;
  // Léger malus si le combat s'éternise (anti-stalling).
  const rounds = opts.roundsJoues ?? 10;
  const facteurRounds = rounds > 28 ? 0.8 : 1;

  const mult = facteur * bonusDomination * bonusSerie * facteurRounds;
  return {
    credits: Math.round(base.credits * mult),
    xp: Math.round(base.xp * mult),
    eclats: Math.max(victoire ? 1 : 0, Math.round(base.eclats * mult)),
  };
}

/** L'XP est distribuée à toute l'équipe, avec une part majorée pour les participants. */
export function repartirXp(xpTotal: number, nbUnites: number): number {
  if (nbUnites <= 0) return 0;
  return Math.round((xpTotal / nbUnites) * 1.4);
}
