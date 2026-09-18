/**
 * Bibles de style pour l'illustration des cartes.
 *
 * Le problème n'est pas de produire cent belles images : c'est d'en produire
 * cent qui aient l'air d'être la MÊME série. Tout ce qui garantit la cohérence
 * vit donc ici, et le prompt d'un personnage ne fournit que son sujet.
 *
 * Une bible est découpée en quatre morceaux — médium, cadrage, fond, lumière —
 * parce que le traitement « full art » garde le médium et remplace les trois
 * autres. Sans ce découpage il faudrait réécrire trois bibles complètes, et
 * elles dériveraient les unes des autres à la première retouche.
 *
 * On valide sur six sujets identiques avant de lancer le lot complet.
 */

/** Les six sujets de validation : un par rôle, pour couvrir les silhouettes. */
export const SUJETS_TEST = [
  'maxence',
  'ondine',
  'brigitte',
  'vlad',
  'zora',
  'ignis',
];

/** Les deux sujets de la maquette full art : le prestige, donc le haut du panier. */
export const SUJETS_PLEINS = ['zora', 'ignis'];

/**
 * Chaque bible impose le médium, la lumière, le cadrage, la palette et le
 * fond. Ce qui varie d'une carte à l'autre est strictement le sujet.
 */
const BIBLES = {
  gouache: {
    id: 'gouache',
    nom: 'Gouache de festival',
    // Affiche sérigraphiée : aplats francs, contour visible, pas de 3D.
    medium:
      'illustration à la gouache sur papier, aplats de couleur francs et peu nombreux, ' +
      'contour souple à l’encre, léger grain de papier, aucune texture photographique, ' +
      'aucun rendu 3D, aucun dégradé lisse.',
    cadrage:
      'Cadrage à mi-cuisse, personnage centré, regard vers le spectateur, ' +
      'posture assumée et légèrement comique.',
    fond: 'Fond uni très simple, une seule couleur désaturée, aucun décor, aucun texte.',
    lumiere: 'Palette limitée à cinq teintes. Lumière franche venant du haut à gauche.',
  },
  encre: {
    id: 'encre',
    nom: 'Encre et lavis',
    medium:
      'illustration à l’encre noire et lavis d’aquarelle, trait nerveux et irrégulier, ' +
      'hachures pour les ombres, couleurs en lavis transparents débordant légèrement du trait, ' +
      'aucun rendu 3D, aucune texture photographique.',
    cadrage:
      'Cadrage à mi-cuisse, personnage centré, regard vers le spectateur, posture expressive.',
    fond:
      'Fond blanc cassé quasi vide avec une seule tache de lavis, aucun décor, aucun texte.',
    lumiere: 'Lumière naturelle douce.',
  },
  serigraphie: {
    id: 'serigraphie',
    nom: 'Sérigraphie deux tons',
    medium:
      'sérigraphie deux tons, aplats saturés et trame de demi-ton visible, ' +
      'repérage légèrement décalé, aucun dégradé, aucun rendu 3D.',
    cadrage:
      'Cadrage à mi-cuisse, personnage centré, regard vers le spectateur, silhouette lisible.',
    fond: 'Fond uni d’une seule couleur, aucun décor, aucun texte, aucune bordure.',
    lumiere: 'Contraste élevé, ombres en aplat.',
  },
};

/** Recompose la consigne complète d'une bible à partir de ses morceaux. */
function composer(b) {
  return [b.medium, b.cadrage, b.fond, b.lumiere].join(' ');
}

/** Les bibles du traitement standard : illustration au centre du cadre. */
export const STYLES = Object.fromEntries(
  Object.entries(BIBLES).map(([id, b]) => [id, { ...b, base: composer(b) }]),
);

// ─────────────────────────── Le traitement full art ───────────────────────────

/**
 * Ce que le full art change, et pourquoi.
 *
 * Le prompt standard demande un fond uni et un cadrage à mi-cuisse : c'est
 * exactement ce qu'il faut pour une vignette carrée posée au milieu d'un
 * cadre, et exactement ce qu'il ne faut pas quand l'image EST la carte. Sans
 * décor, le bord à bord n'a rien à montrer ; à mi-cuisse, un format 5:7 laisse
 * un vide en bas.
 *
 * Trois contraintes viennent de la carte elle-même, pas du goût :
 *
 * 1. Le format. Le modèle ignore `size` et `aspect_ratio` — vérifié : il rend
 *    du 1024² quoi qu'on lui envoie. Ce qui marche, c'est de le dire dans le
 *    texte, et « format portrait 3:4 » donne du 896×1200. Mais seulement si
 *    c'est la PREMIÈRE chose du prompt : la même phrase en deuxième position,
 *    noyée dans la bible, redonne du carré. D'où `entete`, qui passe avant le
 *    médium. Le 5:7 de la carte n'existe pas chez les modèles d'image ; on
 *    prend le plus proche et sharp recadre (39 px de large en moins, rien de
 *    visible).
 * 2. Les marges de texte. Le nom passe en surimpression en haut, les stats et
 *    le texte de passif en bas. Si le visage occupe cette zone, le bandeau le
 *    coupe. On demande donc un tiers supérieur et un tiers inférieur calmes.
 * 3. Le bord à bord. Aucune bordure, aucun cadre peint : le cadre, c'est le
 *    composant Carte qui le fournit, et un second cadre dans l'image donne
 *    l'effet « capture d'écran collée ».
 */
// Le format, et rien d'autre : c'est la première phrase que lit le modèle.
const FORMAT_PLEIN =
  'IMAGE VERTICALE AU FORMAT PORTRAIT 3:4, nettement plus haute que large.';

const CADRAGE_PLEIN =
  'Composition pleine page bord à bord, le décor va jusqu’aux quatre bords. ' +
  'Personnage en pied ou aux trois quarts, légèrement décentré, occupant le tiers ' +
  'central de la hauteur, regard vers le spectateur.';

const FOND_PLEIN =
  'Décor de vie étudiante française reconnaissable et lisible mais traité en ' +
  'arrière-plan simplifié, peu de détails, valeurs sourdes pour ne pas manger ' +
  'le personnage. Aucune bordure, aucun cadre peint, aucun liseré, aucun texte.';

const MARGES_PLEIN =
  'Le tiers supérieur et le tiers inférieur de l’image restent calmes et peu ' +
  'contrastés : du ciel, du mur, du sol, de la brume — de la place pour du texte ' +
  'en surimpression. Rien d’important ne s’y trouve.';

/**
 * Bibles full art, une par médium.
 *
 * Le cadrage est orthogonal au médium : si on choisit la gouache pour la
 * série, on veut le full art en gouache. Dériver plutôt que réécrire garantit
 * que les deux traitements restent la même série.
 */
export const STYLES_PLEINS = Object.fromEntries(
  Object.entries(BIBLES).map(([id, b]) => [
    `pleine-${id}`,
    {
      id: `pleine-${id}`,
      nom: `${b.nom} — full art`,
      medium: b.medium,
      entete: FORMAT_PLEIN,
      base: [b.medium, CADRAGE_PLEIN, FOND_PLEIN, MARGES_PLEIN, b.lumiere].join(' '),
    },
  ]),
);

/** Ce qu'on ne veut jamais voir, quel que soit le style. */
export const INTERDITS =
  'Sans texte, sans lettres, sans chiffres, sans filigrane, sans logo, sans cadre, ' +
  'sans bordure décorative, sans collage de plusieurs images, sans personnage multiple, ' +
  'sans mains déformées, sans arme à feu.';

/**
 * Construit le prompt d'un personnage. L'identité visuelle vient de la fiche
 * d'art déjà présente dans le moteur (couleurs, silhouette, accessoire), ce
 * qui garantit que l'illustration et l'avatar procédural parlent du même
 * personnage.
 */
export function promptPersonnage(espece, style) {
  const a = espece.art;
  const morpho = {
    1: 'silhouette élancée',
    2: 'silhouette athlétique',
    3: 'silhouette longiligne',
    4: 'silhouette massive et large d’épaules',
    5: 'silhouette nerveuse et sèche',
    6: 'silhouette ample, vêtement long',
  }[a.silhouette] ?? 'silhouette moyenne';

  const accessoires = {
    aucun: '',
    chapeau: ', porte un chapeau',
    casque: ', porte un casque',
    couronne: ', porte une couronne',
    capuche: ', capuche relevée',
    lunettes: ', porte des lunettes',
    cornes: ', petites cornes',
    aureole: ', fine auréole au-dessus de la tête',
    casque_audio: ', casque audio autour du cou',
  };

  const roles = {
    MAGE: 'posture concentrée, mains en avant',
    BRUISER: 'posture de garde, épaules basses',
    ASSASSIN: 'posture ramassée, prêt à bondir',
    SOUTIEN: 'posture ouverte, bras accueillants',
    TANK: 'posture plantée, bras croisés',
    FARCEUR: 'posture désinvolte, sourire en coin',
  };

  return [
    // `entete` passe avant tout le reste : le full art y met sa consigne de
    // format, que le modèle n'applique qu'en première position.
    style.entete,
    `${style.base}`,
    `Sujet : ${espece.nom}, « ${espece.titre} », étudiant français. ${espece.lore}`,
    `${morpho}${accessoires[a.accessoire] ?? ''}. ${roles[espece.role] ?? ''}.`,
    `Couleurs du personnage : peau ${a.peau}, cheveux ${a.cheveux}, vêtement principal ${a.tenue}, touche d’accent ${a.accent}.`,
    INTERDITS,
  ]
    .filter(Boolean)
    .join(' ');
}
