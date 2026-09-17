import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const racine = path.resolve(process.cwd());

/** Vrai en environnement serverless : le disque est en lecture seule. */
export const SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function dossierDonnees(): string {
  if (process.env.ARENE_DATA_DIR) return path.resolve(process.env.ARENE_DATA_DIR);
  return SERVERLESS ? '/tmp/arene' : path.join(racine, 'donnees');
}

function secretPersistant(): string {
  if (process.env.ARENE_SECRET) return process.env.ARENE_SECRET;
  // Sans secret fourni, on en garde un sur disque pour ne pas invalider toutes
  // les sessions à chaque redémarrage. En serverless le disque ne survit pas :
  // il faut impérativement définir ARENE_SECRET.
  try {
    const dossier = dossierDonnees();
    fs.mkdirSync(dossier, { recursive: true });
    const fichier = path.join(dossier, '.secret');
    if (fs.existsSync(fichier)) return fs.readFileSync(fichier, 'utf8').trim();
    const secret = randomBytes(48).toString('hex');
    fs.writeFileSync(fichier, secret, { mode: 0o600 });
    return secret;
  } catch {
    console.warn(
      '[arène] ARENE_SECRET n’est pas défini et le secret ne peut pas être écrit sur disque : ' +
        'un secret éphémère est utilisé, les joueurs seront déconnectés à chaque redémarrage.',
    );
    return randomBytes(48).toString('hex');
  }
}

export const CONFIG = {
  port: Number(process.env.PORT ?? 3000),
  dossierDonnees: dossierDonnees(),
  secret: secretPersistant(),
  /** Durée de validité des jetons, en secondes. */
  dureeToken: 30 * 24 * 60 * 60,
  origine: process.env.ARENE_ORIGINE ?? '*',
  /** Dossier du build client, servi en auto-hébergement uniquement. */
  dossierClient: path.join(racine, 'packages', 'client', 'dist'),
  debutSaison: Number(process.env.ARENE_DEBUT_SAISON ?? Date.parse('2026-01-05T00:00:00Z')),
  serverless: SERVERLESS,
};
