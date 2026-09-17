import type { NatureDef } from '../types.js';

/**
 * Natures à la Pokémon : +10 % sur une stat, -10 % sur une autre.
 * Les noms reprennent l'ambiance « vie étudiante » du projet d'origine.
 */
export const NATURES: NatureDef[] = [
  { id: 'temeraire', nom: 'Téméraire', plus: 'atq', moins: 'def', texte: 'Fonce, réfléchit après.' },
  { id: 'studieux', nom: 'Studieux', plus: 'mag', moins: 'atq', texte: 'A lu le poly. Deux fois.' },
  { id: 'cafeine', nom: 'Caféiné', plus: 'vit', moins: 'res', texte: 'Quatrième expresso.' },
  { id: 'blindé', nom: 'Blindé', plus: 'def', moins: 'vit', texte: 'Bouge pas d’un cil.' },
  { id: 'zen', nom: 'Zen', plus: 'res', moins: 'atq', texte: 'Rien ne l’atteint.' },
  { id: 'chanceux', nom: 'Chanceux', plus: 'chance', moins: 'def', texte: 'Tombe toujours bien.' },
  { id: 'brutal', nom: 'Brutal', plus: 'atq', moins: 'mag', texte: 'La subtilité, plus tard.' },
  { id: 'malin', nom: 'Malin', plus: 'mag', moins: 'def', texte: 'Connaît la faille.' },
  { id: 'nonchalant', nom: 'Nonchalant', plus: 'def', moins: 'chance', texte: 'Zéro stress.' },
  { id: 'nerveux', nom: 'Nerveux', plus: 'vit', moins: 'def', texte: 'Ne tient pas en place.' },
  { id: 'costaud', nom: 'Costaud', plus: 'def', moins: 'mag', texte: 'Porte le frigo tout seul.' },
  { id: 'lunaire', nom: 'Lunaire', plus: 'chance', moins: 'vit', texte: 'Ailleurs, mais veinard.' },
  { id: 'rigoureux', nom: 'Rigoureux', plus: 'res', moins: 'vit', texte: 'Méthode avant tout.' },
  { id: 'fougueux', nom: 'Fougueux', plus: 'atq', moins: 'res', texte: 'Tout en agressivité.' },
  { id: 'equilibre', nom: 'Équilibré', plus: null, moins: null, texte: 'Ni chaud ni froid.' },
];

export const NATURES_PAR_ID: Record<string, NatureDef> = Object.fromEntries(
  NATURES.map((n) => [n.id, n]),
);

export function natureMod(natureId: string, stat: string): number {
  const n = NATURES_PAR_ID[natureId];
  if (!n) return 1;
  if (n.plus === stat) return 1.1;
  if (n.moins === stat) return 0.9;
  return 1;
}
