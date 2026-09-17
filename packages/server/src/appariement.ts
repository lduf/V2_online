import { uid, type ModeMatch } from '@arene/engine';
import { base, nombre } from './db.js';
import { compteParId } from './depot.js';
import {
  adversaireFantome,
  ATTENTE_AVANT_FANTOME_MS,
  chargerEquipeJoueur,
  creerSession,
  type EquipeChargee,
  type JoueurCombat,
} from './combats.js';

interface LigneFile {
  compte: string;
  pseudo: string;
  elo: number;
  depuis: number;
  combat_id: string | null;
}

/** Fenêtre d'ELO acceptée, élargie avec le temps d'attente. */
function fenetre(attenteMs: number): number {
  return 120 + (attenteMs / 1000) * 30;
}

export async function rejoindreFile(compteId: string): Promise<{ erreur?: string }> {
  const compte = await compteParId(compteId);
  if (!compte) return { erreur: 'Compte introuvable.' };
  const eq = await chargerEquipeJoueur(compteId);
  if ('erreur' in eq) return { erreur: eq.erreur };

  const db = await base();
  await db.run(
    `INSERT INTO file_attente (compte, pseudo, elo, depuis, combat_id) VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT (compte) DO UPDATE SET pseudo = EXCLUDED.pseudo, elo = EXCLUDED.elo`,
    [compteId, compte.pseudo, compte.elo, Date.now()],
  );
  return {};
}

export async function quitterFile(compteId: string): Promise<void> {
  const db = await base();
  await db.run('DELETE FROM file_attente WHERE compte = ? AND combat_id IS NULL', [compteId]);
}

export interface EtatFile {
  enFile: boolean;
  combatId: string | null;
  attenteMs: number;
  joueursEnFile: number;
}

/**
 * Le matchmaking n'a pas de boucle de fond (impossible en serverless) :
 * c'est chaque interrogation d'un joueur en attente qui tente un appariement.
 */
export async function etatFile(compteId: string): Promise<EtatFile> {
  const db = await base();
  // Purge des entrées fantômes (onglet fermé sans quitter la file).
  await db.run('DELETE FROM file_attente WHERE combat_id IS NULL AND depuis < ?', [
    Date.now() - 5 * 60_000,
  ]);

  let moi = await db.get<LigneFile>('SELECT * FROM file_attente WHERE compte = ?', [compteId]);
  if (!moi) return { enFile: false, combatId: null, attenteMs: 0, joueursEnFile: 0 };

  if (moi.combat_id) {
    await db.run('DELETE FROM file_attente WHERE compte = ?', [compteId]);
    return {
      enFile: false,
      combatId: moi.combat_id,
      attenteMs: Date.now() - nombre(moi.depuis),
      joueursEnFile: 0,
    };
  }

  const attente = Date.now() - nombre(moi.depuis);
  const combatId = await tenterAppariement(compteId, nombre(moi.elo), attente);
  if (combatId) {
    await db.run('DELETE FROM file_attente WHERE compte = ?', [compteId]);
    return { enFile: false, combatId, attenteMs: attente, joueursEnFile: 0 };
  }

  const compte = await db.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM file_attente WHERE combat_id IS NULL',
  );
  return {
    enFile: true,
    combatId: null,
    attenteMs: attente,
    joueursEnFile: nombre(compte?.n ?? 1),
  };
}

async function tenterAppariement(
  compteId: string,
  elo: number,
  attente: number,
): Promise<string | null> {
  const db = await base();
  const candidats = await db.all<LigneFile>(
    'SELECT * FROM file_attente WHERE combat_id IS NULL AND compte <> ? ORDER BY depuis',
    [compteId],
  );

  for (const c of candidats) {
    const attenteAutre = Date.now() - nombre(c.depuis);
    const marge = Math.max(fenetre(attente), fenetre(attenteAutre));
    if (Math.abs(nombre(c.elo) - elo) > marge) continue;

    const idCombat = uid('m');
    // Réservation atomique des deux places : si un autre appariement a déjà
    // pris l'un des deux joueurs, la vérification échoue et on passe au suivant.
    const reserve = await db.tx(async (tx) => {
      await tx.run(
        'UPDATE file_attente SET combat_id = ? WHERE compte IN (?, ?) AND combat_id IS NULL',
        [idCombat, compteId, c.compte],
      );
      const lignes = await tx.all<LigneFile>(
        'SELECT * FROM file_attente WHERE compte IN (?, ?)',
        [compteId, c.compte],
      );
      return lignes.length === 2 && lignes.every((l) => l.combat_id === idCombat);
    });
    if (!reserve) continue;

    try {
      const a = await preparerJoueur(compteId);
      const b = await preparerJoueur(c.compte);
      if (!a || !b) throw new Error('Équipe invalide');
      await creerSession('CLASSE', true, a, b, idCombat);
      return idCombat;
    } catch {
      await db.run('UPDATE file_attente SET combat_id = NULL WHERE combat_id = ?', [idCombat]);
      return null;
    }
  }

  // Personne en face : on sert l'équipe d'un autre joueur, pilotée par l'IA.
  if (attente >= ATTENTE_AVANT_FANTOME_MS) {
    const moi = await preparerJoueur(compteId);
    if (!moi) return null;
    const idCombat = uid('m');
    const reserve = await db.tx(async (tx) => {
      await tx.run(
        'UPDATE file_attente SET combat_id = ? WHERE compte = ? AND combat_id IS NULL',
        [idCombat, compteId],
      );
      const l = await tx.get<LigneFile>('SELECT * FROM file_attente WHERE compte = ?', [compteId]);
      return l?.combat_id === idCombat;
    });
    if (!reserve) return null;
    const fantome = await adversaireFantome(compteId, moi.joueur.elo);
    await creerSession('CLASSE', true, moi, fantome, idCombat);
    return idCombat;
  }
  return null;
}

async function preparerJoueur(
  compteId: string,
): Promise<{ joueur: JoueurCombat; equipe: EquipeChargee } | null> {
  const compte = await compteParId(compteId);
  if (!compte) return null;
  const eq = await chargerEquipeJoueur(compteId);
  if ('erreur' in eq) return null;
  return {
    joueur: { compteId, pseudo: compte.pseudo, elo: compte.elo, persos: eq.persos },
    equipe: eq,
  };
}

// ───────────────────────────── Salons privés ─────────────────────────────

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genererCode(): string {
  return Array.from(
    { length: 5 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join('');
}

export async function creerSalon(compteId: string): Promise<{ code?: string; erreur?: string }> {
  const eq = await chargerEquipeJoueur(compteId);
  if ('erreur' in eq) return { erreur: eq.erreur };
  const db = await base();
  await db.run('DELETE FROM salons WHERE hote = ? AND combat_id IS NULL', [compteId]);
  await db.run('DELETE FROM salons WHERE cree_le < ?', [Date.now() - 30 * 60_000]);
  for (let essai = 0; essai < 8; essai++) {
    const code = genererCode();
    const existe = await db.get('SELECT code FROM salons WHERE code = ?', [code]);
    if (existe) continue;
    await db.run('INSERT INTO salons (code, hote, cree_le, combat_id) VALUES (?, ?, ?, NULL)', [
      code,
      compteId,
      Date.now(),
    ]);
    return { code };
  }
  return { erreur: 'Impossible de créer un salon, réessaie.' };
}

export async function etatSalon(
  compteId: string,
  code: string,
): Promise<{ combatId: string | null; existe: boolean }> {
  const db = await base();
  const s = await db.get<{ code: string; hote: string; combat_id: string | null }>(
    'SELECT * FROM salons WHERE code = ?',
    [code.toUpperCase()],
  );
  if (!s || s.hote !== compteId) return { combatId: null, existe: !!s };
  if (s.combat_id) {
    await db.run('DELETE FROM salons WHERE code = ?', [s.code]);
    return { combatId: s.combat_id, existe: true };
  }
  return { combatId: null, existe: true };
}

export async function rejoindreSalon(
  compteId: string,
  code: string,
): Promise<{ combatId?: string; erreur?: string }> {
  const db = await base();
  const salon = await db.get<{ code: string; hote: string; combat_id: string | null }>(
    'SELECT * FROM salons WHERE code = ?',
    [code.toUpperCase().trim()],
  );
  if (!salon) return { erreur: 'Ce salon n’existe pas (ou plus).' };
  if (salon.combat_id) return { erreur: 'Ce salon a déjà démarré.' };
  if (salon.hote === compteId) return { erreur: 'Tu ne peux pas rejoindre ton propre salon.' };

  const a = await preparerJoueur(salon.hote);
  const b = await preparerJoueur(compteId);
  if (!a) return { erreur: 'L’hôte n’a pas d’équipe valide.' };
  if (!b) return { erreur: 'Ton équipe n’est pas valide.' };

  const idCombat = uid('m');
  const reserve = await db.tx(async (tx) => {
    await tx.run('UPDATE salons SET combat_id = ? WHERE code = ? AND combat_id IS NULL', [
      idCombat,
      salon.code,
    ]);
    const l = await tx.get<{ combat_id: string | null }>(
      'SELECT combat_id FROM salons WHERE code = ?',
      [salon.code],
    );
    return l?.combat_id === idCombat;
  });
  if (!reserve) return { erreur: 'Ce salon vient d’être pris.' };

  await creerSession('AMICAL', false, a, b, idCombat);
  return { combatId: idCombat };
}

export type { ModeMatch };
