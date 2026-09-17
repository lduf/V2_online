/**
 * Point d'entrée serverless (Vercel).
 * La plateforme sert les fichiers statiques ; cette fonction ne gère que /api.
 */
import { creerApp } from '../packages/server/dist/index.js';

const app = creerApp({ servirClient: false });

export default function handler(req, res) {
  return app(req, res);
}
