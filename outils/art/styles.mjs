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
 * Le full art n'est pas la bible standard en plus grand.
 *
 * Les trois bibles ci-dessus interdisent explicitement le rendu 3D, les
 * dégradés lisses et la texture photographique : c'est ce qui les rend
 * lisibles dans une vignette de 112 px et cohérentes sur vingt-huit cartes.
 * C'est aussi ce qui les rend plates en grand. Un reflet, c'est un dégradé
 * lisse ; une lumière spéculaire, c'est du rendu. Dériver le full art du
 * médium plat revenait donc à interdire par construction ce qu'on lui
 * demande.
 *
 * Les bibles de prestige ci-dessous partent donc de l'autre bout : peinture
 * numérique rendue, lumière dramatique, matières qui accrochent la lumière,
 * profondeur de champ. Elles ne ressemblent pas aux vignettes, et c'est la
 * convention du genre — la carte « alternate art » d'un jeu de cartes n'est
 * jamais la version agrandie de la carte normale. Ce qui raccroche les deux,
 * c'est le cadre de rareté et la palette du personnage, pas le médium.
 *
 * Le comique, lui, ne bouge pas : c'est l'écart entre le traitement épique et
 * le sujet — un étudiant, un kebab, une laverie, un amphi — qui fait la
 * blague. Traiter la vie étudiante française comme une fresque de cathédrale
 * est la blague ; retirer le kebab la tuerait.
 *
 * Trois contraintes viennent de la carte elle-même, pas du goût :
 *
 * 1. Le format. Le modèle ignore `size` et `aspect_ratio` — vérifié : il rend
 *    du 1024² quoi qu'on lui envoie. Ce qui marche, c'est de le dire dans le
 *    texte, et « format portrait 3:4 » donne du 896×1200. Mais seulement si
 *    c'est la PREMIÈRE chose du prompt : la même phrase en deuxième position,
 *    noyée dans la bible, redonne du carré. D'où `entete`, qui passe avant
 *    tout. Et il faut aussi cesser d'envoyer `size`, qui épingle le carré
 *    par-dessus la consigne — d'où `taille: null` sur le profil plein.
 *    Le 5:7 de la carte n'existe pas chez les modèles d'image ; on prend le
 *    plus proche et sharp recadre (39 px de large en moins, rien de visible).
 * 2. Les marges de texte. Le nom passe en surimpression en haut, les stats et
 *    le texte de passif en bas. Si le visage occupe cette zone, le bandeau le
 *    coupe. On demande donc un tiers supérieur et un tiers inférieur calmes —
 *    et c'est là que la lumière d'ambiance travaille, pas le sujet.
 * 3. Le bord à bord. Aucune bordure, aucun cadre peint : le cadre, c'est le
 *    composant Carte qui le fournit, et un second cadre dans l'image donne
 *    l'effet « capture d'écran collée ».
 */

// Le format, et rien d'autre : c'est la première phrase que lit le modèle.
const FORMAT_PLEIN =
  'IMAGE VERTICALE AU FORMAT PORTRAIT 3:4, nettement plus haute que large.';

/**
 * Le socle de rendu commun aux trois bibles de prestige.
 *
 * C'est exactement ce que les bibles plates interdisent. On le dit une fois
 * ici plutôt que trois fois plus bas, pour que « monter le niveau de rendu »
 * reste une modification d'une seule ligne.
 */
const RENDU_PRESTIGE =
  'Peinture numérique richement rendue, qualité illustration de couverture, ' +
  'modelé complet des volumes, dégradés doux, lumière spéculaire marquée, ' +
  'reflets nets sur les matières qui accrochent — métal, verre, vernis, cuir, ' +
  'tissu satiné, surfaces mouillées. Éclairage cinématographique à trois ' +
  'sources : une clé forte, un contre-jour qui détoure le personnage d’un ' +
  'liseré lumineux, un rebond coloré. Profondeur de champ, arrière-plan ' +
  'légèrement flou, particules de lumière en suspension. Micro-détail sur les ' +
  'matières, aucune texture photographique ni collage de photo.';

/**
 * L'exubérance : elle se joue dans la mise en scène, pas dans le rendu.
 *
 * Une belle lumière sur quelqu'un debout les bras ballants reste une photo
 * d'identité bien éclairée. Ce qui rend une carte de prestige impressionnante,
 * c'est le mouvement — le tissu qui claque, la contre-plongée, le geste tenu
 * une fraction de seconde avant la chute.
 */
const MISE_EN_SCENE_PLEINE =
  'Mise en scène spectaculaire et théâtrale : pose ample et assumée, geste ' +
  'large saisi en plein mouvement, vêtement et cheveux emportés par le ' +
  'déplacement. Légère contre-plongée, qui rend le personnage monumental. ' +
  'Composition en diagonale, lignes de fuite qui convergent vers le visage. ' +
  'Un accessoire du quotidien étudiant brandi comme une arme légendaire, ' +
  'traité avec le plus grand sérieux.';

const CADRAGE_PLEIN =
  'Composition pleine page bord à bord, le décor va jusqu’aux quatre bords. ' +
  'Personnage en pied ou aux trois quarts, légèrement décentré, occupant le ' +
  'tiers central de la hauteur, regard planté dans celui du spectateur. ' +
  // Deux images sur six sortaient en paysage collé au centre d'un canevas
  // vertical, avec des bandes au-dessus et au-dessous. Le format du fichier
  // était pourtant bon : c'est la composition qui était en 16:9.
  'L’illustration remplit entièrement le cadre vertical, de haut en bas : ' +
  'aucune bande noire, aucun letterboxing, aucune marge, aucun bord vide, ' +
  'aucune scène en paysage insérée dans un cadre plus haut.';

const FOND_PLEIN =
  'Décor de vie étudiante française immédiatement reconnaissable, mais traité ' +
  'en arrière-plan : formes simplifiées, valeurs sourdes, flou de profondeur, ' +
  'pour ne jamais manger le personnage. Aucune bordure, aucun cadre peint, ' +
  'aucun liseré, aucun texte.';

const MARGES_PLEIN =
  'Le tiers supérieur et le tiers inférieur de l’image restent calmes et peu ' +
  'contrastés — halo, brume, sol sombre, dégradé d’ambiance — pour laisser de ' +
  'la place à du texte en surimpression. Rien d’important ne s’y trouve, et ' +
  'surtout pas le visage ni les mains.';

/**
 * Trois directions de prestige, à départager.
 *
 * Elles ne varient pas par le médium — il est commun — mais par la LUMIÈRE et
 * le décor, qui est ce qui se voit d'abord sur une carte de 268 px. Chacune
 * prend un moment de la vie étudiante et le traite comme une scène d'épopée.
 */
const PRESTIGES = {
  neon: {
    nom: 'Néon et bitume',
    lumiere:
      'Scène de nuit après la soirée. Lumière de néons saturés — rose, cyan, ' +
      'orange kebab — en sources multiples. Pluie fine, bitume trempé qui ' +
      'renvoie les enseignes en reflets étirés, flaques miroir, halos humides ' +
      'autour des lampadaires, buée. Noirs profonds, couleurs électriques, ' +
      'fort contraste. Décor : rue de centre-ville, grec ouvert la nuit, ' +
      'arrêt de tram, devanture de laverie.',
  },
  vitrail: {
    nom: 'Amphi cathédrale',
    lumiere:
      'Lumière volumétrique de fin d’après-midi traversant de hautes verrières, ' +
      'rayons obliques matérialisés dans la poussière en suspension, halo doré ' +
      'derrière la tête. Palette chaude et solennelle, ors, ocres, bordeaux, ' +
      'ombres profondes et transparentes. Traitement de retable. Décor : ' +
      'amphithéâtre monumental, bibliothèque universitaire, grand escalier ' +
      'de faculté, gradins vides.',
  },
  orage: {
    nom: 'Orage de partiels',
    lumiere:
      'Éclairage violent et instable de veille d’examen : contre-jour éclatant ' +
      'qui détoure le personnage d’un liseré blanc, éclair froid sur un côté, ' +
      'lumière chaude de lampe de bureau sur l’autre. Vent, papiers et feuilles ' +
      'de cours arrachés qui tourbillonnent, étincelles, énergie visible. ' +
      'Contraste extrême, palette froide percée d’un accent chaud. Décor : ' +
      'salle d’examen, couloir de résidence universitaire, toit de bâtiment, ' +
      'ciel de tempête.',
  },
};

/**
 * Bibles full art, une par direction de prestige.
 *
 * `medium` est commun : ce qui distingue les trois, c'est la lumière et le
 * décor. Choisir, ici, c'est choisir une ambiance, pas une technique.
 */
export const STYLES_PLEINS = Object.fromEntries(
  Object.entries(PRESTIGES).map(([id, p]) => [
    `pleine-${id}`,
    {
      id: `pleine-${id}`,
      nom: `${p.nom} — full art`,
      medium: RENDU_PRESTIGE,
      entete: FORMAT_PLEIN,
      /** Les poses de prestige remplacent les postures sobres du jeu de base. */
      prestige: true,
      base: [
        RENDU_PRESTIGE,
        p.lumiere,
        MISE_EN_SCENE_PLEINE,
        CADRAGE_PLEIN,
        FOND_PLEIN,
        MARGES_PLEIN,
      ].join(' '),
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

  // Postures du traitement standard : sobres, parce qu'une vignette de 112 px
  // ne lit qu'une silhouette. Un geste ample y devient une tache.
  const roles = {
    MAGE: 'posture concentrée, mains en avant',
    BRUISER: 'posture de garde, épaules basses',
    ASSASSIN: 'posture ramassée, prêt à bondir',
    SOUTIEN: 'posture ouverte, bras accueillants',
    TANK: 'posture plantée, bras croisés',
    FARCEUR: 'posture désinvolte, sourire en coin',
  };

  // En full art la carte entière est l'image : la silhouette a la place de
  // raconter quelque chose, donc elle raconte quelque chose.
  const rolesPrestige = {
    MAGE:
      'bras levés en plein incantation, mains ouvertes d’où jaillit une énergie ' +
      'lumineuse, manches qui retombent, visage éclairé par en dessous',
    BRUISER:
      'élan de frappe saisi à mi-course, torse pivoté, poing en avant, souffle ' +
      'de déplacement derrière lui, mâchoire serrée',
    ASSASSIN:
      'en suspension, une jambe repliée, retombant vers le spectateur depuis un ' +
      'point haut, manteau déployé en corolle, regard perçant sous la capuche',
    SOUTIEN:
      'bras grands ouverts en croix, tête légèrement rejetée en arrière, dôme de ' +
      'lumière protecteur qui se déploie autour de lui',
    TANK:
      'planté jambes écartées, épaule en avant, encaissant un choc qui fait ' +
      'gicler la lumière et la poussière sur ses flancs, immobile',
    FARCEUR:
      'en plein éclat de rire, un pied en l’air, buste cambré, pirouette ' +
      'insolente, doigt pointé vers le spectateur',
  };

  return [
    // `entete` passe avant tout le reste : le full art y met sa consigne de
    // format, que le modèle n'applique qu'en première position.
    style.entete,
    `${style.base}`,
    `Sujet : ${espece.nom}, « ${espece.titre} », étudiant français. ${espece.lore}`,
    `${morpho}${accessoires[a.accessoire] ?? ''}. ${(style.prestige ? rolesPrestige : roles)[espece.role] ?? ''}.`,
    `Couleurs du personnage : peau ${a.peau}, cheveux ${a.cheveux}, vêtement principal ${a.tenue}, touche d’accent ${a.accent}.`,
    INTERDITS,
  ]
    .filter(Boolean)
    .join(' ');
}
