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
 * Premier essai : partir de l'autre bout, en peinture numérique pleinement
 * rendue. Impressionnant, et immédiatement reconnaissable comme une image
 * générée — voir SANS_TICS_IA plus bas, qui liste pourquoi.
 *
 * Les bibles ci-dessous cherchent l'entre-deux : garder du plat rendu la
 * technique visible et la palette limitée, prendre du rendu le décor, la
 * lumière et la profondeur. Elles ne ressemblent pas aux vignettes, et c'est
 * la convention du genre — la carte « alternate art » d'un jeu de cartes
 * n'est jamais la version agrandie de la carte normale. Ce qui raccroche les
 * deux, c'est le cadre de rareté et la palette du personnage, pas le médium.
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
 * Ce qui fait qu'une image « sent l'IA », et comment l'éviter.
 *
 * Premier essai : peinture numérique rendue, éclairage cinématographique à
 * trois sources, contre-jour qui détoure, particules en suspension, bokeh.
 * Résultat impressionnant et immédiatement reconnaissable comme une image
 * générée — parce que c'est précisément la liste des tics de l'illustration
 * générée. Ce n'est pas un défaut d'exécution, c'est le brief qui les
 * demandait un par un.
 *
 * Le dénominateur commun de ces tics : l'absence de main. Aucun outil n'est
 * identifiable, aucune trace de geste, aucune décision de retrait. Tout est
 * rendu au même niveau de détail, tout brille, rien n'est laissé de côté.
 *
 * D'où la consigne ci-dessous, qui est un socle NÉGATIF. Elle vaut pour les
 * trois directions, parce que c'est elle — plus que le choix de médium — qui
 * décide si l'image a l'air faite par quelqu'un.
 */
const SANS_TICS_IA =
  'Interdits formels : aucun rendu lissé à l’aérographe, aucune peau ' +
  'plastique ou cireuse, aucun contre-jour qui détoure tout le personnage ' +
  'd’un liseré lumineux, aucune particule ni étincelle ni braise orange en ' +
  'suspension, aucune poussière lumineuse, aucun bokeh, aucun flou ' +
  'd’arrière-plan généralisé, aucun halo ni bloom autour des sources, aucune ' +
  'palette turquoise-et-orange, aucune symétrie centrale, aucune pose ' +
  'héroïque plantée face au spectateur, aucun niveau de détail uniforme sur ' +
  'toute l’image.';

/**
 * L'entre-deux : une technique qu'on peut nommer.
 *
 * Ce qui manquait aux bibles plates, ce n'était pas du rendu, c'était de la
 * richesse — un décor, une lumière, une profondeur. Ce qui plombait les
 * bibles rendues, ce n'était pas la richesse, c'était le rendu lisse. On
 * garde donc le bord à bord, le décor et le mouvement, et on revient à un
 * médium identifiable : quelque chose qui a un outil, un support et une
 * palette limitée.
 *
 * Les reflets restent, mais ils changent de nature. Ils ne sont plus des
 * dégradés posés sur le personnage : ce sont des formes, dans le monde — une
 * flaque, une vitre, un écran — traitées à plat comme le reste. C'est ainsi
 * que les affiches peintes font les reflets depuis toujours.
 */
const RENDU_ENTRE_DEUX =
  'Illustration faite à la main, technique visible et assumée : on voit ' +
  'l’outil, le support et la matière. Palette volontairement limitée, six ' +
  'couleurs au maximum, choisies et non échantillonnées. Hiérarchie de ' +
  'détail franche : le visage et les mains sont travaillés, tout le reste est ' +
  'simplifié en formes. Les reflets et les lumières sont des FORMES nettes ' +
  'posées à plat — une flaque, une vitre, un écran, un chrome — jamais des ' +
  'dégradés lissés sur la peau ou le tissu. Grain du support visible dans la ' +
  // « Grain du support visible » suffisait à faire dessiner la feuille :
  // bord déchiré, marge, punaise, ombre portée. On garde la matière, on
  // interdit l'objet.
  'matière même de l’image, comme vu de très près — on ne voit JAMAIS la ' +
  'feuille en tant qu’objet : ni bord, ni coin, ni déchirure, ni punaise, ni ' +
  'ombre portée, ni marge, ni cadre. L’image est cadrée à l’intérieur du ' +
  'support et le déborde de tous les côtés.';

/**
 * L'exubérance : elle se joue dans la mise en scène, pas dans le rendu.
 *
 * Une belle lumière sur quelqu'un debout les bras ballants reste une photo
 * d'identité bien éclairée. Mais la première version a confondu « exubérant »
 * et « héroïque » : contre-plongée monumentale, lignes de fuite convergentes,
 * personnage planté au centre. C'est la pose de couverture de jeu vidéo, et
 * c'est l'un des tics ci-dessus. On garde le mouvement et on retire la
 * statue.
 */
const MISE_EN_SCENE_PLEINE =
  'Mise en scène vive et théâtrale, mais jamais solennelle : geste large ' +
  'saisi en plein mouvement, à contretemps, une fraction de seconde avant ou ' +
  'après le moment attendu. Vêtement et cheveux emportés par le déplacement. ' +
  'Composition franchement décentrée et asymétrique, cadrage qui coupe, ' +
  'grande zone vide d’un côté. Point de vue à hauteur d’œil ou en légère ' +
  'plongée, jamais en contre-plongée héroïque. Un accessoire du quotidien ' +
  'étudiant brandi comme une arme légendaire, traité avec le plus grand ' +
  'sérieux — c’est là qu’est la blague, et elle ne marche que si le reste ne ' +
  'se moque pas.';

const CADRAGE_PLEIN =
  'Composition pleine page bord à bord, le décor va jusqu’aux quatre bords. ' +
  'Personnage en pied ou aux trois quarts, occupant la moitié de la hauteur ' +
  'de l’image, décalé sur un côté, regard planté dans celui du spectateur. ' +
  // Deux images sur six sortaient en paysage collé au centre d'un canevas
  // vertical, avec des bandes au-dessus et au-dessous. Le format du fichier
  // était pourtant bon : c'est la composition qui était en 16:9.
  'L’illustration remplit entièrement le cadre vertical, de haut en bas : ' +
  'aucune bande noire, aucun letterboxing, aucune marge, aucun bord vide, ' +
  'aucune scène en paysage insérée dans un cadre plus haut.';

/**
 * Le décor doit être OBSERVÉ, pas évoqué.
 *
 * « Décor de vie étudiante française » donnait une rue générique avec des
 * enseignes en anglais. Le générique est l'autre signature de l'image
 * générée : elle produit la moyenne de tout ce qu'elle a vu. Nommer des
 * objets précis est ce qui la sort de la moyenne — et c'est aussi ce qui
 * fait l'humour, qui tient au détail juste et pas à la grimace.
 */
const FOND_PLEIN =
  'Décor de vie étudiante française observé et précis, pas générique : néon ' +
  'de grec ouvert la nuit, plateau de resto U, machine à café de couloir, ' +
  'gradins d’amphi, photocopieuse, rayonnage de BU, laverie automatique, ' +
  'abribus, cage d’escalier de cité universitaire, table pliante de soirée. ' +
  'Traité en formes simplifiées et valeurs sourdes, pour ne jamais manger le ' +
  'personnage. Aucune bordure, aucun cadre peint, aucun liseré. Aucun texte, ' +
  'aucune lettre, aucune enseigne lisible — surtout pas en anglais.';

const MARGES_PLEIN =
  'Le tiers supérieur et le tiers inférieur de l’image restent calmes et peu ' +
  'contrastés — un mur, un plafond, un sol, un aplat d’ambiance — pour ' +
  'laisser de la place à du texte en surimpression. Rien d’important ne s’y ' +
  'trouve, et surtout pas le visage ni les mains.';

/**
 * Trois entre-deux, à départager.
 *
 * Chacune nomme une technique réelle, avec son support, ses contraintes et
 * ses accidents. C'est la contrainte qui produit le style : une risographie
 * n'a que trois encres, une affiche peinte a des coups de pinceau, une
 * couleur directe déborde du trait. Une image qui n'a aucune contrainte
 * ressemble à toutes les autres.
 */
const PRESTIGES = {
  riso: {
    nom: 'Risographie de fanzine',
    lumiere:
      'Sérigraphie risographe à trois encres seulement : rose fluorescent, ' +
      'bleu outremer, noir. Les autres teintes naissent de la surimpression ' +
      'des trois. Trame de points grossière et bien visible, repérage décalé ' +
      'd’un ou deux millimètres, encre inégale, papier recyclé légèrement ' +
      'jauni, blancs qui sont le papier nu. La lumière est un aplat de rose ' +
      'fluo, les reflets au sol sont des formes franches de fluo. Énergie ' +
      'd’affiche de soirée étudiante, sans en montrer la feuille.',
  },
  affiche: {
    nom: 'Affiche peinte 1979',
    lumiere:
      'Affiche de cinéma français de la fin des années 1970, peinte à la ' +
      'gouache et à l’acrylique : coups de pinceau visibles, empâtements, ' +
      'arêtes franches entre les valeurs, couleurs légèrement passées, ocres ' +
      'et rouges profonds, noir chaud. Lumière d’un seul projecteur dur qui ' +
      'découpe des ombres nettes en aplat. Les reflets sont des touches ' +
      'blanches posées d’un geste. Grain de papier d’affiche et léger décalage ' +
      'de trame offset, dans l’image même et non sur ses bords.',
  },
  directe: {
    nom: 'Encre et couleur directe',
    lumiere:
      'Bande dessinée européenne contemporaine en couleur directe : trait ' +
      'd’encre nerveux et inégal, couleur posée à la gouache en taches ' +
      'franches qui débordent légèrement du trait, larges réserves de blanc ' +
      'de papier gardées telles quelles. La lumière est un aplat de couleur ' +
      'chaude, l’ombre un aplat froid, sans transition. Décor elliptique : ' +
      'quelques éléments précis et beaucoup de vide. Lumière de tube néon de ' +
      'couloir, blafarde et franche.',
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
      medium: RENDU_ENTRE_DEUX,
      entete: FORMAT_PLEIN,
      /** Les poses de prestige remplacent les postures sobres du jeu de base. */
      prestige: true,
      base: [
        RENDU_ENTRE_DEUX,
        p.lumiere,
        MISE_EN_SCENE_PLEINE,
        CADRAGE_PLEIN,
        FOND_PLEIN,
        MARGES_PLEIN,
        SANS_TICS_IA,
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
  //
  // Première version : bras en croix, suspension, contre-plongée. C'était la
  // pose de couverture de jeu vidéo — grande, mais générique et symétrique,
  // donc exactement ce qu'on cherche à éviter. Ces poses-ci restent amples,
  // mais elles sont de travers, prises à contretemps, et empruntées à des
  // gestes de vie étudiante qu'on peut reconnaître.
  const rolesPrestige = {
    MAGE:
      'penché en avant par-dessus une table, une paume claquée à plat dessus, ' +
      'l’autre bras tendu de côté doigt pointé, comme s’il lançait un sort ' +
      'et réclamait le silence dans le même geste',
    BRUISER:
      'de trois quarts dos, épaule enfoncée dans un battant de porte ' +
      'coupe-feu qu’il vient d’ouvrir à la volée, tête tournée vers le ' +
      'spectateur, élan encore visible',
    ASSASSIN:
      'accroupi en équilibre sur un muret ou un dossier de chaise, poids sur ' +
      'l’avant, capuche basse, une main au sol, prêt à filer sur le côté',
    SOUTIEN:
      'penché vers le spectateur, un bras tendu vers lui paume ouverte pour ' +
      'le relever, l’autre main accrochée à quelque chose hors champ pour ne ' +
      'pas tomber',
    TANK:
      'campé de profil, épaule et dos plaqués contre un battant qu’il retient ' +
      'seul, pieds qui ripent, visage tourné vers le spectateur sans effort ' +
      'apparent',
    FARCEUR:
      'en plein éclat de rire, franchement déséquilibré, rattrapé de justesse, ' +
      'un bras qui part en arrière, l’autre qui désigne le spectateur',
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
