import type { Cote, EvtCombat, StatutActif, VueCombat } from '@arene/engine';

/** État visuel d'une unité, piloté par le flux d'événements. */
export interface UniteAffichee {
  pv: number;
  pvMax: number;
  bouclier: number;
  energie: number;
  statuts: StatutActif[];
  paliers: Record<string, number>;
  ko: boolean;
}

export interface Affichage {
  unites: Record<string, UniteAffichee>;
  actifs: [number, number];
}

export function depuisVue(vue: VueCombat): Affichage {
  const unites: Record<string, UniteAffichee> = {};
  for (const eq of vue.equipes) {
    for (const u of eq.unites) {
      unites[u.uid] = {
        pv: u.pv,
        pvMax: u.pvMax,
        bouclier: u.bouclier,
        energie: u.energie,
        statuts: u.statuts.map((s) => ({ ...s })),
        paliers: { ...u.paliers },
        ko: u.ko,
      };
    }
  }
  return { unites, actifs: [vue.equipes[0].actif, vue.equipes[1].actif] };
}

/**
 * Reconstitue l'état *avant* une salve d'événements en la remontant à l'envers.
 * Les événements de dégâts et de soin portent le montant exact, ce qui permet
 * de rejouer l'animation depuis le bon point de départ plutôt que d'afficher
 * d'emblée le résultat final.
 */
export function etatAvant(vueFinale: VueCombat, evts: EvtCombat[]): Affichage {
  const a = depuisVue(vueFinale);
  for (let i = evts.length - 1; i >= 0; i--) {
    const e = evts[i];
    switch (e.t) {
      case 'DEGATS': {
        const u = a.unites[e.uniteUid];
        if (!u) break;
        u.pv = Math.min(u.pvMax, u.pv + (e.montant - e.absorbeBouclier));
        u.bouclier += e.absorbeBouclier;
        break;
      }
      case 'SOIN': {
        const u = a.unites[e.uniteUid];
        if (u) u.pv = Math.max(0, u.pv - e.montant);
        break;
      }
      case 'KO': {
        const u = a.unites[e.uniteUid];
        if (u) u.ko = false;
        break;
      }
      case 'SWITCH': {
        // On revient sur l'unité précédente pour ce côté.
        const idx = vueFinale.equipes[e.cote].unites.findIndex((x) => x.uid === e.deUid);
        if (idx >= 0) a.actifs[e.cote] = idx;
        break;
      }
      default:
        break;
    }
  }
  return a;
}

export interface Retour {
  affichage: Affichage;
  /** Informations de mise en scène à jouer pour cet événement. */
  secousse: number;
  flottant: { uid: string; texte: string; ton: string } | null;
}

/** Applique un événement à l'état affiché. Retourne une copie. */
export function appliquer(a: Affichage, e: EvtCombat): Affichage {
  const copie: Affichage = {
    unites: { ...a.unites },
    actifs: [...a.actifs] as [number, number],
  };
  const maj = (uid: string, patch: Partial<UniteAffichee>): void => {
    const u = copie.unites[uid];
    if (!u) return;
    copie.unites[uid] = { ...u, ...patch };
  };

  switch (e.t) {
    case 'DEGATS':
      maj(e.uniteUid, {
        pv: e.pv,
        bouclier: Math.max(0, (copie.unites[e.uniteUid]?.bouclier ?? 0) - e.absorbeBouclier),
      });
      break;
    case 'SOIN':
      maj(e.uniteUid, { pv: e.pv });
      break;
    case 'BOUCLIER':
      maj(e.uniteUid, { bouclier: e.valeur });
      break;
    case 'ENERGIE':
      maj(e.uniteUid, { energie: e.total });
      break;
    case 'KO':
      maj(e.uniteUid, { ko: true, pv: 0, bouclier: 0, statuts: [], paliers: {} });
      break;
    case 'STATUT': {
      const u = copie.unites[e.uniteUid];
      if (!u) break;
      const statuts = e.ajoute
        ? [...u.statuts.filter((s) => s.id !== e.statut), { id: e.statut, duree: 3, puissance: 1 }]
        : u.statuts.filter((s) => s.id !== e.statut);
      maj(e.uniteUid, { statuts });
      break;
    }
    case 'PALIER': {
      const u = copie.unites[e.uniteUid];
      if (!u) break;
      maj(e.uniteUid, {
        paliers: { ...u.paliers, [e.stat]: (u.paliers[e.stat] ?? 0) + e.delta },
      });
      break;
    }
    case 'SWITCH':
      break;
    default:
      break;
  }
  return copie;
}

/** Durée d'affichage d'un événement, en millisecondes (vitesse × 1). */
export function duree(e: EvtCombat): number {
  switch (e.t) {
    case 'ROUND':
      return 520;
    case 'TOUR':
      return 260;
    case 'ACTION':
      return 560;
    case 'DE':
      return 780;
    case 'DEGATS':
      return 460;
    case 'SOIN':
      return 400;
    case 'KO':
      return 820;
    case 'SWITCH':
      return 640;
    case 'MESSAGE':
      return e.ton === 'epique' ? 620 : 300;
    case 'RATE':
      return 420;
    case 'PASSIF':
      return 380;
    case 'FIN':
      return 700;
    case 'BOUCLIER':
    case 'ENERGIE':
    case 'STATUT':
    case 'PALIER':
      return 200;
    default:
      return 220;
  }
}

export function indexActif(vue: VueCombat, cote: Cote): number {
  return vue.equipes[cote].actif;
}
