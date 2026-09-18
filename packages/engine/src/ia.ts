import { actionsPossibles, autreCote, jouerAction, vuePour } from './combat.js';
import { Rng } from './rng.js';
import type { BattleAction, Cote, EtatCombat, UniteCombat } from './types.js';

export type Difficulte = 'FACILE' | 'NORMAL' | 'DIFFICILE';

export const LIBELLES_DIFFICULTE: Record<Difficulte, string> = {
  FACILE: 'Sparring',
  NORMAL: 'Championnat',
  DIFFICILE: 'Cauchemar',
};

/**
 * Le journal n'influence jamais les règles : on le vide avant de cloner,
 * ce qui rend les simulations de l'IA nettement moins coûteuses.
 */
function clone(etat: EtatCombat): EtatCombat {
  const journal = etat.journal;
  etat.journal = [];
  const copie = structuredClone(etat);
  etat.journal = journal;
  return copie;
}

/** Évaluation de position, du point de vue de `cote`. Positif = avantage. */
export function evaluer(etat: EtatCombat, cote: Cote): number {
  if (etat.phase === 'TERMINE') {
    if (etat.vainqueur === cote) return 10000;
    if (etat.vainqueur === null) return 0;
    return -10000;
  }
  const scoreEquipe = (c: Cote): number => {
    const eq = etat.equipes[c];
    let s = 0;
    eq.unites.forEach((u, i) => {
      if (u.ko) return;
      const vie = (u.pv + u.bouclier * 0.8) / u.pvMax;
      // L'unité active pèse davantage.
      const poids = i === eq.actif ? 1.35 : 0.85;
      s += (60 + 100 * vie) * poids;
      s += u.energie * 0.18;
      for (const st of u.statuts) {
        const mauvais = ['BRULURE', 'POISON', 'GEL', 'ETOURDI', 'MALEDICTION', 'SAIGNEMENT', 'CONFUSION'];
        s += mauvais.includes(st.id) ? -9 * st.duree : 7 * st.duree;
      }
      for (const k of ['atq', 'def', 'mag', 'res', 'vit', 'chance'] as const) {
        s += u.paliers[k] * 6;
      }
    });
    return s;
  };
  return scoreEquipe(cote) - scoreEquipe(autreCote(cote));
}

/**
 * Avantage de profil : mon meilleur sort tape-t-il la défense la plus faible
 * de l'adversaire, et l'inverse est-il vrai ? Remplace l'ancien avantage
 * élémentaire — l'IA lit maintenant la même chose que le joueur.
 */
function avantage(a: UniteCombat, d: UniteCombat): number {
  const lecture = (att: UniteCombat, def: UniteCombat): number => {
    const physique = att.sorts.some((s) => s.def.categorie === 'PHYSIQUE' && s.puissance > 0);
    const magique = att.sorts.some((s) => s.def.categorie === 'MAGIQUE' && s.puissance > 0);
    // Une défense basse en face du bon type de dégâts vaut un avantage.
    const ecart = (def.stats.res - def.stats.def) / Math.max(1, def.stats.def + def.stats.res);
    let v = 0;
    if (physique) v += ecart;
    if (magique) v -= ecart;
    return v;
  };
  return lecture(a, d) - lecture(d, a);
}

/** Choix glouton rapide, utilisé pour simuler la riposte adverse. */
function meilleureActionRapide(etat: EtatCombat, cote: Cote, rng: Rng): BattleAction | null {
  const actions = actionsPossibles(etat, cote).filter((a) => a.type !== 'ABANDON');
  if (actions.length === 0) return null;
  let best: BattleAction | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    const sim = clone(etat);
    sim.rng = rng.state;
    try {
      jouerAction(sim, cote, a);
    } catch {
      continue;
    }
    const s = evaluer(sim, cote);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return best ?? actions[0];
}

export interface ChoixIa {
  action: BattleAction;
  score: number;
}

/**
 * Choisit l'action de l'IA.
 * - FACILE : souvent l'action « évidente », parfois n'importe quoi.
 * - NORMAL : recherche gloutonne à 1 demi-coup.
 * - DIFFICILE : 2 demi-coups (mon action, puis la meilleure riposte), moyennée
 *   sur plusieurs tirages de dés pour ne pas se faire piéger par la variance.
 */
export function choisirAction(
  etat: EtatCombat,
  cote: Cote,
  difficulte: Difficulte,
  seed: number,
): ChoixIa {
  const rng = new Rng(seed);
  const actions = actionsPossibles(etat, cote).filter((a) => a.type !== 'ABANDON');
  if (actions.length === 0) {
    return { action: { type: 'ATTAQUE' }, score: 0 };
  }

  if (difficulte === 'FACILE' && rng.chance(45)) {
    return { action: rng.pick(actions), score: 0 };
  }

  /** Biais de bon sens, indépendants de la simulation. */
  const biais = (a: BattleAction): number => {
    let b = 0;
    if (a.type === 'SWITCH') {
      const eq = etat.equipes[cote];
      const entrant = eq.unites[a.index];
      const advEq = etat.equipes[autreCote(cote)];
      b += avantage(entrant, advEq.unites[advEq.actif]) * 22;
      b -= 26; // changer coûte un tour entier
    }
    if (a.type === 'GARDE') b -= 14;
    return b;
  };

  /** Évalue une action sur `n` tirages de dés, éventuellement avec la riposte adverse. */
  const evaluerAction = (a: BattleAction, n: number, avecRiposte: boolean): number => {
    let total = 0;
    let valides = 0;
    for (let i = 0; i < n; i++) {
      const sim = clone(etat);
      sim.rng = (rng.state ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0;
      try {
        jouerAction(sim, cote, a);
      } catch {
        continue;
      }
      if (avecRiposte && sim.phase === 'CHOIX') {
        const adverse = autreCote(cote);
        if (vuePour(sim, cote).auTour === adverse) {
          const riposte = meilleureActionRapide(sim, adverse, rng);
          if (riposte) {
            try {
              jouerAction(sim, adverse, riposte);
            } catch {
              /* riposte impossible : on garde la position telle quelle */
            }
          }
        }
      }
      total += evaluer(sim, cote);
      valides++;
    }
    return valides === 0 ? -Infinity : total / valides + biais(a);
  };

  // Première passe : recherche large mais peu profonde.
  const classees = actions
    .map((a) => ({ a, score: evaluerAction(a, difficulte === 'FACILE' ? 1 : 2, false) }))
    .sort((x, y) => y.score - x.score);

  let best = classees[0]?.a ?? actions[0];
  let bestScore = classees[0]?.score ?? 0;

  // Seconde passe : seules les meilleures actions sont approfondies.
  if (difficulte === 'DIFFICILE') {
    bestScore = -Infinity;
    for (const { a } of classees.slice(0, 3)) {
      const s = evaluerAction(a, 3, true);
      if (s > bestScore) {
        bestScore = s;
        best = a;
      }
    }
  } else if (difficulte === 'FACILE') {
    // On brouille volontairement le classement pour laisser des ouvertures.
    const melange = classees.map((c) => ({ ...c, score: c.score + rng.int(-60, 60) }));
    melange.sort((x, y) => y.score - x.score);
    best = melange[0].a;
    bestScore = melange[0].score;
  }

  return { action: best, score: bestScore };
}

/** Choix du remplaçant après un KO. */
export function choisirRemplacant(etat: EtatCombat, cote: Cote, difficulte: Difficulte, seed: number): number {
  const eq = etat.equipes[cote];
  const advEq = etat.equipes[autreCote(cote)];
  const adv = advEq.unites[advEq.actif];
  const candidats = eq.unites.map((u, i) => ({ u, i })).filter((x) => !x.u.ko && x.i !== eq.actif);
  if (candidats.length === 0) return eq.actif;
  if (difficulte === 'FACILE') {
    return new Rng(seed).pick(candidats).i;
  }
  let best = candidats[0];
  let bestScore = -Infinity;
  for (const c of candidats) {
    const s = avantage(c.u, adv) * 40 + (c.u.pv / c.u.pvMax) * 60 + c.u.stats.vit * 0.1;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best.i;
}
