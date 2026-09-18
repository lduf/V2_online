import type { Element } from '../types.js';

export const ELEMENTS: readonly Element[] = [
  'FEU',
  'EAU',
  'FOUDRE',
  'NATURE',
  'OMBRE',
  'LUMIERE',
  'ARCANE',
];

export interface InfoElement {
  id: Element;
  nom: string;
  couleur: string;
  couleurClaire: string;
  emoji: string;
}

export const INFO_ELEMENTS: Record<Element, InfoElement> = {
  FEU: { id: 'FEU', nom: 'Feu', couleur: '#ff5a2e', couleurClaire: '#ffb08a', emoji: '🔥' },
  EAU: { id: 'EAU', nom: 'Eau', couleur: '#2e9bff', couleurClaire: '#9ad0ff', emoji: '💧' },
  FOUDRE: { id: 'FOUDRE', nom: 'Foudre', couleur: '#ffd02e', couleurClaire: '#ffe98f', emoji: '⚡' },
  NATURE: { id: 'NATURE', nom: 'Nature', couleur: '#43d17c', couleurClaire: '#a7f0c4', emoji: '🌿' },
  OMBRE: { id: 'OMBRE', nom: 'Ombre', couleur: '#8b5cf6', couleurClaire: '#c9b3ff', emoji: '🌑' },
  LUMIERE: {
    id: 'LUMIERE',
    nom: 'Lumière',
    couleur: '#ffe7a3',
    couleurClaire: '#fff6dc',
    emoji: '✨',
  },
  ARCANE: { id: 'ARCANE', nom: 'Arcane', couleur: '#ff4fa3', couleurClaire: '#ffb3d6', emoji: '🔮' },
};

/*
 * Il n'y a plus de table d'efficacité. Une teinte ne donne aucun bonus ni
 * malus contre une autre : elle ne sert qu'à choisir une couleur et une
 * animation. La contre-jeu passe entièrement par les cartes — voir
 * `armureDe` et `amortiDe` dans combat.ts.
 */
