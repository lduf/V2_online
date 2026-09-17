import { ESPECES } from './data/especes.js';
import { SORTS } from './data/sorts.js';
import { ITEMS } from './data/items.js';
import { Rng } from './rng.js';
import { tirerIvs, tirerIvsSort, tirerNature } from './stats.js';
import { tirerChromatique, tirerPrisme } from './variantes.js';
import type { IvsPerso, IvsSort, Rarete } from './types.js';

export type TypeBanniere = 'STANDARD' | 'LEGENDAIRE';

export interface Banniere {
  id: TypeBanniere;
  nom: string;
  texte: string;
  coutUnite: { credits?: number; eclats?: number };
  coutDix: { credits?: number; eclats?: number };
  /** Poids de rareté pour un tirage simple. */
  poids: Record<Rarete, number>;
  /** Probabilité de tirer un personnage plutôt qu'un sort (0-1). */
  partPerso: number;
  /** IV minimum garanti sur ce qui sort de cette bannière. */
  plancherIv: number;
  /** Rareté garantie tous les `pitiePas` tirages. */
  pitieRarete: Rarete;
  pitiePas: number;
  /** Multiplicateur appliqué aux taux de variantes cosmétiques. */
  bonusVariante: number;
  /** Nombre de cartes par booster. */
  cartes: number;
}

export const BANNIERES: Record<TypeBanniere, Banniere> = {
  STANDARD: {
    id: 'STANDARD',
    nom: 'Invocation du Campus',
    texte: 'Le tout-venant : sorts, personnages, parfois une pépite.',
    coutUnite: { credits: 800 },
    coutDix: { credits: 7200 },
    poids: { COMMUN: 56, RARE: 31, EPIQUE: 11, LEGENDAIRE: 2 },
    partPerso: 0.32,
    plancherIv: 0,
    pitieRarete: 'EPIQUE',
    pitiePas: 10,
    bonusVariante: 1,
    cartes: 5,
  },
  LEGENDAIRE: {
    id: 'LEGENDAIRE',
    nom: 'Rituel des Anciens',
    texte: 'Coûte des éclats. Rien de commun, gènes déjà affûtés.',
    coutUnite: { eclats: 45 },
    coutDix: { eclats: 400 },
    poids: { COMMUN: 0, RARE: 52, EPIQUE: 38, LEGENDAIRE: 10 },
    partPerso: 0.45,
    plancherIv: 12,
    pitieRarete: 'LEGENDAIRE',
    pitiePas: 12,
    bonusVariante: 3,
    cartes: 5,
  },
};

export type ResultatTirage =
  | {
      kind: 'PERSO';
      especeId: string;
      rarete: Rarete;
      ivs: IvsPerso;
      natureId: string;
      chromatique: boolean;
    }
  | { kind: 'SORT'; defId: string; rarete: Rarete; ivs: IvsSort; prisme: boolean }
  | { kind: 'ITEM'; itemId: string; rarete: Rarete };

function rareteAleatoire(rng: Rng, poids: Record<Rarete, number>): Rarete {
  return rng.weighted(
    (Object.entries(poids) as [Rarete, number][]).filter((e) => e[1] > 0) as readonly (readonly [
      Rarete,
      number,
    ])[],
  );
}

const ORDRE_RARETE: Rarete[] = ['COMMUN', 'RARE', 'EPIQUE', 'LEGENDAIRE'];

export function rareteAuMoins(a: Rarete, b: Rarete): boolean {
  return ORDRE_RARETE.indexOf(a) >= ORDRE_RARETE.indexOf(b);
}

/**
 * Un tirage. `compteurPitie` = nombre de tirages consécutifs sans avoir
 * atteint la rareté de pitié de la bannière.
 */
export function tirer(banniere: Banniere, rng: Rng, compteurPitie: number): ResultatTirage {
  let rarete = rareteAleatoire(rng, banniere.poids);
  if (compteurPitie + 1 >= banniere.pitiePas && !rareteAuMoins(rarete, banniere.pitieRarete)) {
    rarete = banniere.pitieRarete;
  }

  // 8 % des tirages donnent un objet tenu au lieu d'un sort.
  const veutPerso = rng.next() < banniere.partPerso;
  if (veutPerso) {
    const pool = ESPECES.filter((e) => e.rarete === rarete);
    const choisi = pool.length > 0 ? rng.pick(pool) : rng.pick(ESPECES);
    return {
      kind: 'PERSO',
      especeId: choisi.id,
      rarete: choisi.rarete,
      ivs: tirerIvs(rng, banniere.plancherIv),
      natureId: tirerNature(rng),
      chromatique: tirerChromatique(rng, banniere.bonusVariante),
    };
  }

  if (rng.next() < 0.1) {
    const pool = ITEMS.filter((i) => i.rarete === rarete);
    if (pool.length > 0) {
      const item = rng.pick(pool);
      return { kind: 'ITEM', itemId: item.id, rarete: item.rarete };
    }
  }

  const pool = SORTS.filter((s) => s.rarete === rarete);
  const sort = pool.length > 0 ? rng.pick(pool) : rng.pick(SORTS);
  return {
    kind: 'SORT',
    defId: sort.id,
    rarete: sort.rarete,
    ivs: tirerIvsSort(rng, banniere.plancherIv),
    prisme: tirerPrisme(rng, banniere.bonusVariante),
  };
}

export interface ResultatInvocation {
  tirages: ResultatTirage[];
  nouveauCompteurPitie: number;
}

export function invoquer(
  banniere: Banniere,
  rng: Rng,
  compteurPitie: number,
  nombre: number,
): ResultatInvocation {
  const tirages: ResultatTirage[] = [];
  let pitie = compteurPitie;
  let aEuRare = false;
  for (let i = 0; i < nombre; i++) {
    const r = tirer(banniere, rng, pitie);
    if (rareteAuMoins(r.rarete, banniere.pitieRarete)) pitie = 0;
    else pitie += 1;
    if (rareteAuMoins(r.rarete, 'RARE')) aEuRare = true;
    tirages.push(r);
  }
  // Garantie « au moins un RARE » sur un multi de 10.
  if (nombre >= 10 && !aEuRare) {
    const pool = SORTS.filter((s) => s.rarete === 'RARE');
    tirages[nombre - 1] = {
      kind: 'SORT',
      defId: rng.pick(pool).id,
      rarete: 'RARE',
      ivs: tirerIvsSort(rng, banniere.plancherIv),
      prisme: tirerPrisme(rng, banniere.bonusVariante),
    };
  }
  return { tirages, nouveauCompteurPitie: pitie };
}

/** Coûts des services de la boutique. */
export const COUT_REROLL_GENES = 1600;
export const COUT_HYPER_ENTRAINEMENT = 22; // en éclats, par stat
export const COUT_REROLL_GENES_SORT = 900;
export const COUT_RENOMMER = 150;
