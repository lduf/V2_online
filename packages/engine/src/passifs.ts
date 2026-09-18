import type { CategorieSort, StatKey, StatutId } from './types.js';

/**
 * Les passifs, pilotés par les données.
 *
 * Ils étaient écrits en dur dans `combat.ts` sous forme de tests
 * `passifId === '…'`. Ça tenait à seize personnages ; ça ne tient pas à
 * cinquante, où chaque nouveau venu aurait ajouté une branche au cœur du
 * moteur. Un passif est désormais une liste d'effets, exactement comme un
 * talent — le moteur lit le vocabulaire, plus les identités.
 *
 * Effet de bord utile : un passif devient imprimable sur une carte sans le
 * retraduire à la main, puisque sa règle est de la donnée.
 */

/** Conditions de déclenchement partagées par plusieurs effets. */
export type QuandPassif =
  | 'TOUJOURS'
  | 'PV_BAS'
  | 'PV_HAUT'
  | 'PREMIER_TOUR'
  | 'CIBLE_ENTAMEE'
  | 'CIBLE_INTACTE';

export type EffetPassif =
  /** Multiplie une statistique, éventuellement sous condition. */
  | { k: 'STAT'; stat: Exclude<StatKey, 'pv'>; mult: number; quand?: QuandPassif; seuil?: number }
  /** Multiplie les dégâts infligés. */
  | {
      k: 'DEGATS';
      mult: number;
      quand?: QuandPassif;
      seuil?: number;
      categorie?: CategorieSort;
      /** Ne s'applique que si la cible porte ce statut. */
      statutCible?: StatutId;
      /** Ne s'applique qu'aux sorts dont le dé a au moins tant de faces. */
      deMin?: number;
    }
  /** Montée en puissance au fil des rounds. */
  | { k: 'DEGATS_ROUND'; parRound: number; max: number }
  /** Multiplie les dégâts encaissés (valeur < 1 = réduction). */
  | { k: 'ENCAISSE'; mult: number; categorie?: CategorieSort }
  /** Armure plate supplémentaire, en part des PV max. */
  | { k: 'ARMURE'; ratio: number }
  /** Plafond de dégâts par coup, en part des PV max. */
  | { k: 'AMORTI'; ratio: number }
  /** Renvoi de dégâts à l'attaquant. */
  | { k: 'EPINES'; ratio: number; categorie?: CategorieSort }
  /** Points de critique. */
  | { k: 'CRIT'; pts: number; quand?: QuandPassif; seuil?: number }
  /** Points de précision. */
  | { k: 'PRECISION'; pts: number; deMin?: number }
  /** Chance d'esquiver complètement une attaque. */
  | { k: 'ESQUIVE'; pct: number }
  /** Relance un jet de dé inférieur à ce ratio, et garde le meilleur. */
  | { k: 'RELANCE_DE'; seuil: number }
  /** Énergie gagnée à chaque début de tour. */
  | { k: 'ENERGIE_TOUR'; valeur: number }
  /** Énergie volée à l'adversaire à chaque début de tour. */
  | { k: 'VOL_ENERGIE'; valeur: number }
  /** Bouclier gagné à chaque début de tour, en part des PV max. */
  | { k: 'BOUCLIER_TOUR'; ratio: number }
  /** Régénération à la fin du tour, en part des PV max. */
  | { k: 'REGEN_TOUR'; ratio: number }
  /** Multiplie les soins reçus. */
  | { k: 'SOIN_RECU'; mult: number }
  /** Récupère une part des dégâts infligés. */
  | { k: 'VAMPIRE'; ratio: number; categorie?: CategorieSort }
  /** Applique un statut quand on porte un coup critique. */
  | { k: 'STATUT_SUR_CRIT'; statut: StatutId; duree: number }
  /** À l'entrée sur le terrain : purge et/ou palier de stat. */
  | { k: 'ENTREE'; purge?: boolean; stat?: Exclude<StatKey, 'pv'>; palier?: number }
  /** Survit une fois par combat à un coup fatal. */
  | { k: 'SURVIE' }
  /** Immunise contre les statuts négatifs. */
  | { k: 'ANTIDOTE' };

/**
 * Les règles des passifs, indexées par leur identifiant. Le texte affiché
 * reste dans la fiche d'espèce : ici on ne décrit que la mécanique.
 */
export const REGLES_PASSIFS: Record<string, EffetPassif[]> = {
  // ── Les seize d'origine, traduits à l'identique ──────────────────────
  montee_temperature: [{ k: 'DEGATS_ROUND', parRound: 0.07, max: 0.42 }],
  second_souffle: [{ k: 'SOIN_RECU', mult: 1.25 }],
  embuscade: [{ k: 'DEGATS', mult: 1.45, quand: 'PREMIER_TOUR' }],
  mur_porteur: [{ k: 'ENCAISSE', mult: 0.82, categorie: 'PHYSIQUE' }],
  surcharge: [{ k: 'ENERGIE_TOUR', valeur: 14 }],
  ressac: [{ k: 'REGEN_TOUR', ratio: 0.05 }],
  coup_de_sang: [
    { k: 'CRIT', pts: 25, quand: 'PV_BAS', seuil: 0.5 },
    { k: 'DEGATS', mult: 1.15, quand: 'PV_BAS', seuil: 0.5 },
  ],
  theoreme: [
    { k: 'PRECISION', pts: 12, deMin: 15 },
    { k: 'DEGATS', mult: 1.12, deMin: 15 },
  ],
  amende: [{ k: 'VOL_ENERGIE', valeur: 8 }],
  aube: [{ k: 'ENTREE', purge: true, stat: 'res', palier: 1 }],
  de_pipe: [{ k: 'RELANCE_DE', seuil: 0.4 }],
  brasier: [
    { k: 'DEGATS', mult: 1.28, statutCible: 'BRULURE' },
    { k: 'STATUT_SUR_CRIT', statut: 'BRULURE', duree: 3 },
  ],
  drain_ame: [{ k: 'VAMPIRE', ratio: 0.14, categorie: 'MAGIQUE' }],
  esquive: [{ k: 'ESQUIVE', pct: 18 }],
  tenacite: [{ k: 'STAT', stat: 'atq', mult: 1.4, quand: 'PV_BAS', seuil: 0.3 }],
  egide: [{ k: 'BOUCLIER_TOUR', ratio: 0.09 }],

  // ── Les nouveaux venus, écrits uniquement en données ─────────────────
  deja_vu: [{ k: 'ARMURE', ratio: 0.02 }],
  ordre_du_jour: [{ k: 'ENTREE', purge: true, stat: 'def', palier: 1 }],
  course_contre_la_montre: [{ k: 'DEGATS', mult: 1.3, quand: 'CIBLE_ENTAMEE', seuil: 0.5 }],
  relecture: [{ k: 'RELANCE_DE', seuil: 0.5 }],
  prolongations: [{ k: 'SURVIE' }],
  protocole: [{ k: 'ANTIDOTE' }],
  marche_noir: [{ k: 'VOL_ENERGIE', valeur: 10 }],
  arret_reflexe: [{ k: 'AMORTI', ratio: 0.14 }],
  fiches_bristol: [
    { k: 'DEGATS', mult: 1.14, categorie: 'MAGIQUE' },
    { k: 'PRECISION', pts: 10, deMin: 12 },
  ],
  contagion: [{ k: 'STATUT_SUR_CRIT', statut: 'CONFUSION', duree: 2 }],
  copie_blanche: [
    { k: 'ARMURE', ratio: 0.03 },
    { k: 'EPINES', ratio: 0.12 },
  ],
  mention_tres_bien: [
    { k: 'DEGATS', mult: 1.12 },
    { k: 'RELANCE_DE', seuil: 0.45 },
  ],
};

/**
 * Tout passif déclaré sur une espèce doit avoir une règle ici, sinon il ne
 * fait rien du tout et personne ne s'en aperçoit. Ce contrôle tourne au
 * chargement du moteur : un oubli casse bruyamment plutôt qu'en silence.
 */
export function passifsSansRegle(ids: readonly string[]): string[] {
  return ids.filter((id) => !REGLES_PASSIFS[id]);
}

export function reglesPassif(id: string): EffetPassif[] {
  return REGLES_PASSIFS[id] ?? [];
}

/** Récupère les effets d'un type donné portés par un passif. */
export function effetsPassif<K extends EffetPassif['k']>(
  id: string,
  k: K,
): Extract<EffetPassif, { k: K }>[] {
  const out: Extract<EffetPassif, { k: K }>[] = [];
  for (const e of reglesPassif(id)) {
    if (e.k === k) out.push(e as Extract<EffetPassif, { k: K }>);
  }
  return out;
}
