import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { base, urlPostgres } from './db.js';
import { routes } from './routes.js';

export function creerApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: CONFIG.origine }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/sante', (_req, res) => {
    res.json({
      ok: true,
      base: urlPostgres() ? 'postgres' : 'sqlite',
      version: '2.0.0',
      heure: Date.now(),
    });
  });

  app.use('/api', routes);

  // Gestionnaire d'erreurs : jamais de stack trace envoyée au client.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ): void => {
      console.error('[arene]', err);
      if (res.headersSent) return;
      res.status(500).json({ erreur: 'Erreur interne du serveur.' });
    },
  );

  // En production on sert aussi le client construit.
  if (fs.existsSync(CONFIG.dossierClient)) {
    app.use(express.static(CONFIG.dossierClient));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(CONFIG.dossierClient, 'index.html'));
    });
  }

  return app;
}

export const app = creerApp();

const estPointDEntree =
  process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (estPointDEntree) {
  base()
    .then(() => {
      app.listen(CONFIG.port, () => {
        console.log(
          `⚔️  Arène V2 sur http://localhost:${CONFIG.port} — base ${urlPostgres() ? 'postgres' : 'sqlite'}`,
        );
      });
    })
    .catch((e) => {
      console.error('Impossible d’initialiser la base :', e);
      process.exit(1);
    });
}

export default app;
