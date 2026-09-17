export interface Division {
  id: string;
  nom: string;
  seuil: number;
  couleur: string;
  emoji: string;
}

export const DIVISIONS: Division[] = [
  { id: 'bois', nom: 'Bois', seuil: 0, couleur: '#8a6242', emoji: '🪵' },
  { id: 'bronze', nom: 'Bronze', seuil: 900, couleur: '#c07a3e', emoji: '🥉' },
  { id: 'argent', nom: 'Argent', seuil: 1100, couleur: '#b9c4cf', emoji: '🥈' },
  { id: 'or', nom: 'Or', seuil: 1300, couleur: '#ecc44a', emoji: '🥇' },
  { id: 'platine', nom: 'Platine', seuil: 1500, couleur: '#6fe0d0', emoji: '💠' },
  { id: 'diamant', nom: 'Diamant', seuil: 1700, couleur: '#7fb6ff', emoji: '💎' },
  { id: 'maitre', nom: 'Maître', seuil: 1900, couleur: '#c77dff', emoji: '🏆' },
  { id: 'legende', nom: 'Légende', seuil: 2150, couleur: '#ff7ab8', emoji: '👑' },
];

export const ELO_DEPART = 1000;

export function divisionPourElo(elo: number): Division {
  let d = DIVISIONS[0];
  for (const div of DIVISIONS) if (elo >= div.seuil) d = div;
  return d;
}

export function divisionSuivante(elo: number): Division | null {
  for (const div of DIVISIONS) if (elo < div.seuil) return div;
  return null;
}

/** Facteur K dégressif : les nouveaux comptes bougent vite, le haut du ladder est stable. */
export function facteurK(elo: number, parties: number): number {
  if (parties < 10) return 56;
  if (elo >= 1900) return 20;
  if (elo >= 1500) return 28;
  return 36;
}

export interface ResultatElo {
  nouveauElo: number;
  delta: number;
}

export function calculerElo(
  elo: number,
  eloAdverse: number,
  victoire: boolean,
  parties: number,
): ResultatElo {
  const attendu = 1 / (1 + Math.pow(10, (eloAdverse - elo) / 400));
  const k = facteurK(elo, parties);
  const delta = Math.round(k * ((victoire ? 1 : 0) - attendu));
  const borne = Math.max(-40, Math.min(48, delta));
  const nouveau = Math.max(0, elo + borne);
  return { nouveauElo: nouveau, delta: nouveau - elo };
}

/** Compression de fin de saison : on rapproche tout le monde du point de départ. */
export function resetSaison(elo: number): number {
  return Math.round(ELO_DEPART + (elo - ELO_DEPART) * 0.45);
}

export function numeroSaison(debutSaison: number, maintenant: number): number {
  const DUREE = 1000 * 60 * 60 * 24 * 28; // 4 semaines
  return Math.max(1, Math.floor((maintenant - debutSaison) / DUREE) + 1);
}
