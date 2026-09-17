import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { CONFIG } from './config.js';
import { compteParId } from './depot.js';
import type { LigneCompte } from './db.js';

export interface RequeteAuth extends Request {
  compte?: LigneCompte;
}

export function hacher(motDePasse: string): string {
  return bcrypt.hashSync(motDePasse, 10);
}

export function verifier(motDePasse: string, hash: string): boolean {
  return bcrypt.compareSync(motDePasse, hash);
}

export function signerToken(compteId: string): string {
  return jwt.sign({ sub: compteId }, CONFIG.secret, { expiresIn: CONFIG.dureeToken });
}

export function lireToken(token: string): string | null {
  try {
    const charge = jwt.verify(token, CONFIG.secret) as { sub?: string };
    return charge.sub ?? null;
  } catch {
    return null;
  }
}

export function middlewareAuth(req: RequeteAuth, res: Response, next: NextFunction): void {
  const entete = req.headers.authorization;
  const token = entete?.startsWith('Bearer ') ? entete.slice(7) : null;
  if (!token) {
    res.status(401).json({ erreur: 'Authentification requise.' });
    return;
  }
  const id = lireToken(token);
  if (!id) {
    res.status(401).json({ erreur: 'Session expirée, reconnecte-toi.' });
    return;
  }
  compteParId(id)
    .then((compte) => {
      if (!compte) {
        res.status(401).json({ erreur: 'Session expirée, reconnecte-toi.' });
        return;
      }
      req.compte = compte;
      next();
    })
    .catch(next);
}

export const REGLES_PSEUDO = /^[a-zA-Z0-9_\-. ]{3,18}$/;

export function validerInscription(
  pseudo: unknown,
  motDePasse: unknown,
): { ok: true } | { ok: false; message: string } {
  if (typeof pseudo !== 'string' || !REGLES_PSEUDO.test(pseudo.trim())) {
    return {
      ok: false,
      message: 'Le pseudo doit faire 3 à 18 caractères (lettres, chiffres, espace, _ - .).',
    };
  }
  if (typeof motDePasse !== 'string' || motDePasse.length < 6) {
    return { ok: false, message: 'Le mot de passe doit faire au moins 6 caractères.' };
  }
  if (motDePasse.length > 200) {
    return { ok: false, message: 'Mot de passe trop long.' };
  }
  return { ok: true };
}
