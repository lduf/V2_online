import { getEspece } from './data/especes.js';
import { calculerStats, paliersVides, preparerSort } from './stats.js';
import { artEffectif, aSceauParfait } from './variantes.js';
import type {
  EquipeCombat,
  PersoPossede,
  SortPossede,
  SortPret,
  UniteCombat,
} from './types.js';

export const ENERGIE_MAX = 100;
export const ENERGIE_DEPART = 55;

/** Construit une unité de combat à partir d'un personnage possédé. */
export function construireUnite(
  perso: PersoPossede,
  sortsPossedes: Map<string, SortPossede>,
): UniteCombat {
  const espece = getEspece(perso.especeId);
  const stats = calculerStats(perso);

  const sorts: SortPret[] = [];
  for (const uid of perso.sorts) {
    if (!uid) continue;
    const sp = sortsPossedes.get(uid);
    if (!sp) continue;
    sorts.push(preparerSort(sp));
  }

  return {
    uid: perso.uid,
    especeId: perso.especeId,
    nom: perso.surnom?.trim() || espece.nom,
    niveau: perso.niveau,
    element: espece.element,
    role: espece.role,
    passifId: espece.passif.id,
    itemId: perso.itemId,
    art: artEffectif(espece.art, espece.id, perso.chromatique),
    chromatique: !!perso.chromatique,
    sceau: aSceauParfait(perso.ivs),
    stats,
    pv: stats.pv,
    pvMax: stats.pv,
    energie: ENERGIE_DEPART,
    energieMax: ENERGIE_MAX,
    bouclier: 0,
    paliers: paliersVides(),
    statuts: [],
    sorts,
    recharges: sorts.map(() => 0),
    ko: false,
    flags: {},
  };
}

export function construireEquipe(
  proprietaire: string,
  nom: string,
  persos: PersoPossede[],
  sortsPossedes: Map<string, SortPossede>,
): EquipeCombat {
  const unites = persos.map((p) => construireUnite(p, sortsPossedes));
  if (unites.length === 0) throw new Error('Une équipe doit contenir au moins un personnage.');
  return { proprietaire, nom, unites, actif: 0 };
}

export const TAILLE_EQUIPE = 3;

export interface ProblemeEquipe {
  code: string;
  message: string;
}

/** Validation d'une équipe avant de lancer un combat classé. */
export function validerEquipe(
  persos: PersoPossede[],
  sortsPossedes: Map<string, SortPossede>,
): ProblemeEquipe[] {
  const problemes: ProblemeEquipe[] = [];
  if (persos.length !== TAILLE_EQUIPE) {
    problemes.push({
      code: 'TAILLE',
      message: `Ton équipe doit compter exactement ${TAILLE_EQUIPE} personnages (actuellement ${persos.length}).`,
    });
  }
  const vus = new Set<string>();
  for (const p of persos) {
    if (vus.has(p.uid)) {
      problemes.push({ code: 'DOUBLON', message: 'Un même personnage ne peut pas être aligné deux fois.' });
    }
    vus.add(p.uid);

    const espece = getEspece(p.especeId);
    const sortsValides = p.sorts.filter((s): s is string => !!s && sortsPossedes.has(s));
    if (sortsValides.length === 0) {
      problemes.push({
        code: 'SANS_SORT',
        message: `${p.surnom || espece.nom} n'a aucun sort équipé.`,
      });
    }
    for (const uid of sortsValides) {
      const sp = sortsPossedes.get(uid)!;
      if (!espece.pool.includes(sp.defId)) {
        problemes.push({
          code: 'HORS_POOL',
          message: `${espece.nom} ne peut pas apprendre ce sort.`,
        });
      }
    }
    // Un même sort ne peut pas occuper deux emplacements du même personnage.
    const defs = sortsValides.map((u) => sortsPossedes.get(u)!.defId);
    if (new Set(defs).size !== defs.length) {
      problemes.push({
        code: 'SORT_DOUBLE',
        message: `${espece.nom} a deux fois le même sort équipé.`,
      });
    }
  }
  return problemes;
}
