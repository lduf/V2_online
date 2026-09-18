import { getEspece } from './data/especes.js';
import { SORTS, SORTS_PAR_ID } from './data/sorts.js';
import { calculerStats, paliersVides, preparerSort } from './stats.js';
import { artEffectif, aSceauParfait } from './variantes.js';
import { effetsTalents } from './talents.js';
import type {
  EquipeCombat,
  EspeceDef,
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

  // Les talents « STAT » s'appliquent sur les stats finales : c'est la seule
  // catégorie d'effet que le moteur n'a pas besoin de relire en plein combat.
  const talents = perso.talents ?? [];
  for (const e of effetsTalents(talents, 'STAT')) {
    for (const [k, pct] of Object.entries(e.stats)) {
      const cle = k as keyof typeof stats;
      stats[cle] = Math.round(stats[cle] * (1 + pct / 100));
    }
  }

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
    role: espece.role,
    passifId: espece.passif.id,
    talents,
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

/**
 * Ce qu'une espèce peut apprendre : sa liste thématique, plus tout sort ouvert
 * à son rôle. La liste garde l'identité du personnage, le rôle garantit
 * qu'aucune carte tirée ne reste inutilisable.
 */
export function sortsApprenables(espece: EspeceDef): string[] {
  const ouverts = SORTS.filter((s) => s.roles?.includes(espece.role)).map((s) => s.id);
  return [...new Set([...espece.pool, ...ouverts])];
}

export function peutApprendre(espece: EspeceDef, defId: string): boolean {
  if (espece.pool.includes(defId)) return true;
  const def = SORTS_PAR_ID[defId];
  return !!def?.roles?.includes(espece.role);
}

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
      if (!peutApprendre(espece, sp.defId)) {
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
