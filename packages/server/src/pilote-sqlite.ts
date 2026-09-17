import path from 'node:path';
import fs from 'node:fs';
import { CONFIG } from './config.js';
import { instructionsSchema, type Pilote } from './pilote.js';

type BetterSqlite = {
  prepare: (sql: string) => {
    run: (...p: unknown[]) => unknown;
    get: (...p: unknown[]) => unknown;
    all: (...p: unknown[]) => unknown[];
  };
  exec: (sql: string) => unknown;
  pragma: (s: string) => unknown;
  close: () => void;
};

export async function creerPiloteSqlite(): Promise<Pilote> {
  let Database: new (chemin: string) => BetterSqlite;
  try {
    Database = (await import('better-sqlite3')).default as unknown as new (
      chemin: string,
    ) => BetterSqlite;
  } catch (e) {
    throw new Error(
      'better-sqlite3 est introuvable. Installe-le pour l’auto-hébergement, ' +
        'ou définis DATABASE_URL pour utiliser Postgres.',
    );
  }
  fs.mkdirSync(CONFIG.dossierDonnees, { recursive: true });
  const db = new Database(path.join(CONFIG.dossierDonnees, 'arene.db'));
  db.pragma('journal_mode = WAL');

  let profondeurTx = 0;

  const pilote: Pilote = {
    dialecte: 'sqlite',
    async run(sql, params = []) {
      db.prepare(sql).run(...params);
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async tx<T>(fn: (p: Pilote) => Promise<T>): Promise<T> {
      // better-sqlite3 est synchrone : on gère les transactions à la main
      // pour pouvoir exposer une API asynchrone uniforme.
      if (profondeurTx > 0) return fn(pilote);
      db.exec('BEGIN');
      profondeurTx++;
      try {
        const r = await fn(pilote);
        db.exec('COMMIT');
        return r;
      } catch (e) {
        try {
          db.exec('ROLLBACK');
        } catch {
          /* la transaction était déjà terminée */
        }
        throw e;
      } finally {
        profondeurTx--;
      }
    },
    async init() {
      for (const sql of instructionsSchema('sqlite')) db.exec(sql);
    },
    async fermer() {
      db.close();
    },
  };
  return pilote;
}
