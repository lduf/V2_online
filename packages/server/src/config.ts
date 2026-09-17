import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const racine = path.resolve(process.cwd());

function secretPersistant(): string {
  if (process.env.ARENE_SECRET) return process.env.ARENE_SECRET;
  const dossier = process.env.ARENE_DATA_DIR
    ? path.resolve(process.env.ARENE_DATA_DIR)
    : path.join(racine, 'donnees');
  fs.mkdirSync(dossier, { recursive: true });
  const fichier = path.join(dossier, '.secret');
  if (fs.existsSync(fichier)) return fs.readFileSync(fichier, 'utf8').trim();
  // Aucun secret fourni : on en génère un et on le garde entre deux démarrages
  // pour ne pas invalider toutes les sessions à chaque redémarrage.
  const secret = randomBytes(48).toString('hex');
  fs.writeFileSync(fichier, secret, { mode: 0o600 });
  return secret;
}

export const CONFIG = {
  port: Number(process.env.PORT ?? 3000),
  dossierDonnees: process.env.ARENE_DATA_DIR
    ? path.resolve(process.env.ARENE_DATA_DIR)
    : path.join(racine, 'donnees'),
  secret: secretPersistant(),
  dureeToken: 30 * 24 * 60 * 60, // secondes
  origine: process.env.ARENE_ORIGINE ?? '*',
  /** Dossier du build client servi en production. */
  dossierClient: path.join(racine, 'packages', 'client', 'dist'),
  debutSaison: Number(process.env.ARENE_DEBUT_SAISON ?? Date.parse('2026-01-05T00:00:00Z')),
};

fs.mkdirSync(CONFIG.dossierDonnees, { recursive: true });
