import type { EquipeCombat, PersoPossede, Rarete, StatKey } from './types.js';
import { Rng } from './rng.js';
import { equipeBot, type EquipeGeneree } from './roster.js';

/**
 * La Tour des Rattrapages : dix étages d'affilée, sans régénération entre les
 * combats, avec un choix de bénédiction après chaque victoire. Une défaite
 * termine la tentative.
 *
 * C'est le mode qui fait qu'on lance le jeu sans raison : chaque tentative est
 * une histoire courte, avec des décisions qui comptent et une fin nette.
 */

export const ETAGES_TOUR = 10;

/**
 * Récupération automatique après chaque étage, en part des PV max.
 *
 * Sans elle, dix combats d'affilée à armes égales donnent une probabilité de
 * victoire de l'ordre de 0,5¹⁰ : la tentative se termine presque toujours au
 * deuxième ou troisième étage, quel que soit le niveau du joueur. L'attrition
 * reste le sel du mode, mais elle ne doit pas condamner la tentative d'avance.
 * Un personnage K.O. ne se relève pas pour autant : c'est là qu'est la tension.
 */
export const REGEN_ETAGE_BASE = 0.2;

export type EffetBonus =
  | { type: 'PV_MAX'; pourcent: number }
  | { type: 'SOIN'; pourcent: number }
  | { type: 'STAT'; stat: Exclude<StatKey, 'pv'>; pourcent: number }
  | { type: 'BOUCLIER_DEPART'; pourcentPvMax: number }
  | { type: 'ENERGIE_DEPART'; valeur: number }
  | { type: 'REGEN_ETAGE'; pourcent: number }
  | { type: 'CRIT'; points: number };

export interface BonusTour {
  id: string;
  nom: string;
  texte: string;
  emoji: string;
  rarete: Rarete;
  effets: EffetBonus[];
  /** Un bonus non cumulable ne sera plus proposé une fois pris. */
  unique?: boolean;
}

export const BONUS_TOUR: BonusTour[] = [
  {
    id: 'cafe_serre',
    nom: 'Café Serré',
    texte: '+18 % de Vitesse pour toute la tentative.',
    emoji: '☕',
    rarete: 'COMMUN',
    effets: [{ type: 'STAT', stat: 'vit', pourcent: 18 }],
  },
  {
    id: 'proteines',
    nom: 'Protéines du RU',
    texte: '+18 % d’Attaque pour toute la tentative.',
    emoji: '🍖',
    rarete: 'COMMUN',
    effets: [{ type: 'STAT', stat: 'atq', pourcent: 18 }],
  },
  {
    id: 'fiches_revision',
    nom: 'Fiches de Révision',
    texte: '+18 % de Magie pour toute la tentative.',
    emoji: '📇',
    rarete: 'COMMUN',
    effets: [{ type: 'STAT', stat: 'mag', pourcent: 18 }],
  },
  {
    id: 'doudoune',
    nom: 'Doudoune d’Hiver',
    texte: '+16 % de Défense et de Résistance.',
    emoji: '🧥',
    rarete: 'COMMUN',
    effets: [
      { type: 'STAT', stat: 'def', pourcent: 16 },
      { type: 'STAT', stat: 'res', pourcent: 16 },
    ],
  },
  {
    id: 'sieste',
    nom: 'Sieste Réparatrice',
    texte: 'Rend 45 % des PV manquants à toute l’équipe, tout de suite.',
    emoji: '😴',
    rarete: 'COMMUN',
    effets: [{ type: 'SOIN', pourcent: 45 }],
  },
  {
    id: 'inscription_sport',
    nom: 'Inscription au Sport',
    texte: '+22 % de PV max, et les PV gagnés sont rendus immédiatement.',
    emoji: '🏋️',
    rarete: 'RARE',
    effets: [{ type: 'PV_MAX', pourcent: 22 }],
  },
  {
    id: 'porte_bonheur',
    nom: 'Porte-Bonheur',
    texte: '+12 points de chances de critique.',
    emoji: '🍀',
    rarete: 'RARE',
    effets: [{ type: 'CRIT', points: 12 }],
  },
  {
    id: 'batterie_externe',
    nom: 'Batterie Externe',
    texte: 'Commence chaque combat avec 35 points d’énergie en plus.',
    emoji: '🔋',
    rarete: 'RARE',
    effets: [{ type: 'ENERGIE_DEPART', valeur: 35 }],
  },
  {
    id: 'bouclier_administratif',
    nom: 'Bouclier Administratif',
    texte: 'Commence chaque combat avec un bouclier de 18 % des PV max.',
    emoji: '🛡️',
    rarete: 'RARE',
    effets: [{ type: 'BOUCLIER_DEPART', pourcentPvMax: 18 }],
  },
  {
    id: 'infirmerie',
    nom: 'Passage à l’Infirmerie',
    texte: 'Rend 14 % des PV max à toute l’équipe entre chaque étage.',
    emoji: '🏥',
    rarete: 'EPIQUE',
    effets: [{ type: 'REGEN_ETAGE', pourcent: 14 }],
    unique: true,
  },
  {
    id: 'annales',
    nom: 'Les Annales',
    texte: '+14 % sur toutes les statistiques de combat.',
    emoji: '📚',
    rarete: 'EPIQUE',
    effets: [
      { type: 'STAT', stat: 'atq', pourcent: 14 },
      { type: 'STAT', stat: 'mag', pourcent: 14 },
      { type: 'STAT', stat: 'def', pourcent: 14 },
      { type: 'STAT', stat: 'res', pourcent: 14 },
      { type: 'STAT', stat: 'vit', pourcent: 14 },
    ],
  },
  {
    id: 'seconde_session',
    nom: 'Seconde Session',
    texte: 'Rend 100 % des PV manquants. Une seule fois.',
    emoji: '📝',
    rarete: 'EPIQUE',
    effets: [{ type: 'SOIN', pourcent: 100 }],
    unique: true,
  },
];

export const BONUS_PAR_ID: Record<string, BonusTour> = Object.fromEntries(
  BONUS_TOUR.map((b) => [b.id, b]),
);

export interface EtatTour {
  /** Prochain étage à affronter, de 1 à ETAGES_TOUR. */
  etage: number;
  /** PV restants par personnage, conservés d'un étage à l'autre. */
  pv: Record<string, number>;
  /** Bénédictions accumulées. */
  bonus: string[];
  /** Les trois bénédictions proposées, en attente de choix. */
  choix: string[] | null;
  seed: number;
  termine: boolean;
  victoire: boolean;
}

export function creerRunTour(seed: number): EtatTour {
  return { etage: 1, pv: {}, bonus: [], choix: null, seed, termine: false, victoire: false };
}

/** Trois bénédictions distinctes, pondérées par rareté et par étage atteint. */
export function proposerBonus(rng: Rng, etat: EtatTour): string[] {
  const pris = new Set(etat.bonus);
  const dispo = BONUS_TOUR.filter((b) => !(b.unique && pris.has(b.id)));
  // Plus on monte, plus les bénédictions rares apparaissent.
  const poids = (b: BonusTour): number => {
    const base = b.rarete === 'EPIQUE' ? 1 : b.rarete === 'RARE' ? 3 : 5;
    const faveur = b.rarete === 'EPIQUE' ? 1 + etat.etage * 0.35 : 1;
    return base * faveur;
  };
  const choix: string[] = [];
  const restant = [...dispo];
  for (let i = 0; i < 3 && restant.length > 0; i++) {
    const tire = rng.weighted(restant.map((b) => [b, poids(b)] as const));
    choix.push(tire.id);
    restant.splice(restant.indexOf(tire), 1);
  }
  return choix;
}

/**
 * Applique les bénédictions à une équipe déjà construite, puis restaure les
 * PV reportés de l'étage précédent.
 */
export function appliquerBonus(
  equipe: EquipeCombat,
  bonusIds: string[],
  pvReportes: Record<string, number>,
): boolean {
  const effets = bonusIds.flatMap((id) => BONUS_PAR_ID[id]?.effets ?? []);

  for (const u of equipe.unites) {
    // Les PV max d'abord : tout le reste s'exprime en pourcentage de ceux-ci.
    for (const e of effets) {
      if (e.type === 'PV_MAX') {
        const gain = Math.round(u.pvMax * (e.pourcent / 100));
        u.pvMax += gain;
        u.pv += gain;
        u.stats.pv = u.pvMax;
      }
    }
    for (const e of effets) {
      if (e.type === 'STAT') {
        u.stats[e.stat] = Math.max(1, Math.round(u.stats[e.stat] * (1 + e.pourcent / 100)));
      } else if (e.type === 'CRIT') {
        u.flags.critBonus = (u.flags.critBonus ?? 0) + e.points;
      } else if (e.type === 'ENERGIE_DEPART') {
        u.energie = Math.min(u.energieMax, u.energie + e.valeur);
      } else if (e.type === 'BOUCLIER_DEPART') {
        u.bouclier += Math.round(u.pvMax * (e.pourcentPvMax / 100));
      }
    }

    // Report des PV : un personnage entre dans l'étage suivant tel qu'il en est
    // sorti. C'est ce qui donne son enjeu à la tentative.
    const reporte = pvReportes[u.uid];
    if (reporte !== undefined) {
      u.pv = Math.max(0, Math.min(u.pvMax, reporte));
      if (u.pv === 0) {
        u.ko = true;
        u.bouclier = 0;
      }
    }
  }

  // Un combattant K.O. ne peut pas rester en première ligne : le moteur ne
  // déclenche son remplacement que lorsqu'il le met K.O. lui-même. Sans ce
  // recadrage, le camp n'a plus d'unité jouable et ne joue plus jamais.
  const premierValide = equipe.unites.findIndex((u) => !u.ko);
  if (premierValide === -1) return false;
  if (equipe.unites[equipe.actif].ko) equipe.actif = premierValide;
  return true;
}

/** Soins appliqués entre deux étages (bénédictions « soin » et « régénération »). */
export function soinsEntreEtages(
  pv: Record<string, number>,
  pvMax: Record<string, number>,
  bonusIds: string[],
  nouveauxBonus: string[],
): Record<string, number> {
  const out = { ...pv };
  const appliquer = (ids: string[], types: EffetBonus['type'][]) => {
    for (const id of ids) {
      for (const e of BONUS_PAR_ID[id]?.effets ?? []) {
        if (!types.includes(e.type)) continue;
        for (const uid of Object.keys(out)) {
          const max = pvMax[uid] ?? 0;
          if (out[uid] <= 0) continue; // un personnage K.O. le reste
          if (e.type === 'SOIN') {
            out[uid] = Math.min(max, out[uid] + Math.round((max - out[uid]) * (e.pourcent / 100)));
          } else if (e.type === 'REGEN_ETAGE') {
            out[uid] = Math.min(max, out[uid] + Math.round(max * (e.pourcent / 100)));
          }
        }
      }
    }
  };
  // Récupération de base, puis bénédictions déjà acquises, puis le soin choisi.
  for (const uid of Object.keys(out)) {
    if (out[uid] <= 0) continue;
    const max = pvMax[uid] ?? 0;
    out[uid] = Math.min(max, out[uid] + Math.round(max * REGEN_ETAGE_BASE));
  }
  appliquer(bonusIds, ['REGEN_ETAGE']);
  appliquer(nouveauxBonus, ['SOIN']);
  return out;
}

/** Composition adverse d'un étage : de plus en plus rude, boss au dernier. */
export function equipeEtage(etage: number, niveauJoueur: number, rng: Rng): EquipeGeneree {
  const palier = etage >= 9 ? 'DIFFICILE' : etage >= 6 ? 'NORMAL' : 'FACILE';
  // L'écart est proportionnel et non absolu : sinon un joueur de niveau 12
  // affronte un premier étage deux fois plus faible que lui, là où un joueur
  // de niveau 40 n'a qu'un léger avantage, et la Tour devient paradoxalement
  // plus dure à mesure qu'on progresse.
  // Premier étage à 58 % du niveau du joueur, dernier à 109 %. Réglé un cran
  // au-dessus de la simulation : un joueur réel, avec une équipe choisie et
  // de la couverture élémentaire, fait mieux que l'IA qui a servi à calibrer.
  const facteur = 0.58 + (etage - 1) * 0.055 + (etage === ETAGES_TOUR ? 0.04 : 0);
  const niveau = Math.max(3, Math.min(50, Math.round(niveauJoueur * facteur)));
  return equipeBot(palier, niveau, rng);
}

export function nomEtage(etage: number): string {
  const noms = [
    'Amphi A — Les Bizuths',
    'Salle de TD — Les Doublants',
    'Le Couloir du RU',
    'Amphi B — Contrôle Continu',
    'Le Labo de Thermo',
    'La Turne du Dessus',
    'Le Bureau des Élèves',
    'La Soutenance',
    'Le Conseil de Discipline',
    'Le Jury Final',
  ];
  return noms[Math.min(noms.length - 1, Math.max(0, etage - 1))];
}

export interface RecompensesTour {
  credits: number;
  eclats: number;
  xp: number;
}

/** Les récompenses montent plus vite que la difficulté : monter doit payer. */
export function recompensesTour(etagesReussis: number, victoire: boolean): RecompensesTour {
  const n = Math.max(0, Math.min(ETAGES_TOUR, etagesReussis));
  const base = 70 * n + 14 * n * n;
  const bonusVictoire = victoire ? 1.45 : 1;
  return {
    credits: Math.round(base * bonusVictoire),
    eclats: Math.round((2 * n + (victoire ? 12 : 0)) * 1),
    xp: Math.round((190 * n + 26 * n * n) * bonusVictoire),
  };
}
