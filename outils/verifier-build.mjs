/**
 * Vérification post-build : la fonction serverless importe le serveur compilé.
 * Mieux vaut échouer ici, avec un message clair, qu'au premier appel d'API.
 */
import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const racine = process.cwd();
const attendus = [
  'packages/engine/dist/index.js',
  'packages/server/dist/index.js',
  'packages/client/dist/index.html',
];

let manquant = false;
for (const rel of attendus) {
  try {
    await access(path.join(racine, rel));
    console.log(`  ✓ ${rel}`);
  } catch {
    console.error(`  ✗ ${rel} est absent`);
    manquant = true;
  }
}
if (manquant) {
  console.error('\nBuild incomplet : la fonction /api ne pourrait pas démarrer.');
  process.exit(1);
}

// On charge réellement le module, pour détecter une erreur d'import au plus tôt.
const mod = await import(pathToFileURL(path.join(racine, 'api', 'index.mjs')).href);
if (typeof mod.default !== 'function') {
  console.error("api/index.mjs n'exporte pas de gestionnaire de requêtes.");
  process.exit(1);
}
console.log('  ✓ api/index.mjs se charge et exporte un gestionnaire');
