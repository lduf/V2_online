import type { Role } from '../types.js';

export interface InfoRole {
  id: Role;
  nom: string;
  /** Ce que le rôle fait concrètement, en une ligne, pour l'infobulle. */
  texte: string;
  emoji: string;
  couleur: string;
  couleurClaire: string;
}

/**
 * Le rôle remplace l'élément comme étiquette lisible d'un personnage. La
 * différence est essentielle : un rôle décrit ce que le personnage FAIT, il
 * ne donne aucun bonus ni malus face à un autre rôle. Il n'existe plus de
 * tableau d'efficacité dans ce jeu.
 */
export const INFO_ROLES: Record<Role, InfoRole> = {
  MAGE: {
    id: 'MAGE',
    nom: 'Mage',
    texte: 'Gros dégâts magiques, encaisse mal.',
    emoji: '🔮',
    couleur: '#7f8cff',
    couleurClaire: '#c2c9ff',
  },
  BRUISER: {
    id: 'BRUISER',
    nom: 'Bruiser',
    texte: 'Frappe fort et tient debout.',
    emoji: '💪',
    couleur: '#ff7a3d',
    couleurClaire: '#ffc0a1',
  },
  ASSASSIN: {
    id: 'ASSASSIN',
    nom: 'Assassin',
    texte: 'Rapide, critique, fragile.',
    emoji: '🗡️',
    couleur: '#c774ff',
    couleurClaire: '#e6c2ff',
  },
  SOUTIEN: {
    id: 'SOUTIEN',
    nom: 'Soutien',
    texte: 'Soigne, protège, purge.',
    emoji: '✚',
    couleur: '#43d17c',
    couleurClaire: '#a7f0c4',
  },
  TANK: {
    id: 'TANK',
    nom: 'Tank',
    texte: 'Armure épaisse, dégâts modestes.',
    emoji: '🛡️',
    couleur: '#5fb4d8',
    couleurClaire: '#b6e0f0',
  },
  FARCEUR: {
    id: 'FARCEUR',
    nom: 'Farceur',
    texte: 'Statuts, dés truqués, chaos.',
    emoji: '🎲',
    couleur: '#ffcb3d',
    couleurClaire: '#ffe9a8',
  },
};

export const ROLES: readonly Role[] = [
  'BRUISER',
  'MAGE',
  'ASSASSIN',
  'TANK',
  'SOUTIEN',
  'FARCEUR',
];
