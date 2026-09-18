/**
 * Ramène une illustration brute au format servi aux joueurs.
 *
 * Le modèle rend du 1024×1024, souvent en PNG. La plus grande carte du jeu
 * fait 268 px de large (`--largeur` de .carte--grand) : à 2× sur un écran
 * dense, 512 px suffisent et tout pixel au-delà est du poids pur. Vingt-huit
 * PNG bruts ne tiennent pas dans un dépôt ; vingt-huit WebP de 512 px, oui.
 *
 * sharp est une dépendance de développement : la génération est hors ligne,
 * la production ne sert que le résultat.
 */
import sharp from 'sharp';

/** Côté de l'image servie, en pixels. */
export const COTE = 512;
/** Qualité WebP : au-delà de 82, le gain visuel ne paie plus les octets. */
export const QUALITE = 82;

/**
 * Convertit les octets bruts en WebP carré. Renvoie les octets optimisés et
 * de quoi mesurer le gain, parce qu'un pipeline d'assets qu'on ne mesure pas
 * dérive toujours vers le lourd.
 */
export async function optimiser(brut) {
  const image = sharp(brut, { failOn: 'error' });
  const { width, height, format } = await image.metadata();
  const octets = await image
    .resize(COTE, COTE, { fit: 'cover', position: 'attention' })
    .webp({ quality: QUALITE, effort: 6 })
    .toBuffer();
  return {
    octets,
    source: { largeur: width, hauteur: height, format, octets: brut.length },
  };
}
