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
  carre: { id: 'carre', largeur: COTE, hauteur: COTE, position: 'attention' },
  pleine: { id: 'pleine', largeur: 560, hauteur: 784, position: 'centre' },
};

/**
 * Convertit les octets bruts en WebP au profil demandé. Renvoie les octets
 * optimisés et de quoi mesurer le gain, parce qu'un pipeline d'assets qu'on ne
 * mesure pas dérive toujours vers le lourd.
 */
export async function optimiser(brut, profil = PROFILS.carre) {
  const image = sharp(brut, { failOn: 'error' });
  const { width, height, format } = await image.metadata();
  const octets = await image
    .resize(profil.largeur, profil.hauteur, { fit: 'cover', position: profil.position })
    .webp({ quality: QUALITE, effort: 6 })
    .toBuffer();
  return {
    octets,
    profil,
    source: { largeur: width, hauteur: height, format, octets: brut.length },
  };
}
