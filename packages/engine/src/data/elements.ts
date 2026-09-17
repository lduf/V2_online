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

const SUPER = 1.5;
const FAIBLE = 0.7;

/** TABLE[attaquant][defenseur] = multiplicateur. */
export const TABLE_ELEMENTS: Record<Element, Partial<Record<Element, number>>> = {
  FEU: { NATURE: SUPER, EAU: FAIBLE, FEU: FAIBLE },
  EAU: { FEU: SUPER, FOUDRE: FAIBLE, EAU: FAIBLE },
  FOUDRE: { EAU: SUPER, NATURE: FAIBLE, FOUDRE: FAIBLE },
  NATURE: { FOUDRE: SUPER, FEU: FAIBLE, NATURE: FAIBLE },
  OMBRE: { LUMIERE: SUPER, OMBRE: FAIBLE },
  LUMIERE: { OMBRE: SUPER, LUMIERE: FAIBLE },
  ARCANE: {},
};

export function multiplicateurElement(attaquant: Element, defenseur: Element): number {
  return TABLE_ELEMENTS[attaquant][defenseur] ?? 1;
}
