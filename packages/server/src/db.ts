import type { Pilote } from './pilote.js';

let piloteCourant: Pilote | null = null;
let pret: Promise<Pilote> | null = null;

/**
 * Choisit automatiquement le pilote : Postgres si une URL est fournie
 * (déploiement serverless), SQLite sinon (local / auto-hébergé).
 */
export function urlPostgres(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

async function construire(): Promise<Pilote> {
  const url = urlPostgres();
  const p = url
    ? await (await import('./pilote-postgres.js')).creerPilotePostgres(url)
    : await (await import('./pilote-sqlite.js')).creerPiloteSqlite();
  await p.init();
  piloteCourant = p;
  return p;
}

export function base(): Promise<Pilote> {
  if (!pret) pret = construire();
  return pret;
}

export function baseSync(): Pilote {
  if (!piloteCourant) throw new Error('La base n’est pas encore initialisée.');
  return piloteCourant;
}

export interface LigneCompte {
  id: string;
  pseudo: string;
  pseudo_lower: string;
  mot_de_passe: string;
  credits: number;
  eclats: number;
  elo: number;
  parties: number;
  victoires: number;
  defaites: number;
  serie: number;
  meilleure_serie: number;
  pitie_standard: number;
  pitie_legendaire: number;
  saison: number;
  cree_le: number;
  vu_le: number;
}

export interface LignePerso {
  uid: string;
  compte: string;
  espece_id: string;
  surnom: string | null;
  niveau: number;
  xp: number;
  ivs: string;
  evs: string;
  nature_id: string;
  sorts: string;
  item_id: string | null;
  obtenu_le: number;
}

export interface LigneSort {
  uid: string;
  compte: string;
  def_id: string;
  ivs: string;
  obtenu_le: number;
}

/** Postgres renvoie les BIGINT sous forme de chaîne : on normalise. */
export function nombre(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  if (typeof v === 'bigint') return Number(v);
  return 0;
}

export function normaliserCompte(c: LigneCompte): LigneCompte {
  return {
    ...c,
    credits: nombre(c.credits),
    eclats: nombre(c.eclats),
    elo: nombre(c.elo),
    parties: nombre(c.parties),
    victoires: nombre(c.victoires),
    defaites: nombre(c.defaites),
    serie: nombre(c.serie),
    meilleure_serie: nombre(c.meilleure_serie),
    pitie_standard: nombre(c.pitie_standard),
    pitie_legendaire: nombre(c.pitie_legendaire),
    saison: nombre(c.saison),
    cree_le: nombre(c.cree_le),
    vu_le: nombre(c.vu_le),
  };
}
