import type { CategorieSort, PersoPossede, Role, StatKey } from './types.js';
import { getEspece } from './data/especes.js';

/**
 * Les talents sont la récompense de la montée en niveau.
 *
 * Monter de 24 à 25 ne changeait rien d'autre que quelques points de stats ;
 * désormais ça pose une question. Chaque personnage ouvre un choix entre deux
 * talents au niveau 25, puis un second au niveau 50 — et les deux options d'un
 * palier tirent volontairement dans des directions opposées, pour que deux
 * exemplaires de la même espèce ne se jouent pas pareil.
 *
 * Les talents sont propres au rôle, pas à l'espèce : c'est ce qui permet d'en
 * écrire vingt-quatre plutôt que deux cents, et ça donne au rôle une identité
 * lisible au-delà de la répartition des stats.
 */

export const PALIERS_TALENT = [25, 50] as const;
export type PalierTalent = (typeof PALIERS_TALENT)[number];

/** Condition d'activation d'un bonus de dégâts. */
export type QuandTalent =
  | 'TOUJOURS'
  | 'PV_BAS'
  | 'PV_HAUT'
  | 'PREMIER_TOUR'
  | 'DE_HAUT'
  | 'CIBLE_ENTAMEE';

export type EffetTalent =
  /** Modificateur permanent sur une ou plusieurs stats, en pourcentage. */
  | { k: 'STAT'; stats: Partial<Record<StatKey, number>> }
  /** Bonus de dégâts infligés, éventuellement conditionné. */
  | { k: 'DEGATS'; pct: number; quand?: QuandTalent; categorie?: CategorieSort }
  /** Réduction des dégâts encaissés. */
  | { k: 'ENCAISSE'; pct: number; categorie?: CategorieSort }
  /** Points de chance de coup critique. */
  | { k: 'CRIT'; pts: number }
  /** Points de précision. */
  | { k: 'PRECISION'; pts: number }
  /** Le jet de dé ne descend jamais sous ce ratio du maximum. */
  | { k: 'DE_PLANCHER'; ratio: number }
  /** Énergie supplémentaire à chaque début de tour. */
  | { k: 'ENERGIE'; parTour: number }
  /** Bonus aux soins reçus et prodigués. */
  | { k: 'SOIN'; pct: number }
  /** Vol de vie sur les dégâts infligés. */
  | { k: 'VAMPIRE'; ratio: number }
  /** Renvoi de dégâts à l'attaquant. */
  | { k: 'EPINES'; ratio: number; categorie?: CategorieSort }
  /** Armure supplémentaire, en part des PV max, retirée à chaque coup. */
  | { k: 'ARMURE'; ratio: number }
  /** Plafond de dégâts par coup, en part des PV max. */
  | { k: 'AMORTI'; ratio: number }
  /** Points ajoutés à la chance d'infliger un statut. */
  | { k: 'STATUT'; pts: number }
  /** Survit une fois par combat à un coup fatal, avec 1 PV. */
  | { k: 'SURVIE' }
  /** Purge les statuts négatifs en entrant sur le terrain. */
  | { k: 'ENTREE_PURGE' }
  /** Bouclier gagné en entrant sur le terrain, en part des PV max. */
  | { k: 'ENTREE_BOUCLIER'; ratio: number };

export interface TalentDef {
  id: string;
  nom: string;
  texte: string;
  role: Role;
  palier: PalierTalent;
  effets: EffetTalent[];
}

export const TALENTS: TalentDef[] = [
  // ───────────────────────────── Mage ─────────────────────────────
  {
    id: 'mage_these',
    nom: 'Thèse Approfondie',
    texte: '+14 % de dégâts magiques.',
    role: 'MAGE',
    palier: 25,
    effets: [{ k: 'DEGATS', pct: 14, categorie: 'MAGIQUE' }],
  },
  {
    id: 'mage_bourse',
    nom: 'Bourse d’Étude',
    texte: '+10 énergie à chaque tour.',
    role: 'MAGE',
    palier: 25,
    effets: [{ k: 'ENERGIE', parTour: 10 }],
  },
  {
    id: 'mage_publication',
    nom: 'Publication',
    texte: '+18 points de critique.',
    role: 'MAGE',
    palier: 50,
    effets: [{ k: 'CRIT', pts: 18 }],
  },
  {
    id: 'mage_soutenance',
    nom: 'Soutenance Blanche',
    texte: 'Le dé ne descend jamais sous 66 % de sa face maximale.',
    role: 'MAGE',
    palier: 50,
    effets: [{ k: 'DE_PLANCHER', ratio: 0.66 }],
  },

  // ─────────────────────────── Bruiser ───────────────────────────
  {
    id: 'bruiser_stade',
    nom: 'Endurance de Stade',
    texte: '+9 % de PV max.',
    role: 'BRUISER',
    palier: 25,
    effets: [{ k: 'STAT', stats: { pv: 9 } }],
  },
  {
    id: 'bruiser_pression',
    nom: 'Coup de Pression',
    texte: '+14 % de dégâts physiques.',
    role: 'BRUISER',
    palier: 25,
    effets: [{ k: 'DEGATS', pct: 14, categorie: 'PHYSIQUE' }],
  },
  {
    id: 'bruiser_rattrapage',
    nom: 'Session de Rattrapage',
    texte: 'Survit une fois par combat à un coup fatal, avec 1 PV.',
    role: 'BRUISER',
    palier: 50,
    effets: [{ k: 'SURVIE' }],
  },
  {
    id: 'bruiser_acharnement',
    nom: 'Acharnement',
    texte: '+40 % de dégâts sous 50 % de PV.',
    role: 'BRUISER',
    palier: 50,
    effets: [{ k: 'DEGATS', pct: 40, quand: 'PV_BAS' }],
  },

  // ─────────────────────────── Assassin ───────────────────────────
  {
    id: 'assassin_entree',
    nom: 'Entrée Fracassante',
    texte: '+22 % de dégâts au premier tour sur le terrain.',
    role: 'ASSASSIN',
    palier: 25,
    effets: [{ k: 'DEGATS', pct: 22, quand: 'PREMIER_TOUR' }],
  },
  {
    id: 'assassin_lame',
    nom: 'Lame Affûtée',
    texte: '+10 points de critique et +5 de précision.',
    role: 'ASSASSIN',
    palier: 25,
    effets: [
      { k: 'CRIT', pts: 10 },
      { k: 'PRECISION', pts: 5 },
    ],
  },
  {
    id: 'assassin_curee',
    nom: 'Curée',
    texte: '+20 % de dégâts sur une cible déjà sous la moitié de ses PV.',
    role: 'ASSASSIN',
    palier: 50,
    effets: [{ k: 'DEGATS', pct: 20, quand: 'CIBLE_ENTAMEE' }],
  },
  {
    id: 'assassin_vampirisme',
    nom: 'Vampirisme',
    texte: 'Récupère 13 % des dégâts infligés.',
    role: 'ASSASSIN',
    palier: 50,
    effets: [{ k: 'VAMPIRE', ratio: 0.13 }],
  },

  // ─────────────────────────── Soutien ───────────────────────────
  {
    id: 'soutien_fiches',
    nom: 'Fiches de Révision',
    texte: '+20 % aux soins reçus.',
    role: 'SOUTIEN',
    palier: 25,
    effets: [{ k: 'SOIN', pct: 20 }],
  },
  {
    id: 'soutien_cafe',
    nom: 'Café Partagé',
    texte: '+9 énergie à chaque tour.',
    role: 'SOUTIEN',
    palier: 25,
    effets: [{ k: 'ENERGIE', parTour: 9 }],
  },
  {
    id: 'soutien_infirmerie',
    nom: 'Passage à l’Infirmerie',
    texte: 'Purge les statuts négatifs en entrant sur le terrain.',
    role: 'SOUTIEN',
    palier: 50,
    effets: [{ k: 'ENTREE_PURGE' }],
  },
  {
    id: 'soutien_polycopie',
    nom: 'Polycopié Relié',
    texte: '+12 % de DEF et de RES.',
    role: 'SOUTIEN',
    palier: 50,
    effets: [{ k: 'STAT', stats: { def: 12, res: 12 } }],
  },

  // ───────────────────────────── Tank ─────────────────────────────
  {
    id: 'tank_amphi',
    nom: 'Amphi Blindé',
    texte: '−12 % de dégâts physiques encaissés.',
    role: 'TANK',
    palier: 25,
    effets: [{ k: 'ENCAISSE', pct: 12, categorie: 'PHYSIQUE' }],
  },
  {
    id: 'tank_masse',
    nom: 'Masse Critique',
    texte: '+11 % de PV max.',
    role: 'TANK',
    palier: 25,
    effets: [{ k: 'STAT', stats: { pv: 11 } }],
  },
  {
    id: 'tank_contre',
    nom: 'Contre-Argument',
    texte: 'Renvoie 18 % des dégâts encaissés et gagne 1,5 % de PV max d’armure.',
    role: 'TANK',
    palier: 50,
    effets: [
      { k: 'EPINES', ratio: 0.18 },
      { k: 'ARMURE', ratio: 0.015 },
    ],
  },
  {
    id: 'tank_mur',
    nom: 'Tout Sauf Ça',
    texte: 'Aucun coup ne peut te retirer plus de 13 % de tes PV max.',
    role: 'TANK',
    palier: 50,
    effets: [{ k: 'AMORTI', ratio: 0.13 }],
  },

  // ─────────────────────────── Farceur ───────────────────────────
  {
    id: 'farceur_de_truque',
    nom: 'Dé Truqué',
    texte: 'Le dé ne descend jamais sous 62 % de sa face maximale.',
    role: 'FARCEUR',
    palier: 25,
    effets: [{ k: 'DE_PLANCHER', ratio: 0.62 }],
  },
  {
    id: 'farceur_bizutage',
    nom: 'Bizutage',
    texte: '+16 points de chance d’infliger un statut.',
    role: 'FARCEUR',
    palier: 25,
    effets: [{ k: 'STATUT', pts: 16 }],
  },
  {
    id: 'farceur_coup_du_sort',
    nom: 'Coup du Sort',
    texte: '+22 % de dégâts quand le dé dépasse 80 % de sa face maximale.',
    role: 'FARCEUR',
    palier: 50,
    effets: [{ k: 'DEGATS', pct: 22, quand: 'DE_HAUT' }],
  },
  {
    id: 'farceur_insolence',
    nom: 'Chance Insolente',
    texte: '+16 % de CHANCE et +7 de précision.',
    role: 'FARCEUR',
    palier: 50,
    effets: [
      { k: 'STAT', stats: { chance: 16 } },
      { k: 'PRECISION', pts: 7 },
    ],
  },
];

export const TALENTS_PAR_ID: Record<string, TalentDef> = Object.fromEntries(
  TALENTS.map((t) => [t.id, t]),
);

/** Les deux options offertes à ce rôle pour ce palier. */
export function choixTalents(role: Role, palier: PalierTalent): TalentDef[] {
  return TALENTS.filter((t) => t.role === role && t.palier === palier);
}

/** Coût, en essence, pour rendre son choix et le refaire. */
export const COUT_RESPEC_TALENT = 150;

export interface EtatTalents {
  palier: PalierTalent;
  /** Le personnage a-t-il atteint le niveau requis ? */
  debloque: boolean;
  choix: TalentDef[];
  choisi: TalentDef | null;
}

/** Vue complète des paliers d'un personnage, pour l'Atelier. */
export function talentsDuPerso(perso: PersoPossede): EtatTalents[] {
  const role = getEspece(perso.especeId).role;
  const pris = perso.talents ?? [];
  return PALIERS_TALENT.map((palier) => {
    const choix = choixTalents(role, palier);
    const choisi = choix.find((t) => pris.includes(t.id)) ?? null;
    return { palier, debloque: perso.niveau >= palier, choix, choisi };
  });
}

/** Un palier atteint mais pas encore dépensé : c'est ce qui met une pastille sur l'onglet. */
export function talentsEnAttente(perso: PersoPossede): number {
  return talentsDuPerso(perso).filter((t) => t.debloque && !t.choisi).length;
}

/** Les définitions correspondant aux ids stockés, dans l'ordre des paliers. */
export function talentsActifs(ids: readonly string[] | undefined): TalentDef[] {
  if (!ids?.length) return [];
  return ids.map((id) => TALENTS_PAR_ID[id]).filter((t): t is TalentDef => !!t);
}

/**
 * Récupère les effets d'un type donné portés par une unité. Le moteur appelle
 * ça à chaque point d'accroche ; la liste est courte (deux talents au plus),
 * donc la recherche linéaire est sans conséquence.
 */
export function effetsTalents<K extends EffetTalent['k']>(
  ids: readonly string[] | undefined,
  k: K,
): Extract<EffetTalent, { k: K }>[] {
  const out: Extract<EffetTalent, { k: K }>[] = [];
  for (const t of talentsActifs(ids)) {
    for (const e of t.effets) {
      if (e.k === k) out.push(e as Extract<EffetTalent, { k: K }>);
    }
  }
  return out;
}
