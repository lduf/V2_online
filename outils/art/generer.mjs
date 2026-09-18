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
 * Les images sont ramenées en WebP 512² avant écriture : la plus grande
 * carte fait 268 px de large, tout pixel au-delà de 512 est du poids pur.
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
import { ecrireManifeste } from './manifeste.mjs';
import { optimiser, COTE } from './optimiser.mjs';

const SORTIE = path.resolve('packages/client/public/cartes');
const TAILLE = process.env.ARENE_IMAGE_TAILLE ?? '1024x1024';

/** Extensions reconnues, dans l'ordre de préférence à la lecture. */
const EXTENSIONS = ['webp', 'png', 'jpg'];

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

/**
 * Une panne qui ne sera pas réparée en réessayant la carte suivante : clé
 * refusée, hôte injoignable, modèle inconnu. On arrête le lot au lieu
 * d'empiler dix-huit fois la même erreur.
 */
class PanneFatale extends Error {
  constructor(message, remede) {
    super(message);
    this.remede = remede;
  }
}

/**
 * Le format annoncé par l'API n'est pas fiable : on lit les octets. Une
 * illustration servie en .png alors qu'elle est en WebP casse le cache et
 * certains navigateurs.
 */
function extensionDepuisOctets(o) {
  if (o.length > 12 && o.toString('ascii', 0, 4) === 'RIFF' && o.toString('ascii', 8, 12) === 'WEBP')
    return 'webp';
  if (o.length > 8 && o[0] === 0x89 && o.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (o.length > 3 && o[0] === 0xff && o[1] === 0xd8) return 'jpg';
  return 'bin';
}

async function generer({ url, cle, modele }, prompt, format) {
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
          ...(format ? { output_format: format } : {}),
        }),
      });
    } catch (e) {
      // Ni DNS, ni TCP, ni TLS : l'hôte n'est pas joignable depuis ici. Sur un
      // environnement à politique réseau, c'est le pare-feu, pas l'endpoint.
      throw new PanneFatale(
        `${cible} injoignable : ${e.message}${e.cause?.message ? ` (${e.cause.message})` : ''}`,
        "Vérifier que l'hôte est autorisé par la politique réseau de l'environnement.",
      );
    }
    const brut = await r.text();
    if (!r.ok) {
      derniereErreur = `${cible} → ${r.status} ${brut.slice(0, 400)}`;
      // 404 : mauvais chemin, on tente le suivant. Sinon l'erreur est réelle.
      if (r.status === 404) continue;
      if (r.status === 401 || r.status === 403)
        throw new PanneFatale(
          derniereErreur,
          "L'endpoint répond, donc ni le réseau ni le chemin ne sont en cause : " +
            'c\'est ARENE_IMAGE_KEY qui est refusée par ce serveur (révoquée, ' +
            'expirée, ou émise par une autre instance LiteLLM).',
        );
      if (r.status === 400 && /model/i.test(brut))
        throw new PanneFatale(derniereErreur, `Vérifier ARENE_IMAGE_MODEL (« ${modele} »).`);
      throw new Error(derniereErreur);
    }
    const j = JSON.parse(brut);
    const image = j?.data?.[0];
    if (!image) throw new Error(`Réponse sans image : ${brut.slice(0, 400)}`);
    if (image.b64_json) {
      const octets = Buffer.from(image.b64_json, 'base64');
      return { octets, ext: extensionDepuisOctets(octets) };
    }
    if (image.url) {
      const img = await fetch(image.url);
      if (!img.ok) throw new Error(`Téléchargement de l'image : ${img.status}`);
      const octets = Buffer.from(await img.arrayBuffer());
      return { octets, ext: extensionDepuisOctets(octets) };
    }
    throw new Error(`Ni b64_json ni url : ${brut.slice(0, 400)}`);
  }
  throw new PanneFatale(
    derniereErreur || 'Aucun chemin joignable',
    'Aucun des chemins /v1/images/generations et /images/generations ne répond ; ' +
      'vérifier ARENE_IMAGE_URL.',
  );
}

async function lot(especes, style, c, format) {
  const dossier = path.join(SORTIE, style.id);
  fs.mkdirSync(dossier, { recursive: true });
  let faits = 0, sautes = 0, octetsTotal = 0;
  for (const e of especes) {
    const existant = EXTENSIONS
      .map((x) => path.join(dossier, `${e.id}.${x}`))
      .find((f) => fs.existsSync(f));
    if (existant) { sautes++; continue; }
    const prompt = promptPersonnage(e, style);
    process.stdout.write(`  ${style.id}/${e.id} … `);
    try {
      const { octets: brut, ext } = await generer(c, prompt, format);
      if (ext === 'bin') throw new Error('Format d’image non reconnu dans la réponse');
      const { octets, source } = await optimiser(brut);
      fs.writeFileSync(path.join(dossier, `${e.id}.webp`), octets);
      console.log(
        `${source.format} ${source.largeur}×${source.hauteur} ${Math.round(source.octets / 1024)} ko` +
          ` → webp ${COTE}² ${Math.round(octets.length / 1024)} ko`,
      );
      faits++;
      octetsTotal += octets.length;
    } catch (err) {
      console.log('ÉCHEC');
      console.error(`    ${err.message}`);
      // Une panne fatale se répéterait à l'identique sur les 27 cartes
      // suivantes : on rend la main tout de suite, avec le remède.
      if (err instanceof PanneFatale) throw err;
      // Un échec ponctuel, lui, ne doit pas perdre le reste du lot.
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  const poids = faits ? ` · ${Math.round(octetsTotal / 1024)} ko produits` : '';
  console.log(`${style.id} : ${faits} générées, ${sautes} déjà présentes${poids}`);
}

const args = process.argv.slice(2);
const a = (n) => args[args.indexOf(n) + 1];
const format = args.includes('--format') ? a('--format') : undefined;
const c = conf();
console.log(`modèle ${c.modele} · taille ${TAILLE} · sortie ${SORTIE}`);

try {
  if (args.includes('--styles')) {
    const sujets = SUJETS_TEST.map((id) => ESPECES_PAR_ID[id]).filter(Boolean);
    for (const style of Object.values(STYLES)) await lot(sujets, style, c, format);
  } else {
    const style = STYLES[a('--style') ?? 'gouache'];
    if (!style) { console.error(`Style inconnu. Connus : ${Object.keys(STYLES).join(', ')}`); process.exit(2); }
    const especes = args.includes('--tout')
      ? ESPECES
      : SUJETS_TEST.map((id) => ESPECES_PAR_ID[id]).filter(Boolean);
    await lot(especes, style, c, format);
  }
} catch (err) {
  if (!(err instanceof PanneFatale)) throw err;
  console.error(`\nLot interrompu : ${err.message}`);
  console.error(`→ ${err.remede}`);
  process.exitCode = 1;
} finally {
  // Même après une interruption, le manifeste décrit ce qui est réellement
  // sur le disque : le client ne doit jamais demander une image absente.
  const n = ecrireManifeste();
  console.log(`\nManifeste : ${n} illustration(s) recensée(s).`);
}
