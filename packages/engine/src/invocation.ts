import { ESPECES } from './data/especes.js';
import { SORTS } from './data/sorts.js';
import { ITEMS } from './data/items.js';
import { Rng } from './rng.js';
import { tirerIvs, tirerIvsSort, tirerNature } from './stats.js';
import { tirerChromatique, tirerPrisme } from './variantes.js';
import type { IvsPerso, IvsSort, Rarete } from './types.js';

export type TypeBanniere = 'STANDARD' | 'LEGENDAIRE';

/** Part des tirages non-personnage qui donnent un objet plutôt qu'un sort. */
const PART_OBJET = 0.24;

export interface Banniere {
  id: TypeBanniere;
  nom: string;
  texte: string;
  /** Prix d'un booster. */
  coutBooster: { credits?: number; eclats?: number };
  /** Prix du lot, légèrement remisé. */
  coutLot: { credits?: number; eclats?: number };
  /** Nombre de boosters dans un lot. */
  boostersParLot: number;
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
    coutBooster: { credits: 1200 },
    coutLot: { credits: 5400 },
    boostersParLot: 5,
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
    coutBooster: { eclats: 60 },
    coutLot: { eclats: 270 },
    boostersParLot: 5,
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

  // Les objets sont la troisième famille de cartes, au même titre que les
  // personnages et les sorts : à 7 % des tirages on n'en voyait presque
  // jamais, et l'emplacement d'objet — qui porte maintenant le choix entre
  // armure et amorti — restait vide trop longtemps.
  if (rng.next() < PART_OBJET) {
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

export interface Booster {
  cartes: ResultatTirage[];
  /** Rareté la plus haute du paquet : sert à l'aura affichée avant ouverture. */
  meilleureRarete: Rarete;
  /** Le paquet contient au moins une variante cosmétique. */
  contientVariante: boolean;
}

export interface ResultatInvocation {
  boosters: Booster[];
  nouveauCompteurPitie: number;
}

function estVariante(t: ResultatTirage): boolean {
  return (t.kind === 'PERSO' && t.chromatique) || (t.kind === 'SORT' && t.prisme);
}

/**
 * Ouvre `nombreBoosters` paquets.
 *
 * Deux règles donnent leur rythme aux paquets :
 * - chaque booster contient **au moins une carte rare ou mieux**, pour qu'aucun
 *   paquet ne soit une déception complète ;
 * - la meilleure carte est placée **en dernier**, parce que tout l'intérêt de
 *   la cérémonie est que la tension monte au lieu de retomber.
 */
export function invoquer(
  banniere: Banniere,
  rng: Rng,
  compteurPitie: number,
  nombreBoosters: number,
): ResultatInvocation {
  const boosters: Booster[] = [];
  let pitie = compteurPitie;

  for (let b = 0; b < nombreBoosters; b++) {
    const cartes: ResultatTirage[] = [];
    for (let i = 0; i < banniere.cartes; i++) {
      const r = tirer(banniere, rng, pitie);
      pitie = rareteAuMoins(r.rarete, banniere.pitieRarete) ? 0 : pitie + 1;
      cartes.push(r);
    }

    // Garantie « au moins une rare » : on remplace la plus faible si besoin.
    if (!cartes.some((c) => rareteAuMoins(c.rarete, 'RARE'))) {
      const pool = SORTS.filter((s) => s.rarete === 'RARE');
      cartes[cartes.length - 1] = {
        kind: 'SORT',
        defId: rng.pick(pool).id,
        rarete: 'RARE',
        ivs: tirerIvsSort(rng, banniere.plancherIv),
        prisme: tirerPrisme(rng, banniere.bonusVariante),
      };
    }

    // La meilleure carte passe en dernier. À rareté égale, une variante
    // cosmétique l'emporte : c'est elle qui fait la révélation mémorable.
    const valeur = (t: ResultatTirage): number =>
      ORDRE_RARETE.indexOf(t.rarete) * 2 + (estVariante(t) ? 1 : 0);
    let meilleur = 0;
    for (let i = 1; i < cartes.length; i++) {
      if (valeur(cartes[i]) > valeur(cartes[meilleur])) meilleur = i;
    }
    const [carteFinale] = cartes.splice(meilleur, 1);
    cartes.push(carteFinale);

    boosters.push({
      cartes,
      meilleureRarete: carteFinale.rarete,
      contientVariante: cartes.some(estVariante),
    });
  }

  return { boosters, nouveauCompteurPitie: pitie };
}

/** Coûts des services de la boutique. */
export const COUT_REROLL_GENES = 1600;
export const COUT_HYPER_ENTRAINEMENT = 22; // en éclats, par stat
export const COUT_REROLL_GENES_SORT = 900;
export const COUT_RENOMMER = 150;
