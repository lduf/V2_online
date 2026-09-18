/**
 * Ramène une illustration brute au format servi aux joueurs.
 *
 * Deux profils, parce que la carte a deux traitements :
 *
 * — `carre` : l'illustration occupe le panneau d'art, au milieu du cadre. La
 *   plus grande carte fait 268 px de large (`--largeur` de .carte--grand) : à
 *   2× sur un écran dense, 512 px suffisent et tout pixel au-delà est du poids
 *   pur.
 * — `pleine` : le traitement « full art », l'illustration couvre la carte bord
 *   à bord. La carte est en ratio 5/7 (`aspect-ratio` de .carte) et fait au
 *   plus 268×375 px, donc 560×784 à 2×. Un carré ne convient pas : recadré en
 *   5:7 il perdrait 28 % de sa hauteur, c'est-à-dire la tête ou les pieds.
 *
 * sharp est une dépendance de développement : la génération est hors ligne,
 * la production ne sert que le résultat.
 */
import sharp from 'sharp';

/** Côté de l'image carrée servie dans le panneau d'art, en pixels. */
export const COTE = 512;
/** Qualité WebP : au-delà de 82, le gain visuel ne paie plus les octets. */
export const QUALITE = 82;

/**
 * Les deux formats de sortie.
 *
 * `position` diffère à dessein. Sur le carré, l'illustration est un portrait
 * sur fond uni et `attention` va chercher le visage, ce qui rattrape un
 * cadrage approximatif. Sur le full art, la composition est déjà verticale et
 * contient un décor : laisser sharp choisir déplacerait le personnage d'une
 * carte à l'autre, et une série de prestige qui bouge n'est plus une série.
 */
export const PROFILS = {
  carre: {
    id: 'carre',
    largeur: COTE,
    hauteur: COTE,
    position: 'attention',
    // Le carré est le seul cas où l'on VEUT épingler la taille demandée.
    taille: '1024x1024',
  },
  pleine: {
    id: 'pleine',
    largeur: 560,
    hauteur: 784,
    position: 'centre',
    // `null` : ne rien envoyer. Le modèle prend son format dans le texte du
    // prompt, mais un `size` explicite le remet au carré par-dessus — c'est
    // ce qui a produit une première série de full art recadrée à la hache.
    taille: null,
  },
};


/**
 * Seuil de détection des bandes parasites.
 *
 * Premier réglage : 3,5, calibré sur les six images qui avaient révélé le
 * problème — les bonnes tenaient entre ×2,0 et ×2,4, les deux ratées
 * sortaient à ×4,2 et ×20,4. La toute première image suivante l'a démenti :
 * une bonne image d'amphi, verrières lumineuses en haut et sol sombre en bas,
 * monte à ×5,3 sans la moindre bande. Calibrer sur l'échantillon qui a produit
 * l'hypothèse ne prouve rien.
 *
 * Mesures sur les huit images connues : les bonnes vont de ×2,0 à ×5,3, les
 * ratées valent ×4,2 et ×20,4. Les deux familles se CHEVAUCHENT, et ajouter la
 * platitude des bords ne les sépare pas davantage (une bonne image a un bord à
 * 0,00, une ratée à 10,59). Il n'existe donc pas de seuil honnête qui attrape
 * les deux cas.
 *
 * On se rabat sur ce qui est réellement séparable : le letterbox franc, bande
 * unie à bord net, très au-dessus de tout le reste. À 8, aucune des six bonnes
 * images connues n'est signalée. Les cas discrets restent à l'œil — ce garde-
 * fou évite de commiter un raté flagrant dans un lot de vingt-huit, pas de se
 * passer d'un coup d'œil.
 */
const SEUIL_BANDE = 8;

/**
 * Repère une image « letterboxée » : le modèle a peint une scène en paysage
 * au milieu du canevas vertical, avec des bandes au-dessus et au-dessous.
 *
 * On ne peut pas la reconnaître à la platitude des bords — la bible demande
 * justement un tiers haut et un tiers bas calmes, pour y poser le texte. Ce
 * qui trahit la bande, c'est la RUPTURE : une marche franche de luminance
 * entre deux lignes voisines, là où une vraie composition dégrade en douceur.
 * On compare donc le plus gros saut des bords au saut moyen du centre.
 *
 * Un avertissement, jamais un rejet : le fichier est écrit, et c'est un
 * humain qui tranche. Chaque image se paie, donc un seuil qui en jette une
 * bonne coûte plus cher qu'un seuil qui en laisse passer une mauvaise.
 */
async function detecterBande(brut) {
  const { data, info } = await sharp(brut).greyscale().resize(48, null).raw()
    .toBuffer({ resolveWithObject: true });
  const { width: l, height: h } = info;
  const lignes = [];
  for (let y = 0; y < h; y++) {
    let somme = 0;
    for (let x = 0; x < l; x++) somme += data[y * l + x];
    lignes.push(somme / l);
  }
  const saut = (y) => Math.abs(lignes[y] - lignes[y - 1]);

  let pire = 0;
  for (const [a, b] of [[1, Math.round(h * 0.25)], [Math.round(h * 0.75), h - 1]])
    for (let y = a; y < b; y++) pire = Math.max(pire, saut(y));

  let centre = 0;
  let n = 0;
  for (let y = Math.round(h * 0.35); y < Math.round(h * 0.65); y++, n++) centre += saut(y);
  const reference = Math.max(centre / Math.max(n, 1), 0.1);

  return { rapport: pire / reference, suspecte: pire / reference > SEUIL_BANDE };
}

/**
 * Convertit les octets bruts en WebP au profil demandé. Renvoie les octets
 * optimisés et de quoi mesurer le gain, parce qu'un pipeline d'assets qu'on ne
 * mesure pas dérive toujours vers le lourd.
 */
export async function optimiser(brut, profil = PROFILS.carre) {
  const image = sharp(brut, { failOn: 'error' });
  const { width, height, format } = await image.metadata();
  // Seul le full art est concerné : une vignette carrée n'a pas de bandes.
  const bande = profil.id === 'pleine' ? await detecterBande(brut) : null;
  const octets = await image
    .resize(profil.largeur, profil.hauteur, { fit: 'cover', position: profil.position })
    .webp({ quality: QUALITE, effort: 6 })
    .toBuffer();
  return {
    octets,
    profil,
    bande,
    source: { largeur: width, hauteur: height, format, octets: brut.length },
  };
}
