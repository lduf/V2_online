// Fichier généré par « node outils/art/generer.mjs » — ne pas éditer à la main.
// Il recense les illustrations présentes dans packages/client/public/cartes.

/** Illustrations disponibles, par style puis par identifiant d'espèce. */
export const ILLUSTRATIONS: Record<string, Record<string, string>> = {
  encre: {
    brigitte: '/cartes/encre/brigitte.webp',
    ignis: '/cartes/encre/ignis.webp',
    maxence: '/cartes/encre/maxence.webp',
    ondine: '/cartes/encre/ondine.webp',
    vlad: '/cartes/encre/vlad.webp',
    zora: '/cartes/encre/zora.webp',
  },
  gouache: {
    brigitte: '/cartes/gouache/brigitte.webp',
    ignis: '/cartes/gouache/ignis.webp',
    maxence: '/cartes/gouache/maxence.webp',
    ondine: '/cartes/gouache/ondine.webp',
    vlad: '/cartes/gouache/vlad.webp',
    zora: '/cartes/gouache/zora.webp',
  },
  'pleine-affiche': {
    ignis: '/cartes/pleine-affiche/ignis.webp',
    zora: '/cartes/pleine-affiche/zora.webp',
  },
  'pleine-directe': {
    ignis: '/cartes/pleine-directe/ignis.webp',
    zora: '/cartes/pleine-directe/zora.webp',
  },
  'pleine-neon': {
    ignis: '/cartes/pleine-neon/ignis.webp',
    zora: '/cartes/pleine-neon/zora.webp',
  },
  'pleine-riso': {
    ignis: '/cartes/pleine-riso/ignis.webp',
    zora: '/cartes/pleine-riso/zora.webp',
  },
  serigraphie: {
    brigitte: '/cartes/serigraphie/brigitte.webp',
    ignis: '/cartes/serigraphie/ignis.webp',
    maxence: '/cartes/serigraphie/maxence.webp',
    ondine: '/cartes/serigraphie/ondine.webp',
    vlad: '/cartes/serigraphie/vlad.webp',
    zora: '/cartes/serigraphie/zora.webp',
  },
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
