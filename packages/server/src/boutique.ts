import {
  ESPECES,
  ITEMS,
  Rng,
  SORTS,
  type Rarete,
} from '@arene/engine';

export interface OffreBoutique {
  kind: 'PERSO' | 'SORT' | 'ITEM';
  id: string;
  prix: number;
  remise: number;
  rarete: Rarete;
}

export interface Boutique {
  jour: number;
  expireLe: number;
  rotation: OffreBoutique[];
  permanents: OffreBoutique[];
}

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Numéro de jour depuis epoch : sert de graine à la rotation quotidienne. */
export function jourActuel(maintenant = Date.now()): number {
  return Math.floor(maintenant / JOUR_MS);
}

function offresPermanentes(): OffreBoutique[] {
  const out: OffreBoutique[] = [];
  for (const e of ESPECES) {
    if (e.rarete === 'COMMUN') out.push({ kind: 'PERSO', id: e.id, prix: e.prix, remise: 0, rarete: e.rarete });
  }
  for (const s of SORTS) {
    if (s.rarete === 'COMMUN') out.push({ kind: 'SORT', id: s.id, prix: s.prix, remise: 0, rarete: s.rarete });
  }
  for (const i of ITEMS) {
    if (i.rarete === 'COMMUN') out.push({ kind: 'ITEM', id: i.id, prix: i.prix, remise: 0, rarete: i.rarete });
  }
  return out;
}

const PERMANENTS = offresPermanentes();

/**
 * La boutique tourne chaque jour. Le tirage est déterministe (graine = le jour),
 * donc tous les joueurs voient la même vitrine et le serveur peut revalider
 * un achat sans stocker quoi que ce soit.
 */
export function boutiqueDuJour(maintenant = Date.now()): Boutique {
  const jour = jourActuel(maintenant);
  const rng = new Rng((jour * 2654435761) >>> 0);

  const rotation: OffreBoutique[] = [];
  const prendre = (
    kind: OffreBoutique['kind'],
    liste: { id: string; prix: number; rarete: Rarete }[],
    filtre: (r: Rarete) => boolean,
    combien: number,
  ): void => {
    const pool = rng.shuffle(liste.filter((x) => filtre(x.rarete)));
    for (const x of pool.slice(0, combien)) {
      rotation.push({ kind, id: x.id, prix: x.prix, remise: 0, rarete: x.rarete });
    }
  };

  prendre('PERSO', ESPECES, (r) => r !== 'COMMUN', 3);
  prendre('SORT', SORTS, (r) => r !== 'COMMUN', 5);
  prendre('ITEM', ITEMS, (r) => r !== 'COMMUN', 3);

  // Une offre du jour à -35 %.
  if (rotation.length > 0) {
    const i = rng.int(0, rotation.length - 1);
    rotation[i] = { ...rotation[i], remise: 35 };
  }

  return {
    jour,
    expireLe: (jour + 1) * JOUR_MS,
    rotation,
    permanents: PERMANENTS,
  };
}

export function prixFinal(o: OffreBoutique): number {
  return Math.round(o.prix * (1 - o.remise / 100));
}

export function trouverOffre(
  kind: OffreBoutique['kind'],
  id: string,
  maintenant = Date.now(),
): OffreBoutique | undefined {
  const b = boutiqueDuJour(maintenant);
  return (
    b.rotation.find((o) => o.kind === kind && o.id === id) ??
    b.permanents.find((o) => o.kind === kind && o.id === id)
  );
}
