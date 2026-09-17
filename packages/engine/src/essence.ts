import { getEspece } from './data/especes.js';
import { getSortDef } from './data/sorts.js';
import { perfectionIvs, perfectionIvsSort } from './stats.js';
import type { PersoPossede, Rarete, SortPossede } from './types.js';

/**
 * L'essence transforme la déception du doublon en progression.
 *
 * Un troisième « Limousin » identique ne sert à rien ; dissous, il devient de
 * quoi perfectionner un gène ou fabriquer le sort qu'on cherche vraiment.
 * C'est aussi le seul moyen d'obtenir un sort précis sans passer par le hasard.
 */

const VALEUR_PERSO: Record<Rarete, number> = {
  COMMUN: 45,
  RARE: 110,
  EPIQUE: 240,
  LEGENDAIRE: 520,
};

const VALEUR_SORT: Record<Rarete, number> = {
  COMMUN: 18,
  RARE: 42,
  EPIQUE: 95,
  LEGENDAIRE: 210,
};

const COUT_FABRICATION: Record<Rarete, number> = {
  COMMUN: 110,
  RARE: 260,
  EPIQUE: 620,
  LEGENDAIRE: 1400,
};

/** Perfectionner un gène de personnage. */
export const COUT_GENE_ESSENCE = 70;

/**
 * Un exemplaire aux bons gènes vaut plus : dissoudre un personnage parfait
 * doit rester un vrai choix, pas une évidence.
 */
export function valeurDissolutionPerso(p: PersoPossede): number {
  const espece = getEspece(p.especeId);
  const base = VALEUR_PERSO[espece.rarete];
  const qualite = 1 + perfectionIvs(p.ivs) / 200;
  const niveau = 1 + (p.niveau - 1) / 90;
  const chromatique = p.chromatique ? 2.5 : 1;
  return Math.round(base * qualite * niveau * chromatique);
}

export function valeurDissolutionSort(s: SortPossede): number {
  const def = getSortDef(s.defId);
  const base = VALEUR_SORT[def.rarete];
  const qualite = 1 + perfectionIvsSort(s.ivs) / 200;
  const prisme = s.prisme ? 2.5 : 1;
  return Math.round(base * qualite * prisme);
}

export function coutFabrication(defId: string): number {
  return COUT_FABRICATION[getSortDef(defId).rarete];
}

/** Les sorts fabriqués sortent avec des gènes corrects, jamais parfaits. */
export const PLANCHER_IV_FABRICATION = 14;
