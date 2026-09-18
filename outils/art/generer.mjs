#!/usr/bin/env node
/**
 * Génère les illustrations de cartes via un endpoint LiteLLM (compatible
 * OpenAI). Volontairement HORS LIGNE : on génère une fois à l'écriture, on
 * commite le résultat, et la production ne connaît ni clé ni latence.
 *
 *   node outils/art/generer.mjs --style gouache --test
 *   node outils/art/generer.mjs --style gouache --tout
 *   node outils/art/generer.mjs --styles           (compare les trois sur 6 sujets)
 *
 * Variables d'environnement :
 *   ARENE_IMAGE_URL    base de l'endpoint LiteLLM
 *   ARENE_IMAGE_KEY    clé d'API
 *   ARENE_IMAGE_MODEL  identifiant du modèle
 */
import fs from 'node:fs';
import path from 'node:path';
import { ESPECES, ESPECES_PAR_ID } from '../../packages/engine/dist/index.js';
import { STYLES, SUJETS_TEST, promptPersonnage } from './styles.mjs';

const SORTIE = path.resolve('packages/client/public/cartes');
const TAILLE = process.env.ARENE_IMAGE_TAILLE ?? '1024x1024';

function conf() {
  const url = process.env.ARENE_IMAGE_URL;
  const cle = process.env.ARENE_IMAGE_KEY;
  const modele = process.env.ARENE_IMAGE_MODEL;
  const manquantes = [
    !url && 'ARENE_IMAGE_URL',
    !cle && 'ARENE_IMAGE_KEY',
    !modele && 'ARENE_IMAGE_MODEL',
  ].filter(Boolean);
  if (manquantes.length) {
    console.error(`Variables manquantes : ${manquantes.join(', ')}`);
    console.error("Elles ne sont lues qu'au démarrage du processus.");
    process.exit(2);
  }
  return { url: url.replace(/\/+$/, ''), cle, modele };
}

/**
 * LiteLLM expose /images/generations, parfois préfixé par /v1 selon la façon
 * dont la base est fournie. On essaie les deux plutôt que de deviner.
 */
function cheminsCandidats(base) {
  return base.endsWith('/v1')
    ? [`${base}/images/generations`]
    : [`${base}/v1/images/generations`, `${base}/images/generations`];
}

async function generer({ url, cle, modele }, prompt) {
  let derniereErreur = '';
  for (const cible of cheminsCandidats(url)) {
    let r;
    try {
      r = await fetch(cible, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
        body: JSON.stringify({
          model: modele,
          prompt,
          n: 1,
          size: TAILLE,
          response_format: 'b64_json',
        }),
      });
    } catch (e) {
      derniereErreur = `${cible} → ${e.message}`;
      continue;
    }
    const brut = await r.text();
    if (!r.ok) {
      derniereErreur = `${cible} → ${r.status} ${brut.slice(0, 400)}`;
      // 404 : mauvais chemin, on tente le suivant. Sinon l'erreur est réelle.
      if (r.status === 404) continue;
      throw new Error(derniereErreur);
    }
    const j = JSON.parse(brut);
    const image = j?.data?.[0];
    if (!image) throw new Error(`Réponse sans image : ${brut.slice(0, 400)}`);
    if (image.b64_json) return { octets: Buffer.from(image.b64_json, 'base64'), ext: 'png' };
    if (image.url) {
      const img = await fetch(image.url);
      if (!img.ok) throw new Error(`Téléchargement de l'image : ${img.status}`);
      const type = img.headers.get('content-type') ?? '';
      const ext = type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : 'png';
      return { octets: Buffer.from(await img.arrayBuffer()), ext };
    }
    throw new Error(`Ni b64_json ni url : ${brut.slice(0, 400)}`);
  }
  throw new Error(derniereErreur || 'Aucun chemin joignable');
}

async function lot(especes, style, c) {
  const dossier = path.join(SORTIE, style.id);
  fs.mkdirSync(dossier, { recursive: true });
  let faits = 0, sautes = 0;
  for (const e of especes) {
    const existant = ['png', 'webp', 'jpg']
      .map((x) => path.join(dossier, `${e.id}.${x}`))
      .find((f) => fs.existsSync(f));
    if (existant) { sautes++; continue; }
    const prompt = promptPersonnage(e, style);
    process.stdout.write(`  ${style.id}/${e.id} … `);
    try {
      const { octets, ext } = await generer(c, prompt);
      fs.writeFileSync(path.join(dossier, `${e.id}.${ext}`), octets);
      console.log(`${Math.round(octets.length / 1024)} ko`);
      faits++;
    } catch (err) {
      console.log('ÉCHEC');
      console.error(`    ${err.message}`);
      // Un échec sur une carte ne doit pas perdre le reste du lot.
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`${style.id} : ${faits} générées, ${sautes} déjà présentes`);
}

const args = process.argv.slice(2);
const a = (n) => args[args.indexOf(n) + 1];
const c = conf();
console.log(`modèle ${c.modele} · taille ${TAILLE} · sortie ${SORTIE}`);

if (args.includes('--styles')) {
  const sujets = SUJETS_TEST.map((id) => ESPECES_PAR_ID[id]).filter(Boolean);
  for (const style of Object.values(STYLES)) await lot(sujets, style, c);
} else {
  const style = STYLES[a('--style') ?? 'gouache'];
  if (!style) { console.error(`Style inconnu. Connus : ${Object.keys(STYLES).join(', ')}`); process.exit(2); }
  const especes = args.includes('--tout')
    ? ESPECES
    : SUJETS_TEST.map((id) => ESPECES_PAR_ID[id]).filter(Boolean);
  await lot(especes, style, c);
}
