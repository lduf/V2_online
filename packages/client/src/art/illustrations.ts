// Fichier généré par « node outils/art/generer.mjs » — ne pas éditer à la main.
// Il recense les illustrations présentes dans packages/client/public/cartes.

/** Illustrations disponibles, par style puis par identifiant d'espèce. */
export const ILLUSTRATIONS: Record<string, Record<string, string>> = {

};

/**
 * Style servi aux joueurs. Changer cette constante bascule toute la
 * collection d'une direction artistique à l'autre ; les personnages sans
 * illustration dans ce style retombent sur l'avatar SVG procédural.
 */
export const STYLE_ACTIF = 'gouache';

/** Chemin de l'illustration d'une espèce, ou null s'il faut replier sur le SVG. */
export function illustrationEspece(especeId: string, style = STYLE_ACTIF): string | null {
  return ILLUSTRATIONS[style]?.[especeId] ?? null;
}
