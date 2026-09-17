import type { StatutId } from './types.js';

export interface InfoStatut {
  id: StatutId;
  nom: string;
  emoji: string;
  couleur: string;
  bon: boolean;
  texte: string;
}

export const INFO_STATUTS: Record<StatutId, InfoStatut> = {
  BRULURE: {
    id: 'BRULURE',
    nom: 'Brûlure',
    emoji: '🔥',
    couleur: '#ff6b35',
    bon: false,
    texte: '6 % des PV max par tour, -15 % de dégâts physiques infligés.',
  },
  POISON: {
    id: 'POISON',
    nom: 'Poison',
    emoji: '🧪',
    couleur: '#8bd450',
    bon: false,
    texte: 'Dégâts croissants à chaque tour.',
  },
  GEL: {
    id: 'GEL',
    nom: 'Gel',
    emoji: '❄️',
    couleur: '#7fd8ff',
    bon: false,
    texte: 'Vitesse divisée par deux, 30 % de risque de perdre son tour.',
  },
  ETOURDI: {
    id: 'ETOURDI',
    nom: 'Étourdi',
    emoji: '💫',
    couleur: '#ffd166',
    bon: false,
    texte: 'Passe son tour.',
  },
  REGEN: {
    id: 'REGEN',
    nom: 'Régénération',
    emoji: '🌱',
    couleur: '#5ce08a',
    bon: true,
    texte: 'Rend 8 % des PV max à la fin du tour.',
  },
  RAGE: {
    id: 'RAGE',
    nom: 'Rage',
    emoji: '😤',
    couleur: '#ff4d6d',
    bon: true,
    texte: '+25 % de dégâts infligés, +15 % de dégâts subis.',
  },
  MALEDICTION: {
    id: 'MALEDICTION',
    nom: 'Malédiction',
    emoji: '💀',
    couleur: '#a06bff',
    bon: false,
    texte: '5 % des PV max par tour et soins reçus divisés par deux.',
  },
  SAIGNEMENT: {
    id: 'SAIGNEMENT',
    nom: 'Saignement',
    emoji: '🩸',
    couleur: '#e63946',
    bon: false,
    texte: '7 % des PV max par tour.',
  },
  CONFUSION: {
    id: 'CONFUSION',
    nom: 'Confusion',
    emoji: '🌀',
    couleur: '#c77dff',
    bon: false,
    texte: '33 % de risque de se frapper soi-même.',
  },
  CONCENTRATION: {
    id: 'CONCENTRATION',
    nom: 'Concentration',
    emoji: '🎯',
    couleur: '#ffe066',
    bon: true,
    texte: '+30 % de puissance et +15 de précision sur le prochain sort offensif.',
  },
};

export function estMauvais(id: StatutId): boolean {
  return !INFO_STATUTS[id].bon;
}
