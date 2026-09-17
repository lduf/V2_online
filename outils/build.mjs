#!/usr/bin/env node
/**
 * Build de déploiement.
 *
 * Volontairement un script Node plutôt qu'une chaîne de scripts npm : avec des
 * workspaces, `npm run <script>` peut être propagé à chaque paquet, et un
 * paquet qui n'a pas ce script fait échouer tout le build. Ici l'ordre est
 * explicite et rien n'est laissé à l'interprétation.
 */
import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const racine = process.cwd();

function etape(titre, commande, args) {
  process.stdout.write(`\n▸ ${titre}\n`);
  const r = spawnSync(commande, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\n✗ Échec : ${titre}`);
    process.exit(r.status ?? 1);
  }
}

// L'ordre compte : le client et le serveur consomment le moteur compilé.
etape('Moteur', 'npm', ['run', 'build', '--workspace', '@arene/engine']);
etape('Client', 'npm', ['run', 'build', '--workspace', '@arene/client']);
etape('Serveur', 'npm', ['run', 'build', '--workspace', '@arene/server']);

process.stdout.write('\n▸ Vérification\n');
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

// On charge réellement la fonction, pour détecter une erreur d'import ici
// plutôt qu'au premier appel d'API en production.
const mod = await import(pathToFileURL(path.join(racine, 'api', 'index.mjs')).href);
if (typeof mod.default !== 'function') {
  console.error("  ✗ api/index.mjs n'exporte pas de gestionnaire de requêtes.");
  process.exit(1);
}
console.log('  ✓ api/index.mjs se charge et exporte un gestionnaire');
console.log('\n✓ Build terminé.\n');
