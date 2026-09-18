/**
 * Recense les illustrations réellement présentes sur le disque et l'écrit en
 * module TypeScript.
 *
 * Pourquoi un manifeste plutôt qu'un <img> qui échoue silencieusement : le
 * lot est incomplet la plupart du temps (on génère par vagues, un sujet peut
 * rater). Sans recensement, le client demanderait vingt-huit images dont
 * quinze n'existent pas, encaisserait quinze 404 et ferait clignoter le repli
 * SVG après coup. Avec, il sait avant le rendu quoi afficher.
 */
import fs from 'node:fs';
import path from 'node:path';

const SORTIE = path.resolve('packages/client/public/cartes');
const MODULE = path.resolve('packages/client/src/art/illustrations.ts');
const EXTENSIONS = ['webp', 'png', 'jpg'];

/** { style: { especeId: 'chemin public' } } d'après le contenu du disque. */
export function recenser() {
  if (!fs.existsSync(SORTIE)) return {};
  const par_style = {};
  for (const style of fs.readdirSync(SORTIE).sort()) {
    const dossier = path.join(SORTIE, style);
    if (!fs.statSync(dossier).isDirectory()) continue;
    const trouves = {};
    for (const fichier of fs.readdirSync(dossier).sort()) {
      const ext = path.extname(fichier).slice(1).toLowerCase();
      if (!EXTENSIONS.includes(ext)) continue;
      trouves[path.basename(fichier, path.extname(fichier))] = `/cartes/${style}/${fichier}`;
    }
    if (Object.keys(trouves).length) par_style[style] = trouves;
  }
  return par_style;
}

/** Écrit le module et renvoie le nombre d'illustrations recensées. */
export function ecrireManifeste() {
  const par_style = recenser();
  const total = Object.values(par_style).reduce((n, s) => n + Object.keys(s).length, 0);

  const corps = Object.entries(par_style)
    .map(([style, sujets]) => {
      const lignes = Object.entries(sujets)
        .map(([id, chemin]) => `    ${id}: '${chemin}',`)
        .join('\n');
      return `  ${style}: {\n${lignes}\n  },`;
    })
    .join('\n');

  const contenu = `// Fichier généré par « node outils/art/generer.mjs » — ne pas éditer à la main.
// Il recense les illustrations présentes dans packages/client/public/cartes.

/** Illustrations disponibles, par style puis par identifiant d'espèce. */
export const ILLUSTRATIONS: Record<string, Record<string, string>> = {
${corps}
};

/**
 * Style servi aux joueurs. Changer cette constante bascule toute la
 * collection d'une direction artistique à l'autre ; les personnages sans
 * illustration dans ce style retombent sur l'avatar SVG procédural.
 */
export const STYLE_ACTIF = '${Object.keys(par_style)[0] ?? 'gouache'}';

/** Chemin de l'illustration d'une espèce, ou null s'il faut replier sur le SVG. */
export function illustrationEspece(especeId: string, style = STYLE_ACTIF): string | null {
  return ILLUSTRATIONS[style]?.[especeId] ?? null;
}
`;
  fs.mkdirSync(path.dirname(MODULE), { recursive: true });
  fs.writeFileSync(MODULE, contenu);
  return total;
}
