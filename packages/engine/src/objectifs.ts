import type { Rarete, Role } from './types.js';
import type { ModeMatch } from './progression.js';
import { ESPECES } from './data/especes.js';
import type { Rng } from './rng.js';

/**
 * Objectifs. La même mécanique sert aux premiers pas (une fois, à la
 * découverte) et aux contrats journaliers (tirés chaque jour).
 *
 * Les conditions sont volontairement orientées vers la *variété de jeu* plutôt
 * que vers le volume : gagner avec un élément donné, réussir des dés parfaits,
 * gagner sans changer de combattant. Un objectif qui demande « joue 20 parties »
 * ne fait rien découvrir, il fait juste attendre.
 */

export type ConditionObjectif =
  | { type: 'VICTOIRES'; nombre: number; modes?: ModeMatch[] }
  | { type: 'VICTOIRE_ROLE'; role: Role }
  | { type: 'DES_PARFAITS'; nombre: number }
  | { type: 'COUP_PUISSANT'; montant: number }
  | { type: 'VICTOIRE_SANS_CHANGER' }
  | { type: 'CRITIQUES'; nombre: number }
  | { type: 'SUPER_EFFICACES'; nombre: number }
  | { type: 'BOOSTERS'; nombre: number }
  | { type: 'ETAGE_TOUR'; etage: number }
  | { type: 'EQUIPER_SORT' }
  | { type: 'COMPOSER_EQUIPE' }
  | { type: 'NIVEAU_PERSO'; niveau: number };

export interface Recompense {
  credits?: number;
  eclats?: number;
}

export interface Objectif {
  id: string;
  nom: string;
  texte: string;
  emoji: string;
  condition: ConditionObjectif;
  recompense: Recompense;
}

/** Combien il faut accumuler pour valider l'objectif. */
export function cible(c: ConditionObjectif): number {
  switch (c.type) {
    case 'VICTOIRES':
      return c.nombre;
    case 'DES_PARFAITS':
      return c.nombre;
    case 'CRITIQUES':
      return c.nombre;
    case 'SUPER_EFFICACES':
      return c.nombre;
    case 'BOOSTERS':
      return c.nombre;
    default:
      return 1;
  }
}

// ─────────────────────────── Les premiers pas ───────────────────────────

/**
 * Parcours de découverte, une seule fois par compte. L'ordre raconte une
 * progression : gagner, comprendre l'atelier, ouvrir un paquet, puis viser
 * la Tour et le classement.
 */
export const PREMIERS_PAS: Objectif[] = [
  {
    id: 'pp_premier_combat',
    nom: 'Premier sang',
    texte: 'Remporte ton premier combat.',
    emoji: '⚔️',
    condition: { type: 'VICTOIRES', nombre: 1 },
    recompense: { credits: 400 },
  },
  {
    id: 'pp_equipe',
    nom: 'Chef d’écurie',
    texte: 'Compose ton équipe dans l’Atelier.',
    emoji: '🧬',
    condition: { type: 'COMPOSER_EQUIPE' },
    recompense: { credits: 300 },
  },
  {
    id: 'pp_sort',
    nom: 'Grimoire ouvert',
    texte: 'Équipe un sort sur un personnage.',
    emoji: '📜',
    condition: { type: 'EQUIPER_SORT' },
    recompense: { credits: 300 },
  },
  {
    id: 'pp_booster',
    nom: 'Premier paquet',
    texte: 'Ouvre un booster.',
    emoji: '🎴',
    condition: { type: 'BOOSTERS', nombre: 1 },
    recompense: { credits: 500, eclats: 5 },
  },
  {
    id: 'pp_de_parfait',
    nom: 'La chance sourit',
    texte: 'Réussis un dé parfait en combat.',
    emoji: '🎲',
    condition: { type: 'DES_PARFAITS', nombre: 1 },
    recompense: { credits: 400 },
  },
  {
    id: 'pp_super',
    nom: 'Le bon élément',
    texte: 'Inflige trois coups super efficaces.',
    emoji: '⚡',
    condition: { type: 'SUPER_EFFICACES', nombre: 3 },
    recompense: { credits: 450 },
  },
  {
    id: 'pp_tour',
    nom: 'Premier étage',
    texte: 'Atteins le troisième étage de la Tour.',
    emoji: '🗼',
    condition: { type: 'ETAGE_TOUR', etage: 3 },
    recompense: { credits: 700, eclats: 10 },
  },
  {
    id: 'pp_classe',
    nom: 'Dans l’arène',
    texte: 'Remporte un combat classé.',
    emoji: '🏆',
    condition: { type: 'VICTOIRES', nombre: 1, modes: ['CLASSE'] },
    recompense: { credits: 900, eclats: 15 },
  },
];

export const PREMIERS_PAS_PAR_ID: Record<string, Objectif> = Object.fromEntries(
  PREMIERS_PAS.map((o) => [o.id, o]),
);

// ─────────────────────────── Contrats journaliers ───────────────────────────

const LIBELLE_ROLE: Record<Role, { nom: string; emoji: string }> = {
  MAGE: { nom: 'mage', emoji: '🔮' },
  BRUISER: { nom: 'bruiser', emoji: '💪' },
  ASSASSIN: { nom: 'assassin', emoji: '🗡️' },
  SOUTIEN: { nom: 'soutien', emoji: '✚' },
  TANK: { nom: 'tank', emoji: '🛡️' },
  FARCEUR: { nom: 'farceur', emoji: '🎲' },
};

/** Les contrats poussent à sortir de son équipe habituelle, par rôle. */
function contratsParRole(): Objectif[] {
  return ESPECES.map((e) => e.role)
    .filter((r, i, arr) => arr.indexOf(r) === i)
    .map((role) => ({
      id: `cj_role_${role.toLowerCase()}`,
      nom: `Spécialiste ${LIBELLE_ROLE[role].nom}`,
      texte: `Remporte un combat avec un ${LIBELLE_ROLE[role].nom} dans ton équipe.`,
      emoji: LIBELLE_ROLE[role].emoji,
      condition: { type: 'VICTOIRE_ROLE', role } as ConditionObjectif,
      recompense: { credits: 260 },
    }));
}

export const CONTRATS: Objectif[] = [
  {
    id: 'cj_victoires_2',
    nom: 'Journée chargée',
    texte: 'Remporte deux combats.',
    emoji: '⚔️',
    condition: { type: 'VICTOIRES', nombre: 2 },
    recompense: { credits: 300 },
  },
  {
    id: 'cj_des_parfaits',
    nom: 'Main chaude',
    texte: 'Réussis trois dés parfaits.',
    emoji: '🎲',
    condition: { type: 'DES_PARFAITS', nombre: 3 },
    recompense: { credits: 340, eclats: 2 },
  },
  {
    id: 'cj_sans_changer',
    nom: 'Tenir la ligne',
    texte: 'Gagne un combat sans changer de combattant.',
    emoji: '🛡️',
    condition: { type: 'VICTOIRE_SANS_CHANGER' },
    recompense: { credits: 380 },
  },
  {
    id: 'cj_coup_puissant',
    nom: 'Coup de massue',
    texte: 'Inflige 200 dégâts en un seul coup.',
    emoji: '💥',
    condition: { type: 'COUP_PUISSANT', montant: 200 },
    recompense: { credits: 360, eclats: 2 },
  },
  {
    id: 'cj_critiques',
    nom: 'Précision chirurgicale',
    texte: 'Place quatre coups critiques.',
    emoji: '🎯',
    condition: { type: 'CRITIQUES', nombre: 4 },
    recompense: { credits: 320 },
  },
  {
    id: 'cj_tour_5',
    nom: 'Grimpeur',
    texte: 'Atteins le cinquième étage de la Tour.',
    emoji: '🗼',
    condition: { type: 'ETAGE_TOUR', etage: 5 },
    recompense: { credits: 480, eclats: 4 },
  },
  {
    id: 'cj_booster',
    nom: 'Collectionneur',
    texte: 'Ouvre deux boosters.',
    emoji: '🎴',
    condition: { type: 'BOOSTERS', nombre: 2 },
    recompense: { credits: 300 },
  },
  {
    id: 'cj_classe',
    nom: 'Monter au filet',
    texte: 'Remporte un combat classé.',
    emoji: '🏆',
    condition: { type: 'VICTOIRES', nombre: 1, modes: ['CLASSE'] },
    recompense: { credits: 420, eclats: 3 },
  },
  ...contratsParRole(),
];

export const CONTRATS_PAR_ID: Record<string, Objectif> = Object.fromEntries(
  CONTRATS.map((o) => [o.id, o]),
);

/** Trois contrats distincts pour la journée, tirés de façon déterministe. */
export function contratsDuJour(rng: Rng): string[] {
  const melange = rng.shuffle(CONTRATS);
  const choisis: string[] = [];
  // On évite deux contrats élémentaires le même jour : ce serait deux fois la
  // même contrainte avec une couleur différente.
  let elementaireVu = false;
  for (const c of melange) {
    if (choisis.length >= 3) break;
    const estElementaire = c.id.startsWith('cj_element_');
    if (estElementaire && elementaireVu) continue;
    if (estElementaire) elementaireVu = true;
    choisis.push(c.id);
  }
  return choisis;
}

export function objetParId(id: string): Objectif | undefined {
  return PREMIERS_PAS_PAR_ID[id] ?? CONTRATS_PAR_ID[id];
}

// ─────────────────────────── Connexion quotidienne ───────────────────────────

export interface PalierConnexion {
  jour: number;
  recompense: Recompense;
  /** Un booster offert, s'il y en a un. */
  booster?: boolean;
}

/**
 * Cycle de sept jours. Le septième vaut nettement plus : c'est lui qui donne
 * envie de ne pas sauter un jour.
 */
export const CYCLE_CONNEXION: PalierConnexion[] = [
  { jour: 1, recompense: { credits: 250 } },
  { jour: 2, recompense: { credits: 300 } },
  { jour: 3, recompense: { credits: 350, eclats: 3 } },
  { jour: 4, recompense: { credits: 400 } },
  { jour: 5, recompense: { credits: 450, eclats: 5 } },
  { jour: 6, recompense: { credits: 550 } },
  { jour: 7, recompense: { credits: 1200, eclats: 20 }, booster: true },
];

export const RARETES_ORDRE: Rarete[] = ['COMMUN', 'RARE', 'EPIQUE', 'LEGENDAIRE'];
