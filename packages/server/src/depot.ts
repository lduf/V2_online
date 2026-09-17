import {
  ELO_DEPART,
  evsVides,
  ivsVides,
  Rng,
  rosterDepart,
  seedAleatoire,
  uid,
  type EvsPerso,
  type IvsPerso,
  type IvsSort,
  type PersoPossede,
  type SortPossede,
} from '@arene/engine';
import {
  base,
  nombre,
  normaliserCompte,
  type LigneCompte,
  type LignePerso,
  type LigneSort,
} from './db.js';
import type { Pilote } from './pilote.js';

export function versPerso(l: LignePerso): PersoPossede {
  return {
    uid: l.uid,
    especeId: l.espece_id,
    surnom: l.surnom ?? undefined,
    niveau: nombre(l.niveau),
    xp: nombre(l.xp),
    ivs: JSON.parse(l.ivs) as IvsPerso,
    evs: JSON.parse(l.evs) as EvsPerso,
    natureId: l.nature_id,
    sorts: JSON.parse(l.sorts) as (string | null)[],
    itemId: l.item_id,
    obtenuLe: nombre(l.obtenu_le),
    chromatique: nombre(l.chromatique) === 1,
  };
}

export function versSort(l: LigneSort): SortPossede {
  return {
    uid: l.uid,
    defId: l.def_id,
    ivs: JSON.parse(l.ivs) as IvsSort,
    obtenuLe: nombre(l.obtenu_le),
    prisme: nombre(l.prisme) === 1,
  };
}

// ───────────────────────────── Comptes ─────────────────────────────

export async function compteParId(id: string): Promise<LigneCompte | undefined> {
  return compteParIdAvec(await base(), id);
}

/**
 * Variante prenant le pilote en argument. Indispensable à l'intérieur d'une
 * transaction : passer par le pool réclamerait une seconde connexion, ce qui
 * peut bloquer indéfiniment quand le pool est étroit (cas du serverless).
 */
export async function compteParIdAvec(db: Pilote, id: string): Promise<LigneCompte | undefined> {
  const l = await db.get<LigneCompte>('SELECT * FROM comptes WHERE id = ?', [id]);
  return l ? normaliserCompte(l) : undefined;
}

export async function compteParPseudo(pseudo: string): Promise<LigneCompte | undefined> {
  const db = await base();
  const l = await db.get<LigneCompte>('SELECT * FROM comptes WHERE pseudo_lower = ?', [
    pseudo.trim().toLowerCase(),
  ]);
  return l ? normaliserCompte(l) : undefined;
}

export function publicCompte(c: LigneCompte) {
  const { mot_de_passe: _mdp, pseudo_lower: _pl, ...reste } = c;
  return reste;
}

export async function ajouterPerso(db: Pilote, compte: string, p: PersoPossede): Promise<void> {
  await db.run(
    `INSERT INTO persos (uid, compte, espece_id, surnom, niveau, xp, ivs, evs, nature_id, sorts, item_id, obtenu_le, chromatique)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.uid,
      compte,
      p.especeId,
      p.surnom ?? null,
      p.niveau,
      p.xp,
      JSON.stringify(p.ivs),
      JSON.stringify(p.evs),
      p.natureId,
      JSON.stringify(p.sorts),
      p.itemId,
      p.obtenuLe,
      p.chromatique ? 1 : 0,
    ],
  );
}

export async function ajouterSort(db: Pilote, compte: string, s: SortPossede): Promise<void> {
  await db.run(
    'INSERT INTO sorts_possedes (uid, compte, def_id, ivs, obtenu_le, prisme) VALUES (?, ?, ?, ?, ?, ?)',
    [s.uid, compte, s.defId, JSON.stringify(s.ivs), s.obtenuLe, s.prisme ? 1 : 0],
  );
}

export async function definirEquipe(db: Pilote, compte: string, membres: string[]): Promise<void> {
  await db.run(
    `INSERT INTO equipes (compte, membres) VALUES (?, ?)
     ON CONFLICT (compte) DO UPDATE SET membres = EXCLUDED.membres`,
    [compte, JSON.stringify(membres)],
  );
}

export const CREDITS_DEPART = 2500;
export const ECLATS_DEPART = 60;

/** Création d'un compte avec son roster de départ et une équipe pré-remplie. */
export async function creerCompte(pseudo: string, hash: string): Promise<LigneCompte> {
  const db = await base();
  const id = uid('c');
  const maintenant = Date.now();

  await db.tx(async (tx) => {
    await tx.run(
      `INSERT INTO comptes (id, pseudo, pseudo_lower, mot_de_passe, credits, eclats, elo, cree_le, vu_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        pseudo.trim(),
        pseudo.trim().toLowerCase(),
        hash,
        CREDITS_DEPART,
        ECLATS_DEPART,
        ELO_DEPART,
        maintenant,
        maintenant,
      ],
    );
    const rng = new Rng(seedAleatoire());
    const { persos, sorts } = rosterDepart(rng);
    for (const s of sorts.values()) await ajouterSort(tx, id, s);
    for (const p of persos) await ajouterPerso(tx, id, p);
    await definirEquipe(
      tx,
      id,
      persos.slice(0, 3).map((p) => p.uid),
    );
  });

  return (await compteParId(id))!;
}

export async function majVu(id: string): Promise<void> {
  const db = await base();
  await db.run('UPDATE comptes SET vu_le = ? WHERE id = ?', [Date.now(), id]);
}

// ───────────────────────────── Collections ─────────────────────────────

export async function persosDe(compte: string): Promise<PersoPossede[]> {
  const db = await base();
  const lignes = await db.all<LignePerso>(
    'SELECT * FROM persos WHERE compte = ? ORDER BY obtenu_le',
    [compte],
  );
  return lignes.map(versPerso);
}

export async function persoDe(compte: string, uidPerso: string): Promise<PersoPossede | undefined> {
  const db = await base();
  const l = await db.get<LignePerso>('SELECT * FROM persos WHERE compte = ? AND uid = ?', [
    compte,
    uidPerso,
  ]);
  return l ? versPerso(l) : undefined;
}

export async function sortsDe(compte: string): Promise<SortPossede[]> {
  const db = await base();
  const lignes = await db.all<LigneSort>(
    'SELECT * FROM sorts_possedes WHERE compte = ? ORDER BY obtenu_le',
    [compte],
  );
  return lignes.map(versSort);
}

export async function carteSortsDe(compte: string): Promise<Map<string, SortPossede>> {
  return new Map((await sortsDe(compte)).map((s) => [s.uid, s]));
}

export async function itemsDe(compte: string): Promise<Record<string, number>> {
  const db = await base();
  const lignes = await db.all<{ item_id: string; quantite: number }>(
    'SELECT item_id, quantite FROM items_possedes WHERE compte = ?',
    [compte],
  );
  return Object.fromEntries(lignes.map((l) => [l.item_id, nombre(l.quantite)]));
}

export async function ajouterItem(
  db: Pilote,
  compte: string,
  itemId: string,
  quantite = 1,
): Promise<void> {
  await db.run(
    `INSERT INTO items_possedes (compte, item_id, quantite) VALUES (?, ?, ?)
     ON CONFLICT (compte, item_id) DO UPDATE SET quantite = items_possedes.quantite + ?`,
    [compte, itemId, quantite, quantite],
  );
}

export async function equipeDe(compte: string): Promise<string[]> {
  const db = await base();
  const l = await db.get<{ membres: string }>('SELECT membres FROM equipes WHERE compte = ?', [
    compte,
  ]);
  if (!l) return [];
  try {
    return JSON.parse(l.membres) as string[];
  } catch {
    return [];
  }
}

export async function majPerso(db: Pilote, compte: string, p: PersoPossede): Promise<void> {
  await db.run(
    `UPDATE persos SET surnom = ?, niveau = ?, xp = ?, ivs = ?, evs = ?, nature_id = ?, sorts = ?, item_id = ?
     WHERE uid = ? AND compte = ?`,
    [
      p.surnom ?? null,
      p.niveau,
      p.xp,
      JSON.stringify(p.ivs),
      JSON.stringify(p.evs),
      p.natureId,
      JSON.stringify(p.sorts),
      p.itemId,
      p.uid,
      compte,
    ],
  );
}

export async function majSort(db: Pilote, compte: string, s: SortPossede): Promise<void> {
  await db.run('UPDATE sorts_possedes SET ivs = ? WHERE uid = ? AND compte = ?', [
    JSON.stringify(s.ivs),
    s.uid,
    compte,
  ]);
}

export async function sortDe(compte: string, uidSort: string): Promise<SortPossede | undefined> {
  const db = await base();
  const l = await db.get<LigneSort>('SELECT * FROM sorts_possedes WHERE compte = ? AND uid = ?', [
    compte,
    uidSort,
  ]);
  return l ? versSort(l) : undefined;
}

// ───────────────────────────── Classement ─────────────────────────────

export interface LigneClassement {
  rang: number;
  id: string;
  pseudo: string;
  elo: number;
  parties: number;
  victoires: number;
  defaites: number;
  serie: number;
}

export async function classement(limite = 100): Promise<LigneClassement[]> {
  const db = await base();
  const lignes = await db.all<Omit<LigneClassement, 'rang'>>(
    `SELECT id, pseudo, elo, parties, victoires, defaites, serie
     FROM comptes WHERE parties > 0 ORDER BY elo DESC, victoires DESC LIMIT ?`,
    [limite],
  );
  return lignes.map((l, i) => ({
    ...l,
    elo: nombre(l.elo),
    parties: nombre(l.parties),
    victoires: nombre(l.victoires),
    defaites: nombre(l.defaites),
    serie: nombre(l.serie),
    rang: i + 1,
  }));
}

export async function rangDe(compte: string): Promise<number | null> {
  const db = await base();
  const l = await db.get<{ rang: number }>(
    `SELECT COUNT(*) + 1 AS rang FROM comptes
     WHERE parties > 0 AND elo > (SELECT elo FROM comptes WHERE id = ?)`,
    [compte],
  );
  return l ? nombre(l.rang) : null;
}

export interface LigneMatch {
  id: string;
  mode: string;
  compte_a: string;
  compte_b: string | null;
  nom_a: string;
  nom_b: string;
  vainqueur: string | null;
  delta_a: number;
  delta_b: number;
  rounds: number;
  credits: number;
  xp: number;
  cree_le: number;
}

export async function enregistrerMatch(db: Pilote, m: LigneMatch): Promise<void> {
  await db.run(
    `INSERT INTO matchs (id, mode, compte_a, compte_b, nom_a, nom_b, vainqueur, delta_a, delta_b, rounds, credits, xp, cree_le)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.id,
      m.mode,
      m.compte_a,
      m.compte_b,
      m.nom_a,
      m.nom_b,
      m.vainqueur,
      m.delta_a,
      m.delta_b,
      m.rounds,
      m.credits,
      m.xp,
      m.cree_le,
    ],
  );
}

export async function historiqueDe(compte: string, limite = 25): Promise<LigneMatch[]> {
  const db = await base();
  const lignes = await db.all<LigneMatch>(
    'SELECT * FROM matchs WHERE compte_a = ? OR compte_b = ? ORDER BY cree_le DESC LIMIT ?',
    [compte, compte, limite],
  );
  return lignes.map((m) => ({
    ...m,
    delta_a: nombre(m.delta_a),
    delta_b: nombre(m.delta_b),
    rounds: nombre(m.rounds),
    credits: nombre(m.credits),
    xp: nombre(m.xp),
    cree_le: nombre(m.cree_le),
  }));
}

export function nouveauPersoVide(especeId: string, natureId: string): PersoPossede {
  return {
    uid: uid('p'),
    especeId,
    niveau: 1,
    xp: 0,
    ivs: ivsVides(),
    evs: evsVides(),
    natureId,
    sorts: [null, null, null, null],
    itemId: null,
    obtenuLe: Date.now(),
  };
}

export async function profilComplet(compteId: string) {
  const c = (await compteParId(compteId))!;
  const [persos, sorts, items, equipe, rang] = await Promise.all([
    persosDe(compteId),
    sortsDe(compteId),
    itemsDe(compteId),
    equipeDe(compteId),
    rangDe(compteId),
  ]);
  return { compte: { ...publicCompte(c), rang }, persos, sorts, items, equipe };
}
