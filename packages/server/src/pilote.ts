/**
 * Couche d'accès SQL minimale, avec deux pilotes :
 *  - SQLite (better-sqlite3) pour le développement et l'auto-hébergement ;
 *  - Postgres (pg) pour le déploiement serverless, où le disque n'est pas persistant.
 *
 * Tout le reste du serveur écrit du SQL avec des paramètres `?` ; le pilote
 * Postgres les convertit en `$1, $2, …`.
 */
export interface Pilote {
  readonly dialecte: 'sqlite' | 'postgres';
  run(sql: string, params?: unknown[]): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Exécute `fn` dans une transaction. */
  tx<T>(fn: (p: Pilote) => Promise<T>): Promise<T>;
  init(): Promise<void>;
  fermer(): Promise<void>;
}

export function versPlaceholdersPg(sql: string): string {
  let i = 0;
  // On ignore les `?` situés dans une chaîne littérale.
  let dansChaine = false;
  let out = '';
  for (let k = 0; k < sql.length; k++) {
    const c = sql[k];
    if (c === "'") dansChaine = !dansChaine;
    if (c === '?' && !dansChaine) {
      i += 1;
      out += `$${i}`;
    } else {
      out += c;
    }
  }
  return out;
}

/** Schéma commun aux deux dialectes (SQL volontairement portable). */
export function instructionsSchema(dialecte: 'sqlite' | 'postgres'): string[] {
  const TEXTE = 'TEXT';
  const ENTIER = dialecte === 'postgres' ? 'BIGINT' : 'INTEGER';
  return [
    `CREATE TABLE IF NOT EXISTS comptes (
      id ${TEXTE} PRIMARY KEY,
      pseudo ${TEXTE} NOT NULL UNIQUE,
      pseudo_lower ${TEXTE} NOT NULL UNIQUE,
      mot_de_passe ${TEXTE} NOT NULL,
      credits ${ENTIER} NOT NULL DEFAULT 0,
      eclats ${ENTIER} NOT NULL DEFAULT 0,
      elo ${ENTIER} NOT NULL DEFAULT 1000,
      parties ${ENTIER} NOT NULL DEFAULT 0,
      victoires ${ENTIER} NOT NULL DEFAULT 0,
      defaites ${ENTIER} NOT NULL DEFAULT 0,
      serie ${ENTIER} NOT NULL DEFAULT 0,
      meilleure_serie ${ENTIER} NOT NULL DEFAULT 0,
      pitie_standard ${ENTIER} NOT NULL DEFAULT 0,
      pitie_legendaire ${ENTIER} NOT NULL DEFAULT 0,
      saison ${ENTIER} NOT NULL DEFAULT 1,
      cree_le ${ENTIER} NOT NULL,
      vu_le ${ENTIER} NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS persos (
      uid ${TEXTE} PRIMARY KEY,
      compte ${TEXTE} NOT NULL,
      espece_id ${TEXTE} NOT NULL,
      surnom ${TEXTE},
      niveau ${ENTIER} NOT NULL DEFAULT 1,
      xp ${ENTIER} NOT NULL DEFAULT 0,
      ivs ${TEXTE} NOT NULL,
      evs ${TEXTE} NOT NULL,
      nature_id ${TEXTE} NOT NULL,
      sorts ${TEXTE} NOT NULL,
      item_id ${TEXTE},
      obtenu_le ${ENTIER} NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_persos_compte ON persos(compte)`,
    `CREATE TABLE IF NOT EXISTS sorts_possedes (
      uid ${TEXTE} PRIMARY KEY,
      compte ${TEXTE} NOT NULL,
      def_id ${TEXTE} NOT NULL,
      ivs ${TEXTE} NOT NULL,
      obtenu_le ${ENTIER} NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sorts_compte ON sorts_possedes(compte)`,
    `CREATE TABLE IF NOT EXISTS items_possedes (
      compte ${TEXTE} NOT NULL,
      item_id ${TEXTE} NOT NULL,
      quantite ${ENTIER} NOT NULL DEFAULT 1,
      PRIMARY KEY (compte, item_id)
    )`,
    `CREATE TABLE IF NOT EXISTS equipes (
      compte ${TEXTE} PRIMARY KEY,
      membres ${TEXTE} NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS matchs (
      id ${TEXTE} PRIMARY KEY,
      mode ${TEXTE} NOT NULL,
      compte_a ${TEXTE} NOT NULL,
      compte_b ${TEXTE},
      nom_a ${TEXTE} NOT NULL,
      nom_b ${TEXTE} NOT NULL,
      vainqueur ${TEXTE},
      delta_a ${ENTIER} NOT NULL DEFAULT 0,
      delta_b ${ENTIER} NOT NULL DEFAULT 0,
      rounds ${ENTIER} NOT NULL DEFAULT 0,
      credits ${ENTIER} NOT NULL DEFAULT 0,
      xp ${ENTIER} NOT NULL DEFAULT 0,
      cree_le ${ENTIER} NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_matchs_a ON matchs(compte_a, cree_le)`,
    `CREATE INDEX IF NOT EXISTS idx_matchs_b ON matchs(compte_b, cree_le)`,
    // Les combats vivent en base : indispensable en serverless, où rien
    // ne survit d'une requête à l'autre.
    `CREATE TABLE IF NOT EXISTS combats (
      id ${TEXTE} PRIMARY KEY,
      mode ${TEXTE} NOT NULL,
      classe ${ENTIER} NOT NULL DEFAULT 0,
      etat ${TEXTE} NOT NULL,
      joueurs ${TEXTE} NOT NULL,
      termine ${ENTIER} NOT NULL DEFAULT 0,
      nb_evenements ${ENTIER} NOT NULL DEFAULT 0,
      resultats ${TEXTE},
      cree_le ${ENTIER} NOT NULL,
      maj_le ${ENTIER} NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS combat_evenements (
      combat_id ${TEXTE} NOT NULL,
      idx ${ENTIER} NOT NULL,
      charge ${TEXTE} NOT NULL,
      PRIMARY KEY (combat_id, idx)
    )`,
    `CREATE TABLE IF NOT EXISTS file_attente (
      compte ${TEXTE} PRIMARY KEY,
      pseudo ${TEXTE} NOT NULL,
      elo ${ENTIER} NOT NULL,
      depuis ${ENTIER} NOT NULL,
      combat_id ${TEXTE}
    )`,
    `CREATE TABLE IF NOT EXISTS progression_objectifs (
      compte ${TEXTE} NOT NULL,
      objectif_id ${TEXTE} NOT NULL,
      jour ${ENTIER} NOT NULL DEFAULT 0,
      valeur ${ENTIER} NOT NULL DEFAULT 0,
      reclame ${ENTIER} NOT NULL DEFAULT 0,
      PRIMARY KEY (compte, objectif_id, jour)
    )`,
    `CREATE TABLE IF NOT EXISTS tours (
      compte ${TEXTE} PRIMARY KEY,
      etat ${TEXTE} NOT NULL,
      combat_id ${TEXTE},
      niveau_equipe ${ENTIER} NOT NULL DEFAULT 10,
      jour_gratuit ${ENTIER} NOT NULL DEFAULT 0,
      cree_le ${ENTIER} NOT NULL,
      maj_le ${ENTIER} NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS salons (
      code ${TEXTE} PRIMARY KEY,
      hote ${TEXTE} NOT NULL,
      cree_le ${ENTIER} NOT NULL,
      combat_id ${TEXTE}
    )`,
  ];
}

/**
 * Ajouts de colonnes sur des tables existantes. Chaque instruction est jouée
 * isolément et son échec est ignoré : c'est la façon la plus simple d'obtenir
 * une migration idempotente qui marche sur les deux dialectes, SQLite ne
 * connaissant pas `ADD COLUMN IF NOT EXISTS`.
 */
export function instructionsMigration(dialecte: 'sqlite' | 'postgres'): string[] {
  const ENTIER = dialecte === 'postgres' ? 'BIGINT' : 'INTEGER';
  const TEXTE = 'TEXT';
  return [
    `ALTER TABLE persos ADD COLUMN chromatique ${ENTIER} NOT NULL DEFAULT 0`,
    `ALTER TABLE sorts_possedes ADD COLUMN prisme ${ENTIER} NOT NULL DEFAULT 0`,
    `ALTER TABLE comptes ADD COLUMN essence ${ENTIER} NOT NULL DEFAULT 0`,
    `ALTER TABLE comptes ADD COLUMN connexion_jour ${ENTIER} NOT NULL DEFAULT 0`,
    `ALTER TABLE comptes ADD COLUMN connexion_palier ${ENTIER} NOT NULL DEFAULT 0`,
    `ALTER TABLE comptes ADD COLUMN vu_intro ${TEXTE}`,
  ];
}
