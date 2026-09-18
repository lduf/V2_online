/** Types partagés entre le moteur, le serveur et le client. */

/**
 * Une teinte est un registre VISUEL, pas un type de combat : elle choisit la
 * couleur et l'animation d'un sort, et rien d'autre. Il n'existe aucun tableau
 * d'efficacité entre teintes, et les personnages n'en portent pas — la
 * contre-jeu passe entièrement par les cartes (armure, amorti, statuts, tempo).
 */
export type Element = 'FEU' | 'EAU' | 'FOUDRE' | 'NATURE' | 'OMBRE' | 'LUMIERE' | 'ARCANE';

export type StatKey = 'pv' | 'atq' | 'def' | 'mag' | 'res' | 'vit' | 'chance';

export const STATS_COMBAT: readonly Exclude<StatKey, 'pv'>[] = [
  'atq',
  'def',
  'mag',
  'res',
  'vit',
  'chance',
];

export const TOUTES_STATS: readonly StatKey[] = ['pv', 'atq', 'def', 'mag', 'res', 'vit', 'chance'];

export type Role = 'MAGE' | 'BRUISER' | 'ASSASSIN' | 'SOUTIEN' | 'TANK' | 'FARCEUR';

export type Rarete = 'COMMUN' | 'RARE' | 'EPIQUE' | 'LEGENDAIRE';

export type StatutId =
  | 'BRULURE'
  | 'POISON'
  | 'GEL'
  | 'ETOURDI'
  | 'REGEN'
  | 'RAGE'
  | 'MALEDICTION'
  | 'SAIGNEMENT'
  | 'CONFUSION'
  | 'CONCENTRATION';

export type CategorieSort = 'PHYSIQUE' | 'MAGIQUE' | 'PUR' | 'SOUTIEN';

export type CibleSort = 'ENNEMI' | 'SOI';

/** Effets additionnels déclenchés après le calcul principal d'un sort. */
export type EffetSort =
  | { type: 'STATUT'; statut: StatutId; chance: number; duree: number; cible: CibleSort }
  | { type: 'BUFF'; stat: Exclude<StatKey, 'pv'>; palier: number; cible: CibleSort; chance?: number }
  | { type: 'BOUCLIER'; valeur: number }
  | { type: 'ENERGIE'; valeur: number; cible: CibleSort }
  | { type: 'DRAIN'; ratio: number }
  | { type: 'RECUL'; ratio: number }
  | { type: 'PURGE'; cible: CibleSort }
  | { type: 'RELANCE'; chance: number }
  | { type: 'MULTI'; coups: number }
  | { type: 'EXECUTION'; seuil: number; bonus: number }
  | { type: 'SOIN_FIXE'; ratioPvMax: number; cible: CibleSort };

export interface VfxSpec {
  /** Forme de l'animation jouée côté client. */
  forme:
    | 'projectile'
    | 'rayon'
    | 'impact'
    | 'aura'
    | 'balayage'
    | 'pluie'
    | 'explosion'
    | 'lien'
    | 'lame';
  /** Vitesse / intensité relative (1 = normal). */
  intensite?: number;
  /** Secousse de l'écran, en pixels. */
  secousse?: number;
}

export interface SortDef {
  id: string;
  nom: string;
  element: Element;
  rarete: Rarete;
  categorie: CategorieSort;
  cible: CibleSort;
  /** Puissance offensive brute (0 = pas de dégâts). */
  puissance: number;
  /** Puissance de soin. Négatif = le lanceur se blesse. */
  soin: number;
  /** Nombre de faces du dé : héritage direct de la V1. Plus il est grand, plus c'est risqué. */
  de: number;
  cout: number;
  recharge: number;
  precision: number;
  effets: EffetSort[];
  /**
   * Rôles capables d'apprendre ce sort, en plus des espèces qui le listent
   * explicitement dans leur `pool`. Sans ce champ, un sort tiré en booster
   * pouvait n'être équipable par personne — ce qui est intolérable dans un jeu
   * où la carte est la base.
   */
  roles?: Role[];
  texte: string;
  vfx: VfxSpec;
  prix: number;
}

export interface ItemDef {
  id: string;
  nom: string;
  rarete: Rarete;
  /** Modificateurs plats appliqués aux stats finales. */
  bonus: Partial<Record<StatKey, number>>;
  /** Effet spécial résolu par le moteur. */
  effet?: ItemEffetId;
  texte: string;
  prix: number;
  emoji: string;
}

export type ItemEffetId =
  /** Armure : retire un montant plat à CHAQUE coup encaissé. */
  | 'PLASTRON'
  /** Amorti : plafonne ce qu'un seul coup peut retirer. */
  | 'AMORTI'
  /** Immunise contre les statuts négatifs. */
  | 'ANTIDOTE'
  | 'SURVIE'
  | 'VAMPIRIQUE'
  | 'EPINES'
  | 'BATTERIE'
  | 'TALISMAN'
  | 'CHARGE'
  | 'DERNIER_SOUFFLE'
  | 'FOCUS';

export interface PassifDef {
  id: string;
  nom: string;
  texte: string;
}

export interface ArtSpec {
  /** Couleurs principales de l'avatar SVG généré côté client. */
  peau: string;
  cheveux: string;
  tenue: string;
  accent: string;
  fond: [string, string];
  /** Variante de silhouette (1..6). */
  silhouette: number;
  /** Accessoire dessiné par-dessus. */
  accessoire:
    | 'aucun'
    | 'chapeau'
    | 'casque'
    | 'couronne'
    | 'capuche'
    | 'lunettes'
    | 'cornes'
    | 'aureole'
    | 'casque_audio';
  /** Emoji de secours / marqueur d'ambiance. */
  embleme: string;
}

export interface EspeceDef {
  id: string;
  nom: string;
  titre: string;
  role: Role;
  rarete: Rarete;
  base: Record<StatKey, number>;
  passif: PassifDef;
  sortSignature: string;
  pool: string[];
  lore: string;
  art: ArtSpec;
  prix: number;
}

export interface NatureDef {
  id: string;
  nom: string;
  plus: Exclude<StatKey, 'pv'> | null;
  moins: Exclude<StatKey, 'pv'> | null;
  texte: string;
}

export type IvsPerso = Record<StatKey, number>;
export type EvsPerso = Record<StatKey, number>;

export interface IvsSort {
  puissance: number;
  precision: number;
  critique: number;
  cout: number;
}

/** Un sort possédé par un joueur : une instance unique avec ses propres gènes. */
export interface SortPossede {
  uid: string;
  defId: string;
  ivs: IvsSort;
  obtenuLe: number;
  /** Variante cosmétique « Prisme » : cadre et foil alternatifs. */
  prisme?: boolean;
}

/** Un personnage possédé : instance unique avec gènes, nature, niveau, équipement. */
export interface PersoPossede {
  uid: string;
  especeId: string;
  surnom?: string;
  niveau: number;
  xp: number;
  ivs: IvsPerso;
  evs: EvsPerso;
  natureId: string;
  /** 4 emplacements de sorts, référence vers des SortPossede.uid. */
  sorts: (string | null)[];
  itemId: string | null;
  obtenuLe: number;
  /** Variante cosmétique « Chromatique » : robe alternative et particules. */
  chromatique?: boolean;
  /** Talents choisis aux paliers 25 et 50 (voir `talents.ts`). */
  talents?: string[];
}

/** Stats finales calculées pour le combat. */
export interface StatsCalculees {
  pv: number;
  atq: number;
  def: number;
  mag: number;
  res: number;
  vit: number;
  chance: number;
}

export interface SortPret {
  uid: string;
  def: SortDef;
  ivs: IvsSort;
  /** Valeurs déjà modulées par les gènes. */
  puissance: number;
  soin: number;
  cout: number;
  precision: number;
  critique: number;
  note: number;
  grade: GradeGenes;
  prisme?: boolean;
  /** Les quatre gènes au maximum. */
  sceau?: boolean;
}

export type GradeGenes = 'D' | 'C' | 'B' | 'A' | 'S';

export interface UniteCombat {
  uid: string;
  especeId: string;
  nom: string;
  niveau: number;
  role: Role;
  passifId: string;
  talents: string[];
  itemId: string | null;
  art: ArtSpec;
  chromatique: boolean;
  sceau: boolean;
  stats: StatsCalculees;
  pv: number;
  pvMax: number;
  energie: number;
  energieMax: number;
  bouclier: number;
  paliers: Record<Exclude<StatKey, 'pv'>, number>;
  statuts: StatutActif[];
  sorts: SortPret[];
  recharges: number[];
  ko: boolean;
  /** Compteurs internes (passifs, items à usage unique). */
  flags: Record<string, number>;
}

export interface StatutActif {
  id: StatutId;
  duree: number;
  puissance: number;
}

export interface EquipeCombat {
  /** Identifiant du propriétaire (compte joueur ou bot). */
  proprietaire: string;
  nom: string;
  unites: UniteCombat[];
  actif: number;
}

export type PhaseCombat = 'CHOIX' | 'TERMINE';

/** Ce qu'un camp a accompli pendant le combat, pour les objectifs. */
export interface StatsCote {
  desParfaits: number;
  meilleurCoup: number;
  critiques: number;
  superEfficaces: number;
  changements: number;
}

export type Cote = 0 | 1;

export interface EtatCombat {
  id: string;
  seed: number;
  rng: number;
  tour: number;
  round: number;
  equipes: [EquipeCombat, EquipeCombat];
  /** File d'initiative du round courant (côtés restant à jouer). */
  file: Cote[];
  phase: PhaseCombat;
  vainqueur: Cote | null;
  motifFin: string | null;
  /** Côté devant choisir un remplaçant après un KO (ne consomme pas de tour). */
  remplacement: Cote | null;
  journal: EvtCombat[];
  /** Nombre de rounds avant match nul forcé. */
  limiteRounds: number;
  /** Compteurs par camp, alimentés au fil du combat. */
  stats: [StatsCote, StatsCote];
}

export type BattleAction =
  | { type: 'SORT'; index: number }
  | { type: 'ATTAQUE' }
  | { type: 'GARDE' }
  | { type: 'SWITCH'; index: number }
  | { type: 'ABANDON' };

/**
 * Ce que les défenses ont mangé du coup. « SUPER » = le coup est passé
 * quasi intact alors qu'il était gros : la lecture était bonne. « FAIBLE » =
 * l'armure ou l'amorti en ont avalé une grosse part.
 */
export type Efficacite = 'SUPER' | 'NEUTRE' | 'FAIBLE' | 'IMMUNISE';

export type EvtCombat =
  | { t: 'ROUND'; numero: number }
  | { t: 'TOUR'; cote: Cote; uniteUid: string }
  | { t: 'MESSAGE'; texte: string; ton?: 'info' | 'bien' | 'mal' | 'epique' }
  | { t: 'ACTION'; cote: Cote; libelle: string; sortId?: string; vfx?: VfxSpec; element?: Element }
  | { t: 'DE'; faces: number; resultat: number; coeff: number; parfait: boolean }
  | { t: 'RATE'; cote: Cote }
  | {
      t: 'DEGATS';
      cote: Cote;
      uniteUid: string;
      montant: number;
      pv: number;
      pvMax: number;
      efficacite: Efficacite;
      critique: boolean;
      absorbeBouclier: number;
    }
  | { t: 'SOIN'; cote: Cote; uniteUid: string; montant: number; pv: number; pvMax: number }
  | { t: 'BOUCLIER'; cote: Cote; uniteUid: string; valeur: number }
  | { t: 'ENERGIE'; cote: Cote; uniteUid: string; valeur: number; total: number }
  | { t: 'STATUT'; cote: Cote; uniteUid: string; statut: StatutId; ajoute: boolean }
  | { t: 'PALIER'; cote: Cote; uniteUid: string; stat: Exclude<StatKey, 'pv'>; delta: number }
  | { t: 'KO'; cote: Cote; uniteUid: string }
  | { t: 'SWITCH'; cote: Cote; versUid: string; deUid: string }
  | { t: 'PASSIF'; cote: Cote; uniteUid: string; nom: string }
  | { t: 'FIN'; vainqueur: Cote | null; motif: string };

/**
 * Lecture publique de la défense d'une unité. Volontairement grossière : on
 * montre le profil, pas les chiffres exacts de l'adversaire. C'est ce qui
 * remplace le tableau des types — savoir si on a en face une armure épaisse
 * (qui lamine les sorts à coups multiples) ou un amorti (qui désamorce les
 * grosses bombes).
 */
export interface ProfilDefense {
  /** Armure contre les attaques physiques. */
  armurePhysique: NiveauDefense;
  /** Armure contre les attaques magiques. */
  armureMagique: NiveauDefense;
  /** L'unité plafonne-t-elle les gros coups ? */
  amorti: boolean;
  /** L'unité résiste-t-elle aux statuts ? */
  antidote: boolean;
}

export type NiveauDefense = 'FAIBLE' | 'MOYENNE' | 'FORTE';

/** Vue publique d'une unité (ce que le client adverse a le droit de voir). */
export interface UnitePublique {
  uid: string;
  especeId: string;
  nom: string;
  niveau: number;
  role: Role;
  art: ArtSpec;
  chromatique: boolean;
  sceau: boolean;
  pv: number;
  pvMax: number;
  energie: number;
  energieMax: number;
  bouclier: number;
  paliers: Record<Exclude<StatKey, 'pv'>, number>;
  statuts: StatutActif[];
  ko: boolean;
  itemId: string | null;
  passifId: string;
  talents: string[];
  profil: ProfilDefense;
  /** Renseigné uniquement pour l'équipe du destinataire. */
  sorts?: SortPret[];
  recharges?: number[];
  stats?: StatsCalculees;
}

export interface VueCombat {
  id: string;
  round: number;
  tour: number;
  phase: PhaseCombat;
  vainqueur: Cote | null;
  motifFin: string | null;
  /** Côté du joueur qui reçoit cette vue. */
  moi: Cote;
  /** Côté qui doit jouer maintenant. */
  auTour: Cote | null;
  /** Si renseigné, ce côté doit d'abord envoyer une action SWITCH. */
  remplacement: Cote | null;
  equipes: [
    { proprietaire: string; nom: string; actif: number; unites: UnitePublique[] },
    { proprietaire: string; nom: string; actif: number; unites: UnitePublique[] },
  ];
  limiteRounds: number;
}
