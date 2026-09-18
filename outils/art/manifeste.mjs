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

/**
 * Clé d'objet TypeScript : quotée dès qu'elle n'est pas un identifiant.
 *
 * Les styles full art s'appellent « pleine-gouache » : un tiret suffit à
 * produire un module qui ne compile pas, et l'erreur remonte au typecheck du
 * client, très loin du script qui l'a écrite.
 */
function cle(k) {
  return /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k.replace(/'/g, "\\'")}'`;
}

/**
 * Style déjà servi aux joueurs, relu dans le module précédent.
 *
 * Sans cette relecture, générer un nouveau style basculerait la direction
 * artistique du jeu par simple effet de l'ordre alphabétique : ajouter
 * « encre » à côté de « gouache » suffisait à changer l'art de toute la
 * collection. Le choix de direction est une décision, pas un effet de bord de
 * `readdir`.
 */
function styleDejaChoisi() {
  if (!fs.existsSync(MODULE)) return null;
  return /STYLE_ACTIF = '([^']+)'/.exec(fs.readFileSync(MODULE, 'utf8'))?.[1] ?? null;
}

/** Écrit le module et renvoie le nombre d'illustrations recensées. */
export function ecrireManifeste() {
  const par_style = recenser();
  const total = Object.values(par_style).reduce((n, s) => n + Object.keys(s).length, 0);

  // Ordre de priorité : ce que demande l'appelant, puis le style déjà en
  // place, puis le premier disponible — et seulement en dernier recours.
  const styles = Object.keys(par_style);
  const demande = process.env.ARENE_STYLE_ACTIF;
  const precedent = styleDejaChoisi();
  const actif =
    (demande && styles.includes(demande) && demande) ||
    (precedent && styles.includes(precedent) && precedent) ||
    styles[0] ||
    precedent ||
    'gouache';

  const corps = Object.entries(par_style)
    .map(([style, sujets]) => {
      const lignes = Object.entries(sujets)
        .map(([id, chemin]) => `    ${cle(id)}: '${chemin}',`)
        .join('\n');
      return `  ${cle(style)}: {\n${lignes}\n  },`;
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
export const STYLE_ACTIF = '${actif}';

/** Chemin de l'illustration d'une espèce, ou null s'il faut replier sur le SVG. */
export function illustrationEspece(especeId: string, style = STYLE_ACTIF): string | null {
  return ILLUSTRATIONS[style]?.[especeId] ?? null;
}
`;
  fs.mkdirSync(path.dirname(MODULE), { recursive: true });
  fs.writeFileSync(MODULE, contenu);
  return total;
}
