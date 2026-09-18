/**
 * Bibles de style pour l'illustration des cartes.
 *
 * Le problème n'est pas de produire cent belles images : c'est d'en produire
 * cent qui aient l'air d'être la MÊME série. Tout ce qui garantit la cohérence
 * vit donc ici, et le prompt d'un personnage ne fournit que son sujet.
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

/**
 * Chaque bible impose le médium, la lumière, le cadrage, la palette et le
 * fond. Ce qui varie d'une carte à l'autre est strictement le sujet.
 */
export const STYLES = {
  gouache: {
    id: 'gouache',
    nom: 'Gouache de festival',
    // Affiche sérigraphiée : aplats francs, contour visible, pas de 3D.
    base:
      'illustration à la gouache sur papier, aplats de couleur francs et peu nombreux, ' +
      'contour souple à l’encre, léger grain de papier, aucune texture photographique, ' +
      'aucun rendu 3D, aucun dégradé lisse. Cadrage à mi-cuisse, personnage centré, ' +
      'regard vers le spectateur, posture assumée et légèrement comique. ' +
      'Fond uni très simple, une seule couleur désaturée, aucun décor, aucun texte. ' +
      'Palette limitée à cinq teintes. Lumière franche venant du haut à gauche.',
  },
  encre: {
    id: 'encre',
    nom: 'Encre et lavis',
    base:
      'illustration à l’encre noire et lavis d’aquarelle, trait nerveux et irrégulier, ' +
      'hachures pour les ombres, couleurs en lavis transparents débordant légèrement du trait, ' +
      'aucun rendu 3D, aucune texture photographique. Cadrage à mi-cuisse, personnage centré, ' +
      'regard vers le spectateur, posture expressive. Fond blanc cassé quasi vide avec une ' +
      'seule tache de lavis, aucun décor, aucun texte. Lumière naturelle douce.',
  },
  serigraphie: {
    id: 'serigraphie',
    nom: 'Sérigraphie deux tons',
    base:
      'sérigraphie deux tons, aplats saturés et trame de demi-ton visible, ' +
      'repérage légèrement décalé, aucun dégradé, aucun rendu 3D. ' +
      'Cadrage à mi-cuisse, personnage centré, regard vers le spectateur, silhouette lisible. ' +
      'Fond uni d’une seule couleur, aucun décor, aucun texte, aucune bordure. ' +
      'Contraste élevé, ombres en aplat.',
  },
};

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
    `${style.base}`,
    `Sujet : ${espece.nom}, « ${espece.titre} », étudiant français. ${espece.lore}`,
    `${morpho}${accessoires[a.accessoire] ?? ''}. ${roles[espece.role] ?? ''}.`,
    `Couleurs du personnage : peau ${a.peau}, cheveux ${a.cheveux}, vêtement principal ${a.tenue}, touche d’accent ${a.accent}.`,
    INTERDITS,
  ].join(' ');
}
