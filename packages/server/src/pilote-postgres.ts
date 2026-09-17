import { instructionsSchema, versPlaceholdersPg, type Pilote } from './pilote.js';

/**
 * Pilote Postgres, utilisé en déploiement serverless (Vercel + Neon).
 * Un pool global est réutilisé entre les invocations à chaud.
 */
export async function creerPilotePostgres(url: string): Promise<Pilote> {
  const pg = await import('pg');
  const Pool = pg.default?.Pool ?? (pg as unknown as { Pool: typeof pg.Pool }).Pool;

  const globalRef = globalThis as unknown as { __arenePool?: InstanceType<typeof Pool> };
  const pool =
    globalRef.__arenePool ??
    new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    });
  globalRef.__arenePool = pool;

  const faire = async <T>(client: { query: Function }, sql: string, params: unknown[]) => {
    const r = (await client.query(versPlaceholdersPg(sql), params)) as { rows: T[] };
    return r.rows;
  };

  const base = (client: { query: Function }): Pilote => ({
    dialecte: 'postgres',
    async run(sql, params = []) {
      await faire(client, sql, params);
    },
    async get<T>(sql: string, params: unknown[] = []) {
      const rows = await faire<T>(client, sql, params);
      return rows[0];
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return faire<T>(client, sql, params);
    },
    async tx<T>(fn: (p: Pilote) => Promise<T>): Promise<T> {
      // Déjà dans une transaction : on réutilise le même client.
      return fn(base(client));
    },
    async init() {
      for (const sql of instructionsSchema('postgres')) await faire(client, sql, []);
    },
    async fermer() {
      /* le pool est partagé, on ne le ferme pas ici */
    },
  });

  const pilote: Pilote = {
    ...base(pool as unknown as { query: Function }),
    async tx<T>(fn: (p: Pilote) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const r = await fn(base(client as unknown as { query: Function }));
        await client.query('COMMIT');
        return r;
      } catch (e) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* rien à annuler */
        }
        throw e;
      } finally {
        client.release();
      }
    },
    async fermer() {
      await pool.end();
    },
  };
  return pilote;
}
