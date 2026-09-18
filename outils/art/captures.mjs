#!/usr/bin/env node
/**
 * Capture la vitrine du composant Carte, section par section et style par
 * style.
 *
 *   npx vite --port 5174   (dans packages/client)
 *   node outils/art/captures.mjs [--url http://localhost:5174]
 *
 * Pourquoi piloter un vrai navigateur plutôt que de regarder les images
 * brutes : ce que voit le joueur, c'est le cadre de rareté, le recadrage du
 * panneau d'art et le bandeau de stats posés par-dessus l'illustration. Une
 * bible qui gagne en planche de comparaison peut perdre dans la carte.
 *
 * Playwright n'est pas une dépendance du dépôt : la production n'en a aucun
 * usage et la vitrine s'ouvre très bien à la main. On utilise celui de
 * l'environnement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/**
 * Playwright, qu'il soit dans le dépôt ou installé globalement.
 *
 * On ne l'ajoute pas aux dépendances : la production n'en a aucun usage, et
 * un navigateur de 300 Mo dans `npm install` pour un outil de validation
 * artistique, c'est cher payé. En contrepartie il faut aller le chercher —
 * NODE_PATH ne fonctionne pas pour les modules ES.
 */
async function chargerPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const racine = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const global = path.join(racine, 'playwright', 'index.js');
    if (!fs.existsSync(global)) {
      console.error('Playwright est introuvable, en local comme en global.');
      console.error('→ npm i -D playwright   ou   npm i -g playwright');
      process.exit(2);
    }
    return await import(pathToFileURL(global).href);
  }
}

// L'installation globale est en CommonJS : `import()` la range sous `default`.
const playwright = await chargerPlaywright();
const chromium = playwright.chromium ?? playwright.default?.chromium;

const args = process.argv.slice(2);
const URL_BASE = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:5174';
const SORTIE = path.resolve('outils/art/captures');

/** Les sections de la vitrine, par leur `id`. */
const SECTIONS = ['raretes', 'variantes', 'repli', 'tailles', 'fullart'];

fs.mkdirSync(SORTIE, { recursive: true });

const navigateur = await chromium.launch();
const page = await navigateur.newPage({
  viewport: { width: 1600, height: 1000 },
  // Les cartes sont pensées pour un écran dense : capturer à 1× donnerait une
  // image plus floue que ce que voit réellement un joueur.
  deviceScaleFactor: 2,
});

await page.goto(`${URL_BASE}/#vitrine`, { waitUntil: 'networkidle' });

// Les paillettes des Chromatiques et le balayage de lumière tournent en
// boucle : sans gel, deux captures du même état ne sont jamais identiques et
// aucune comparaison n'est possible.
await page.addStyleTag({
  content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
});

const styles = await page.$$eval('.demo-carte__styles button', (b) =>
  b.map((x) => x.getAttribute('data-style')),
);
console.log(`styles trouvés : ${styles.join(', ')}`);

for (const style of styles) {
  // On revient en haut avant de basculer : après la dernière section la page
  // est en bas, et le test de survol de Playwright tombe alors sur une carte
  // au lieu du bouton.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(`.demo-carte__styles button[data-style="${style}"]`);
  // Les illustrations sont en `loading="lazy"` : sans attente explicite, une
  // section hors écran se capture avant d'avoir chargé son image.
  await page.waitForFunction(
    () => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
    null,
    { timeout: 15000 },
  );
  for (const id of SECTIONS) {
    const cible = await page.$(`#${id}`);
    if (!cible) continue;
    const fichier = path.join(SORTIE, `${style}-${id}.png`);
    await cible.screenshot({ path: fichier });
    console.log(`  ${style}/${id} → ${Math.round(fs.statSync(fichier).size / 1024)} ko`);
  }
}

await navigateur.close();
console.log(`\nCaptures dans ${SORTIE}`);
