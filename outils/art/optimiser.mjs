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
 * Deux mesures sur une image de full art, et pourquoi ce ne sont QUE des
 * mesures.
 *
 * Le modèle produit deux ratés récurrents : une scène en paysage collée au
 * milieu du canevas vertical, et une marge peinte — bord de feuille, cadre
 * d'affiche — que la bible interdit pourtant. On a cherché à les détecter
 * automatiquement. Deux tentatives, deux échecs :
 *
 * — La RUPTURE (plus gros saut de luminance dans les bords, rapporté au saut
 *   moyen du centre). Premier seuil à 3,5, calibré sur les six images qui
 *   avaient révélé le problème. La toute première image suivante l'a démenti :
 *   une bonne image d'amphi, verrières en haut et sol sombre en bas, monte à
 *   ×5,3 sans la moindre bande. Sur les images connues, les bonnes vont de
 *   ×2,0 à ×5,3 et les ratées valent ×4,2 et ×20,4 : les familles se
 *   chevauchent.
 * — L'ANNEAU (écart-type du ruban périphérique). Il séparait proprement sur
 *   huit images — marges à 18–19, images pleines au-dessus de 35 — puis il a
 *   signalé une risographie pleine dont les bords sont simplement unis. Une
 *   image à plat AVEC des bords unis est indiscernable d'une image à marge.
 *
 * Conclusion : sur ce problème, aucun seuil honnête. On publie donc les deux
 * nombres sans verdict, et on laisse l'œil trancher — c'est à ça que sert la
 * planche-contact de `planche.mjs`, qui montre un lot entier d'un coup.
 * Un chiffre affiché aide à comparer deux images ; un chiffre déguisé en
 * verdict fait jeter les bonnes et garder les mauvaises.
 */
async function mesurer(brut) {
  const gris = await sharp(brut).greyscale().resize(48, null).raw()
    .toBuffer({ resolveWithObject: true });
  const { width: l, height: h } = gris.info;
  const lignes = [];
  for (let y = 0; y < h; y++) {
    let somme = 0;
    for (let x = 0; x < l; x++) somme += gris.data[y * l + x];
    lignes.push(somme / l);
  }
  const saut = (y) => Math.abs(lignes[y] - lignes[y - 1]);

  let pire = 0;
  for (const [a, b] of [[1, Math.round(h * 0.25)], [Math.round(h * 0.75), h - 1]])
    for (let y = a; y < b; y++) pire = Math.max(pire, saut(y));

  let centre = 0;
  let n = 0;
  for (let y = Math.round(h * 0.35); y < Math.round(h * 0.65); y++, n++) centre += saut(y);

  // L'anneau : plus il est uni, plus l'image risque d'avoir une marge peinte.
  const bord = await sharp(brut).resize(120, 168, { fit: 'fill' }).raw()
    .toBuffer({ resolveWithObject: true });
  const { width: L, height: H, channels: C } = bord.info;
  const ep = Math.max(2, Math.round(L * 0.03));
  const pixels = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < L; x++) {
      if (x >= ep && x < L - ep && y >= ep && y < H - ep) continue;
      const i = (y * L + x) * C;
      pixels.push([bord.data[i], bord.data[i + 1], bord.data[i + 2]]);
    }
  const moy = [0, 1, 2].map((k) => pixels.reduce((a, q) => a + q[k], 0) / pixels.length);
  const variance =
    pixels.reduce(
      (a, q) => a + (q[0] - moy[0]) ** 2 + (q[1] - moy[1]) ** 2 + (q[2] - moy[2]) ** 2,
      0,
    ) / (pixels.length * 3);

  return {
    rupture: pire / Math.max(centre / Math.max(n, 1), 0.1),
    anneau: Math.sqrt(variance),
  };
}

/**
 * Convertit les octets bruts en WebP au profil demandé. Renvoie les octets
 * optimisés et de quoi mesurer le gain, parce qu'un pipeline d'assets qu'on ne
 * mesure pas dérive toujours vers le lourd.
 */
export async function optimiser(brut, profil = PROFILS.carre) {
  const image = sharp(brut, { failOn: 'error' });
  const { width, height, format } = await image.metadata();
  // Seul le full art est concerné : une vignette carrée n'a ni bande ni marge.
  const mesures = profil.id === 'pleine' ? await mesurer(brut) : null;
  const octets = await image
    .resize(profil.largeur, profil.hauteur, { fit: 'cover', position: profil.position })
    .webp({ quality: QUALITE, effort: 6 })
    .toBuffer();
  return {
    octets,
    profil,
    mesures,
    source: { largeur: width, hauteur: height, format, octets: brut.length },
  };
}
