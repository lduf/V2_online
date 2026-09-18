import { ESPECES, ESPECES_PAR_ID, getEspece } from './data/especes.js';
import { choixTalents, PALIERS_TALENT } from './talents.js';
import { sortsApprenables } from './build.js';
import { ITEMS } from './data/items.js';
import { getSortDef } from './data/sorts.js';
import { Rng } from './rng.js';
import { evsVides, tirerIvs, tirerIvsSort, tirerNature } from './stats.js';
import { tirerChromatique, tirerPrisme } from './variantes.js';
import { xpCumulPourNiveau } from './progression.js';
import type { PersoPossede, SortPossede, Rarete } from './types.js';

let compteur = 0;
export function uid(prefixe: string): string {
  compteur = (compteur + 1) % 1000000;
  return `${prefixe}_${Date.now().toString(36)}${compteur.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export interface PersoGenere {
  perso: PersoPossede;
  sorts: SortPossede[];
}

/** Crée un personnage complet, prêt à combattre (sorts et objet inclus). */
export function creerPersoAleatoire(
  especeId: string,
  niveau: number,
  rng: Rng,
  opts: {
    plancherIv?: number;
    avecItem?: boolean;
    prefixe?: string;
    /** Multiplicateur du taux de variantes cosmétiques (0 pour en interdire). */
    bonusVariante?: number;
  } = {},
): PersoGenere {
  const espece = getEspece(especeId);
  const prefixe = opts.prefixe ?? 'p';
  const sorts: SortPossede[] = [];

  // Deck équilibré : la signature, puis au moins deux sorts offensifs et
  // au plus un sort de pur soutien. Un kit 100 % soin ne gagne jamais.
  const choisis = composerKit(espece.sortSignature, sortsApprenables(espece), rng);
  for (const defId of choisis) {
    sorts.push({
      uid: uid(`${prefixe}s`),
      defId,
      ivs: tirerIvsSort(rng, opts.plancherIv ?? 0),
      obtenuLe: Date.now(),
      prisme: tirerPrisme(rng, opts.bonusVariante ?? 1),
    });
  }

  const item = opts.avecItem === false ? null : rng.pick(ITEMS).id;

  const perso: PersoPossede = {
    uid: uid(prefixe),
    especeId,
    niveau,
    xp: xpCumulPourNiveau(niveau),
    ivs: tirerIvs(rng, opts.plancherIv ?? 0),
    evs: evsVides(),
    natureId: tirerNature(rng),
    sorts: sorts.map((s) => s.uid),
    itemId: item,
    obtenuLe: Date.now(),
    chromatique: tirerChromatique(rng, opts.bonusVariante ?? 1),
    // Un adversaire généré choisit ses talents au hasard : sans ça, un bot de
    // niveau 50 se battrait avec deux paliers de retard sur le joueur.
    talents: PALIERS_TALENT.filter((pa) => niveau >= pa).map(
      (pa) => rng.pick(choixTalents(espece.role, pa)).id,
    ),
  };
  return { perso, sorts };
}

/**
 * Compose un jeu de 4 sorts cohérent depuis un pool : signature garantie,
 * minimum 2 sorts qui infligent des dégâts, maximum 1 sort de soutien pur.
 */
export function composerKit(signature: string, pool: string[], rng: Rng): string[] {
  const estSoutien = (id: string): boolean => getSortDef(id).categorie === 'SOUTIEN';
  const faitMal = (id: string): boolean => getSortDef(id).puissance > 0;

  const choisis: string[] = [signature];
  const restant = rng.shuffle(pool.filter((s) => s !== signature));

  const compteSoutien = (): number => choisis.filter(estSoutien).length;
  const compteOffensif = (): number => choisis.filter(faitMal).length;

  // 1. Compléter jusqu'à 2 sorts offensifs.
  for (const id of restant) {
    if (choisis.length >= 4 || compteOffensif() >= 2) break;
    if (!choisis.includes(id) && faitMal(id)) choisis.push(id);
  }
  // 2. Remplir le reste en respectant le quota de soutien.
  for (const id of restant) {
    if (choisis.length >= 4) break;
    if (choisis.includes(id)) continue;
    if (estSoutien(id) && compteSoutien() >= 1) continue;
    choisis.push(id);
  }
  // 3. Filet de sécurité si le pool est trop petit.
  for (const id of restant) {
    if (choisis.length >= 4) break;
    if (!choisis.includes(id)) choisis.push(id);
  }
  return choisis.slice(0, 4);
}

export interface EquipeGeneree {
  persos: PersoPossede[];
  sorts: Map<string, SortPossede>;
}

const RARETES_PAR_PALIER: Record<string, Rarete[]> = {
  FACILE: ['COMMUN', 'COMMUN', 'RARE'],
  NORMAL: ['COMMUN', 'RARE', 'RARE'],
  DIFFICILE: ['RARE', 'EPIQUE', 'LEGENDAIRE'],
};

/** Équipe de bot cohérente : 3 personnages, raretés adaptées au palier. */
export function equipeBot(
  palier: 'FACILE' | 'NORMAL' | 'DIFFICILE',
  niveau: number,
  rng: Rng,
): EquipeGeneree {
  const cibles = RARETES_PAR_PALIER[palier];
  const persos: PersoPossede[] = [];
  const sorts = new Map<string, SortPossede>();
  const dejaPris = new Set<string>();

  const plancher = palier === 'DIFFICILE' ? 18 : palier === 'NORMAL' ? 8 : 0;

  for (const rarete of cibles) {
    const candidats = ESPECES.filter((e) => e.rarete === rarete && !dejaPris.has(e.id));
    const espece = candidats.length > 0 ? rng.pick(candidats) : rng.pick(ESPECES);
    dejaPris.add(espece.id);
    const g = creerPersoAleatoire(espece.id, niveau, rng, {
      plancherIv: plancher,
      prefixe: 'bot',
    });
    persos.push(g.perso);
    for (const s of g.sorts) sorts.set(s.uid, s);
  }
  return { persos, sorts };
}

/** Roster de départ offert à la création de compte. */
export const ESPECES_DEPART = ['maxence', 'ondine', 'brigitte', 'rocco'];

/**
 * Les trois champions proposés à l'inscription. Trois façons de jouer
 * franchement distinctes, pour que le choix veuille dire quelque chose dès
 * la première minute.
 */
export interface Starter {
  especeId: string;
  accroche: string;
  pitch: string;
}

export const STARTERS: Starter[] = [
  {
    especeId: 'maxence',
    accroche: 'Cogne de plus en plus fort',
    pitch:
      'Ses dégâts montent de 7 % à chaque round. Plus le combat dure, plus il fait mal. Pour ceux qui aiment appuyer.',
  },
  {
    especeId: 'ondine',
    accroche: 'Use l’adversaire',
    pitch:
      'Elle récupère 5 % de ses PV à la fin de chacun de ses tours. Frappe à distance et ne s’effondre jamais vraiment.',
  },
  {
    especeId: 'brigitte',
    accroche: 'Ne tombe pas',
    pitch:
      'Elle encaisse 18 % de dégâts physiques en moins et a le plus gros réservoir de PV du roster. Pour gagner en durant.',
  },
];

export const STARTERS_PAR_ID: Record<string, Starter> = Object.fromEntries(
  STARTERS.map((s) => [s.especeId, s]),
);

/** Niveau des personnages offerts : assez haut pour que le premier combat respire. */
export const NIVEAU_DEPART = 12;

/**
 * Roster de départ. Le champion choisi à l'inscription est placé en tête :
 * c'est lui qui entre en premier au combat.
 */
export function rosterDepart(rng: Rng, starterId?: string): EquipeGeneree {
  const persos: PersoPossede[] = [];
  const sorts = new Map<string, SortPossede>();
  const valide = starterId && STARTERS_PAR_ID[starterId] ? starterId : ESPECES_DEPART[0];
  const ordre = [valide, ...ESPECES_DEPART.filter((id) => id !== valide)];
  for (const id of ordre) {
    const g = creerPersoAleatoire(id, NIVEAU_DEPART, rng, { plancherIv: 6, prefixe: 'p' });
    persos.push(g.perso);
    for (const s of g.sorts) sorts.set(s.uid, s);
  }
  return { persos, sorts };
}

export function nomEspece(id: string): string {
  return ESPECES_PAR_ID[id]?.nom ?? id;
}

export function nomSort(id: string): string {
  try {
    return getSortDef(id).nom;
  } catch {
    return id;
  }
}
