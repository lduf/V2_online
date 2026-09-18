#!/usr/bin/env node
/**
 * Assemble une planche de comparaison par style : les six sujets de
 * validation côte à côte, légendés, sous un bandeau qui rappelle le nom de la
 * bible de style.
 *
 *   node outils/art/planche.mjs                 (les bibles standard)
 *   node outils/art/planche.mjs --pleines       (les directions de prestige)
 *   node outils/art/planche.mjs --style gouache (une seule)
 *
 * Pourquoi un outil plutôt qu'un montage à la main : on relancera la
 * comparaison à chaque retouche de bible, et une planche assemblée
 * différemment d'une fois sur l'autre ne se compare plus à la précédente.
 *
 * sharp uniquement — aucun cwebp, aucun ImageMagick, aucun Pillow.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ESPECES_PAR_ID } from '../../packages/engine/dist/index.js';
import { STYLES, STYLES_PLEINS, SUJETS_TEST, SUJETS_PLEINS } from './styles.mjs';

const SOURCE = path.resolve('packages/client/public/cartes');
const SORTIE = path.resolve('outils/art/planches');

/** Côté d'une vignette carrée dans la planche, en pixels. */
const VIGNETTE = 340;
/** Le full art est en 5:7 : l'afficher carré le recadrerait une seconde fois. */
const VIGNETTE_PLEINE = { largeur: 340, hauteur: 476 };
/** Hauteur du bandeau de titre et de la bande de légendes. */
const TITRE = 58;
const LEGENDE = 40;
const MARGE = 14;

/** Échappe le texte injecté dans le SVG des légendes. */
function txt(s) {
  return String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Bandeau de titre et légendes, rendus en SVG puis composés par sharp. */
function habillage(style, sujets, largeur, hauteur, lVignette, hVignette) {
  const legendes = sujets
    .map((s, i) => {
      const x = MARGE + i * (lVignette + MARGE) + lVignette / 2;
      const y = TITRE + hVignette + MARGE + 18;
      return (
        `<text x="${x}" y="${y}" text-anchor="middle" font-size="17" font-weight="700" fill="#efeaff">${txt(s.nom)}</text>` +
        `<text x="${x}" y="${y + 17}" text-anchor="middle" font-size="13" fill="#9d94c0">${txt(s.rarete)} · ${txt(s.role.toLowerCase())}</text>`
      );
    })
    .join('');

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">` +
      `<rect width="${largeur}" height="${hauteur}" fill="#120d20"/>` +
      `<text x="${MARGE}" y="38" font-size="26" font-weight="800" fill="#ffffff">${txt(style.nom)}</text>` +
      `<text x="${largeur - MARGE}" y="38" text-anchor="end" font-size="15" fill="#9d94c0">` +
      `bible « ${txt(style.id)} » · ${sujets.length} sujet(s) de validation</text>` +
      legendes +
      '</svg>',
  );
}

/** Construit la planche d'un style, ou null si aucune image n'est présente. */
async function planche(style, { pleine = false } = {}) {
  const dossier = path.join(SOURCE, style.id);
  if (!fs.existsSync(dossier)) return null;

  const l = pleine ? VIGNETTE_PLEINE.largeur : VIGNETTE;
  const h = pleine ? VIGNETTE_PLEINE.hauteur : VIGNETTE;

  const sujets = (pleine ? SUJETS_PLEINS : SUJETS_TEST)
    .map((id) => ESPECES_PAR_ID[id])
    .filter(Boolean)
    .map((e) => ({ ...e, fichier: path.join(dossier, `${e.id}.webp`) }))
    .filter((e) => fs.existsSync(e.fichier));
  if (!sujets.length) return null;

  const largeur = MARGE + sujets.length * (l + MARGE);
  const hauteur = TITRE + h + MARGE + LEGENDE;

  const vignettes = await Promise.all(
    sujets.map(async (s, i) => ({
      input: await sharp(s.fichier).resize(l, h, { fit: 'cover' }).png().toBuffer(),
      left: MARGE + i * (l + MARGE),
      top: TITRE,
    })),
  );

  const fichier = path.join(SORTIE, `${style.id}.png`);
  fs.mkdirSync(SORTIE, { recursive: true });
  await sharp(habillage(style, sujets, largeur, hauteur, l, h))
    .composite(vignettes)
    .png({ compressionLevel: 9 })
    .toFile(fichier);
  return { fichier, largeur, hauteur, sujets: sujets.length };
}

const args = process.argv.slice(2);
const pleines = args.includes('--pleines');
const catalogue = pleines ? STYLES_PLEINS : STYLES;
const demande = args.includes('--style') ? args[args.indexOf('--style') + 1] : null;
const styles = demande ? [catalogue[demande]].filter(Boolean) : Object.values(catalogue);
if (!styles.length) {
  console.error(`Style inconnu. Connus : ${Object.keys(catalogue).join(', ')}`);
  process.exit(2);
}

for (const style of styles) {
  const r = await planche(style, { pleine: pleines });
  if (!r) {
    console.log(`${style.id} : aucune image sur le disque, planche ignorée.`);
    continue;
  }
  const ko = Math.round(fs.statSync(r.fichier).size / 1024);
  console.log(`${style.id} : ${r.sujets} sujets · ${r.largeur}×${r.hauteur} · ${ko} ko · ${r.fichier}`);
}
