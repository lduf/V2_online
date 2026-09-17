import { ITEMS_PAR_ID } from './data/items.js';
import { multiplicateurElement } from './data/elements.js';
import { ESPECES_PAR_ID } from './data/especes.js';
import { Rng } from './rng.js';
import { multiplicateurPalier } from './stats.js';
import { estMauvais, INFO_STATUTS } from './statuts.js';
import type {
  BattleAction,
  Cote,
  Efficacite,
  EquipeCombat,
  EtatCombat,
  EvtCombat,
  SortPret,
  StatKey,
  StatsCote,
  StatutId,
  UniteCombat,
  UnitePublique,
  VueCombat,
} from './types.js';

export const MULT_DEGATS = 2.3;
export const ENERGIE_PAR_TOUR = 22;
export const ENERGIE_ATTAQUE = 30;
export const ENERGIE_GARDE = 34;
export const LIMITE_ROUNDS = 30;
export const MULT_CRITIQUE = 1.65;
export const CRIT_MAX = 60;

const ATTAQUE_BASIQUE: SortPret = {
  uid: '__attaque__',
  ivs: { puissance: 31, precision: 31, critique: 0, cout: 31 },
  puissance: 42,
  soin: 0,
  cout: 0,
  precision: 100,
  critique: 0,
  note: 100,
  grade: 'S',
  sceau: false,
  def: {
    id: '__attaque__',
    nom: 'Attaque',
    element: 'ARCANE',
    rarete: 'COMMUN',
    categorie: 'PHYSIQUE',
    cible: 'ENNEMI',
    puissance: 42,
    soin: 0,
    de: 4,
    cout: 0,
    recharge: 0,
    precision: 100,
    effets: [],
    texte: 'Attaque de base. Ne coûte rien et régénère de l’énergie.',
    vfx: { forme: 'impact', intensite: 0.8, secousse: 6 },
    prix: 0,
  },
};

/** Multiplicateur de dégâts appliqué en fin de partie (mort subite progressive). */
export const ROUND_ESCALADE = 14;

export function multiplicateurEscalade(round: number): number {
  if (round < ROUND_ESCALADE) return 1;
  return Math.min(3, 1 + 0.18 * (round - ROUND_ESCALADE + 1));
}

function statsVides(): StatsCote {
  return { desParfaits: 0, meilleurCoup: 0, critiques: 0, superEfficaces: 0, changements: 0 };
}

export function autreCote(c: Cote): Cote {
  return c === 0 ? 1 : 0;
}

function actif(etat: EtatCombat, cote: Cote): UniteCombat {
  const eq = etat.equipes[cote];
  return eq.unites[eq.actif];
}

function vivants(eq: EquipeCombat): number[] {
  const out: number[] = [];
  eq.unites.forEach((u, i) => {
    if (!u.ko) out.push(i);
  });
  return out;
}

function statEffective(u: UniteCombat, k: Exclude<StatKey, 'pv'>): number {
  let v = u.stats[k] * multiplicateurPalier(u.paliers[k]);
  if (k === 'vit' && u.statuts.some((s) => s.id === 'GEL')) v *= 0.5;
  if (k === 'atq' && u.passifId === 'tenacite' && u.pv / u.pvMax < 0.3) v *= 1.4;
  return Math.max(1, v);
}

function aStatut(u: UniteCombat, id: StatutId): boolean {
  return u.statuts.some((s) => s.id === id);
}

function itemEffet(u: UniteCombat): string | undefined {
  return u.itemId ? ITEMS_PAR_ID[u.itemId]?.effet : undefined;
}

// ───────────────────────────── Création ─────────────────────────────

export interface OptionsCombat {
  id: string;
  seed: number;
  limiteRounds?: number;
}

export function creerCombat(
  equipeA: EquipeCombat,
  equipeB: EquipeCombat,
  opts: OptionsCombat,
): EtatCombat {
  const rng = new Rng(opts.seed);
  const etat: EtatCombat = {
    id: opts.id,
    seed: opts.seed,
    rng: rng.state,
    tour: 0,
    round: 0,
    equipes: [equipeA, equipeB],
    file: [],
    phase: 'CHOIX',
    vainqueur: null,
    motifFin: null,
    remplacement: null,
    journal: [],
    limiteRounds: opts.limiteRounds ?? LIMITE_ROUNDS,
    stats: [statsVides(), statsVides()],
  };
  const evts: EvtCombat[] = [
    {
      t: 'MESSAGE',
      texte: `${equipeA.nom} affronte ${equipeB.nom} !`,
      ton: 'epique',
    },
  ];
  entreeEnJeu(etat, 0, evts);
  entreeEnJeu(etat, 1, evts);
  nouveauRound(etat, evts);
  avancerJusquAuChoix(etat, evts);
  etat.journal = evts;
  return etat;
}

function nouveauRound(etat: EtatCombat, evts: EvtCombat[]): void {
  etat.round += 1;
  const rng = new Rng(etat.rng);
  const a = statEffective(actif(etat, 0), 'vit');
  const b = statEffective(actif(etat, 1), 'vit');
  let ordre: Cote[];
  if (a > b) ordre = [0, 1];
  else if (b > a) ordre = [1, 0];
  else ordre = rng.next() < 0.5 ? [0, 1] : [1, 0];
  etat.rng = rng.state;
  etat.file = ordre;
  evts.push({ t: 'ROUND', numero: etat.round });
}

// ─────────────────────── Entrées / remplacements ───────────────────────

function entreeEnJeu(etat: EtatCombat, cote: Cote, evts: EvtCombat[]): void {
  const u = actif(etat, cote);
  u.flags.tours = 0;
  if (u.passifId === 'aube') {
    const avant = u.statuts.length;
    u.statuts = u.statuts.filter((s) => !estMauvais(s.id));
    changerPalier(etat, cote, u, 'res', 1, evts);
    if (avant !== u.statuts.length || true) {
      evts.push({ t: 'PASSIF', cote, uniteUid: u.uid, nom: 'Aube' });
    }
  }
}

// ───────────────────────────── Boucle de tour ─────────────────────────────

/**
 * Fait avancer le combat jusqu'à ce qu'un joueur ait réellement un choix
 * à faire (ou que le combat soit terminé). Applique les effets de début de
 * tour, les pertes de tour (gel, étourdissement) et les fins de round.
 */
function avancerJusquAuChoix(etat: EtatCombat, evts: EvtCombat[]): void {
  let securite = 0;
  while (etat.phase === 'CHOIX' && securite++ < 200) {
    if (etat.remplacement !== null) return;

    if (etat.file.length === 0) {
      if (etat.round >= etat.limiteRounds) {
        finParLimite(etat, evts);
        return;
      }
      nouveauRound(etat, evts);
    }

    const cote = etat.file[0];
    const u = actif(etat, cote);
    if (u.ko) {
      // Sécurité : le côté n'a plus d'unité active valide.
      etat.file.shift();
      continue;
    }

    if (!u.flags.tourDemarre) {
      debutDeTour(etat, cote, evts);
      u.flags.tourDemarre = 1;
      if (verifierFin(etat, evts)) return;
      if (etat.remplacement !== null) return;
    }

    const empeche = doitPasserSonTour(etat, cote, evts);
    if (empeche) {
      terminerTour(etat, cote, evts);
      if (verifierFin(etat, evts)) return;
      continue;
    }
    return; // le joueur doit choisir
  }
}

function debutDeTour(etat: EtatCombat, cote: Cote, evts: EvtCombat[]): void {
  const u = actif(etat, cote);
  evts.push({ t: 'TOUR', cote, uniteUid: u.uid });

  // Recharges des sorts.
  u.recharges = u.recharges.map((r) => Math.max(0, r - 1));

  // Régénération d'énergie.
  let gain = ENERGIE_PAR_TOUR;
  if (u.passifId === 'surcharge') gain += 14;
  if (itemEffet(u) === 'BATTERIE') gain += 10;
  donnerEnergie(etat, cote, u, gain, evts);

  if (u.passifId === 'amende') {
    const adv = actif(etat, autreCote(cote));
    const vol = Math.min(8, adv.energie);
    if (vol > 0) {
      donnerEnergie(etat, autreCote(cote), adv, -vol, evts);
      donnerEnergie(etat, cote, u, vol, evts);
      evts.push({ t: 'PASSIF', cote, uniteUid: u.uid, nom: 'Amende Immédiate' });
    }
  }

  if (u.passifId === 'egide') {
    const val = Math.round(u.pvMax * 0.09);
    u.bouclier += val;
    evts.push({ t: 'BOUCLIER', cote, uniteUid: u.uid, valeur: u.bouclier });
    evts.push({ t: 'PASSIF', cote, uniteUid: u.uid, nom: 'Égide' });
  }
}

function doitPasserSonTour(etat: EtatCombat, cote: Cote, evts: EvtCombat[]): boolean {
  const u = actif(etat, cote);
  const rng = new Rng(etat.rng);
  let bloque = false;
  if (aStatut(u, 'ETOURDI')) {
    evts.push({ t: 'MESSAGE', texte: `${u.nom} est étourdi et ne peut pas agir !`, ton: 'mal' });
    bloque = true;
  } else if (aStatut(u, 'GEL') && rng.chance(30)) {
    evts.push({ t: 'MESSAGE', texte: `${u.nom} est figé par le gel !`, ton: 'mal' });
    bloque = true;
  }
  etat.rng = rng.state;
  return bloque;
}

// ───────────────────────────── Actions ─────────────────────────────

export function actionsPossibles(etat: EtatCombat, cote: Cote): BattleAction[] {
  if (etat.phase === 'TERMINE') return [];
  const eq = etat.equipes[cote];

  if (etat.remplacement === cote) {
    return vivants(eq)
      .filter((i) => i !== eq.actif)
      .map((i) => ({ type: 'SWITCH', index: i }) as BattleAction);
  }
  if (etat.file[0] !== cote) return [];

  const u = actif(etat, cote);
  const actions: BattleAction[] = [{ type: 'ATTAQUE' }, { type: 'GARDE' }, { type: 'ABANDON' }];
  u.sorts.forEach((s, i) => {
    if (u.recharges[i] > 0) return;
    if (u.energie < s.cout) return;
    actions.push({ type: 'SORT', index: i });
  });
  for (const i of vivants(eq)) {
    if (i !== eq.actif) actions.push({ type: 'SWITCH', index: i });
  }
  return actions;
}

export function actionLegale(etat: EtatCombat, cote: Cote, action: BattleAction): boolean {
  if (action.type === 'ABANDON') return etat.phase === 'CHOIX';
  return actionsPossibles(etat, cote).some(
    (a) =>
      a.type === action.type &&
      (a.type !== 'SORT' || a.index === (action as { index: number }).index) &&
      (a.type !== 'SWITCH' || a.index === (action as { index: number }).index),
  );
}

export function jouerAction(etat: EtatCombat, cote: Cote, action: BattleAction): EvtCombat[] {
  const evts: EvtCombat[] = [];
  if (etat.phase === 'TERMINE') return evts;

  if (action.type === 'ABANDON') {
    terminer(etat, autreCote(cote), 'abandon', evts);
    journaliser(etat, evts);
    return evts;
  }

  // Remplacement forcé après un KO : ne consomme pas le tour.
  if (etat.remplacement !== null) {
    if (etat.remplacement !== cote || action.type !== 'SWITCH') return evts;
    effectuerSwitch(etat, cote, action.index, evts, true);
    etat.remplacement = null;
    avancerJusquAuChoix(etat, evts);
    journaliser(etat, evts);
    return evts;
  }

  if (etat.file[0] !== cote) return evts;
  if (!actionLegale(etat, cote, action)) return evts;

  const u = actif(etat, cote);
  etat.tour += 1;

  switch (action.type) {
    case 'SWITCH':
      effectuerSwitch(etat, cote, action.index, evts, false);
      break;
    case 'GARDE': {
      donnerEnergie(etat, cote, u, ENERGIE_GARDE, evts);
      changerPalier(etat, cote, u, 'def', 1, evts);
      changerPalier(etat, cote, u, 'res', 1, evts);
      u.flags.garde = 1;
      evts.push({
        t: 'ACTION',
        cote,
        libelle: 'Garde',
        element: u.element,
        vfx: { forme: 'aura', intensite: 0.9 },
      });
      evts.push({ t: 'MESSAGE', texte: `${u.nom} se met en garde.`, ton: 'info' });
      break;
    }
    case 'ATTAQUE': {
      donnerEnergie(etat, cote, u, ENERGIE_ATTAQUE, evts);
      lancerSort(etat, cote, ATTAQUE_BASIQUE, evts, -1);
      break;
    }
    case 'SORT': {
      const sort = u.sorts[action.index];
      u.energie -= sort.cout;
      evts.push({
        t: 'ENERGIE',
        cote,
        uniteUid: u.uid,
        valeur: -sort.cout,
        total: u.energie,
      });
      u.recharges[action.index] = sort.def.recharge;
      lancerSort(etat, cote, sort, evts, action.index);
      break;
    }
  }

  if (!verifierFin(etat, evts)) {
    const rejoue = u.flags.relance === 1 && !u.ko;
    u.flags.relance = 0;
    terminerTour(etat, cote, evts, rejoue);
    if (!verifierFin(etat, evts)) avancerJusquAuChoix(etat, evts);
  }

  journaliser(etat, evts);
  return evts;
}

/** Le journal reste borné : il ne sert qu'au récapitulatif, pas à l'état de jeu. */
const JOURNAL_MAX = 60;
function journaliser(etat: EtatCombat, evts: EvtCombat[]): void {
  etat.journal.push(...evts);
  if (etat.journal.length > JOURNAL_MAX) {
    etat.journal.splice(0, etat.journal.length - JOURNAL_MAX);
  }
}

function effectuerSwitch(
  etat: EtatCombat,
  cote: Cote,
  index: number,
  evts: EvtCombat[],
  force: boolean,
): void {
  const eq = etat.equipes[cote];
  const ancien = eq.unites[eq.actif];
  if (index === eq.actif || eq.unites[index]?.ko) return;
  eq.actif = index;
  const nouveau = eq.unites[index];
  // Les paliers et la garde ne suivent pas le personnage qui sort.
  ancien.paliers = { atq: 0, def: 0, mag: 0, res: 0, vit: 0, chance: 0 };
  ancien.flags.garde = 0;
  ancien.flags.tourDemarre = 0;
  if (!force) etat.stats[cote].changements += 1;
  evts.push({ t: 'SWITCH', cote, deUid: ancien.uid, versUid: nouveau.uid });
  evts.push({
    t: 'MESSAGE',
    texte: force
      ? `${eq.nom} envoie ${nouveau.nom} au combat !`
      : `${eq.nom} rappelle ${ancien.nom} et envoie ${nouveau.nom} !`,
    ton: 'info',
  });
  entreeEnJeu(etat, cote, evts);
}

// ───────────────────────────── Résolution d'un sort ─────────────────────────────

function lancerSort(
  etat: EtatCombat,
  cote: Cote,
  sort: SortPret,
  evts: EvtCombat[],
  indexSort: number,
): void {
  const rng = new Rng(etat.rng);
  const lanceur = actif(etat, cote);
  const coteAdv = autreCote(cote);
  const cible = sort.def.cible === 'SOI' ? lanceur : actif(etat, coteAdv);
  const coteCible = sort.def.cible === 'SOI' ? cote : coteAdv;

  evts.push({
    t: 'ACTION',
    cote,
    libelle: sort.def.nom,
    sortId: sort.def.id,
    vfx: sort.def.vfx,
    element: sort.def.element,
  });

  // Confusion : risque de se frapper soi-même.
  if (aStatut(lanceur, 'CONFUSION') && rng.chance(33)) {
    etat.rng = rng.state;
    const auto = Math.round(lanceur.pvMax * 0.07);
    evts.push({ t: 'MESSAGE', texte: `${lanceur.nom} est confus et se blesse !`, ton: 'mal' });
    infligerBrut(etat, cote, lanceur, auto, evts, 'NEUTRE', false);
    return;
  }

  // Précision.
  let precision = sort.precision;
  if (lanceur.passifId === 'theoreme' && sort.def.de >= 15) precision += 12;
  if (itemEffet(lanceur) === 'FOCUS') precision += 8;
  if (aStatut(lanceur, 'CONCENTRATION')) precision += 15;

  const cibleAdverse = sort.def.cible === 'ENNEMI';
  if (cibleAdverse) {
    if (!rng.chance(Math.min(100, precision))) {
      etat.rng = rng.state;
      evts.push({ t: 'RATE', cote });
      evts.push({ t: 'MESSAGE', texte: `${sort.def.nom} manque sa cible…`, ton: 'mal' });
      return;
    }
    if (cible.passifId === 'esquive' && rng.chance(18)) {
      etat.rng = rng.state;
      evts.push({ t: 'RATE', cote });
      evts.push({ t: 'PASSIF', cote: coteCible, uniteUid: cible.uid, nom: 'Esquive Fluide' });
      evts.push({ t: 'MESSAGE', texte: `${cible.nom} esquive !`, ton: 'info' });
      return;
    }
  }

  // Le dé, héritage de la V1.
  const faces = Math.max(1, sort.def.de);
  let jet = rng.de(faces);
  if (lanceur.passifId === 'de_pipe' && faces > 1 && jet < faces * 0.4) {
    const relance = rng.de(faces);
    if (relance > jet) {
      jet = relance;
      evts.push({ t: 'PASSIF', cote, uniteUid: lanceur.uid, nom: 'Dé Pipé' });
    }
  }
  const ratio = jet / faces;
  const coeff = faces === 1 ? 1 : 0.55 + 0.45 * ratio;
  const parfait = faces > 1 && jet === faces;
  // Le dé parfait se voit sur le dé lui-même : pas de message en doublon.
  evts.push({ t: 'DE', faces, resultat: jet, coeff: Math.round(coeff * 100) / 100, parfait });
  if (parfait) etat.stats[cote].desParfaits += 1;

  etat.rng = rng.state;

  const coups = (sort.def.effets.find((e) => e.type === 'MULTI') as { coups: number } | undefined)
    ?.coups ?? 1;

  let degatsTotaux = 0;
  if (sort.puissance > 0 && cibleAdverse) {
    for (let i = 0; i < coups; i++) {
      if (cible.ko) break;
      const d = resoudreDegats(etat, cote, sort, coeff, parfait, evts, coups);
      degatsTotaux += d;
    }
  }

  // Soin / recul du lanceur (le champ `soin` de la V1 peut être négatif).
  if (sort.soin !== 0) {
    const montant = Math.round(sort.soin * coeff);
    if (montant > 0) soigner(etat, cote, lanceur, montant, evts);
    else if (montant < 0) infligerBrut(etat, cote, lanceur, -montant, evts, 'NEUTRE', false);
  }

  appliquerEffets(etat, cote, sort, coeff, degatsTotaux, evts);

  // Consommation de la concentration.
  if (sort.puissance > 0) {
    retirerStatut(etat, cote, lanceur, 'CONCENTRATION', evts);
  }
}

function resoudreDegats(
  etat: EtatCombat,
  cote: Cote,
  sort: SortPret,
  coeff: number,
  parfait: boolean,
  evts: EvtCombat[],
  coups: number,
): number {
  const rng = new Rng(etat.rng);
  const att = actif(etat, cote);
  const coteAdv = autreCote(cote);
  const def = actif(etat, coteAdv);

  let statAtt: number;
  let statDef: number;
  switch (sort.def.categorie) {
    case 'PHYSIQUE':
      statAtt = statEffective(att, 'atq');
      statDef = statEffective(def, 'def');
      break;
    case 'MAGIQUE':
      statAtt = statEffective(att, 'mag');
      statDef = statEffective(def, 'res');
      break;
    default: // PUR : ignore une grande partie de la défense
      statAtt = (statEffective(att, 'atq') + statEffective(att, 'mag')) / 2;
      statDef = (statEffective(def, 'def') + statEffective(def, 'res')) / 4;
      break;
  }

  let puissance = sort.puissance / coups;
  if (att.passifId === 'theoreme' && sort.def.de >= 15) puissance *= 1.12;
  if (aStatut(att, 'CONCENTRATION')) puissance *= 1.3;

  let degats =
    ((((2 * att.niveau) / 5 + 2) * puissance * (statAtt / statDef)) / 50 + 2) * MULT_DEGATS;

  degats *= coeff;

  // Efficacité élémentaire + STAB.
  const multElem = multiplicateurElement(sort.def.element, def.element);
  degats *= multElem;
  if (sort.def.element === att.element) degats *= 1.2;

  let efficacite: Efficacite = 'NEUTRE';
  if (multElem > 1) efficacite = 'SUPER';
  else if (multElem < 1) efficacite = 'FAIBLE';

  // Critique.
  let chanceCrit = 5 + statEffective(att, 'chance') / 12 + sort.critique;
  if (att.passifId === 'coup_de_sang' && att.pv / att.pvMax < 0.5) chanceCrit += 25;
  const critique = parfait || rng.chance(Math.min(CRIT_MAX, chanceCrit));
  if (critique) degats *= MULT_CRITIQUE;

  // Passifs offensifs.
  if (att.passifId === 'montee_temperature') {
    degats *= 1 + Math.min(0.42, 0.07 * (etat.round - 1));
  }
  if (att.passifId === 'embuscade' && (att.flags.tours ?? 0) === 0) {
    degats *= 1.45;
    evts.push({ t: 'PASSIF', cote, uniteUid: att.uid, nom: 'Embuscade' });
  }
  if (att.passifId === 'coup_de_sang' && att.pv / att.pvMax < 0.5) degats *= 1.15;
  if (att.passifId === 'brasier' && aStatut(def, 'BRULURE')) degats *= 1.28;

  // Objets.
  const effet = itemEffet(att);
  if (effet === 'CHARGE') degats *= 1 + Math.min(0.42, 0.05 * (etat.round - 1));
  if (effet === 'DERNIER_SOUFFLE' && att.pv / att.pvMax < 0.25) degats *= 1.35;

  // Statuts.
  if (aStatut(att, 'RAGE')) degats *= 1.25;
  if (aStatut(att, 'BRULURE') && sort.def.categorie === 'PHYSIQUE') degats *= 0.85;
  if (aStatut(def, 'RAGE')) degats *= 1.15;

  // Défenses.
  if (def.passifId === 'mur_porteur' && sort.def.categorie === 'PHYSIQUE') degats *= 0.82;
  if (def.flags.garde === 1) degats *= 0.6;

  // Exécution.
  const exec = sort.def.effets.find((e) => e.type === 'EXECUTION') as
    | { seuil: number; bonus: number }
    | undefined;
  if (exec && def.pv / def.pvMax <= exec.seuil) {
    degats *= exec.bonus;
    evts.push({ t: 'MESSAGE', texte: 'Coup de grâce !', ton: 'epique' });
  }

  // Escalade : à partir du round 18 les coups font de plus en plus mal,
  // pour qu'aucune partie ne s'enlise jusqu'à la limite de rounds.
  degats *= multiplicateurEscalade(etat.round);

  // Variance légère.
  degats *= 0.94 + rng.next() * 0.12;
  etat.rng = rng.state;

  const final = Math.max(1, Math.round(degats));
  const inflige = infligerBrut(etat, coteAdv, def, final, evts, efficacite, critique);

  const st = etat.stats[cote];
  if (inflige > st.meilleurCoup) st.meilleurCoup = inflige;
  if (critique) st.critiques += 1;
  if (efficacite === 'SUPER') st.superEfficaces += 1;

  // Effets après dégâts.
  if (att.passifId === 'brasier' && critique && !def.ko) {
    ajouterStatut(etat, coteAdv, def, 'BRULURE', 3, evts);
  }
  if (att.passifId === 'drain_ame' && sort.def.categorie === 'MAGIQUE') {
    soigner(etat, cote, att, Math.round(inflige * 0.14), evts);
  }
  if (effet === 'VAMPIRIQUE') {
    soigner(etat, cote, att, Math.round(inflige * 0.12), evts);
  }
  if (itemEffet(def) === 'EPINES' && sort.def.categorie === 'PHYSIQUE' && !att.ko) {
    infligerBrut(etat, cote, att, Math.round(inflige * 0.15), evts, 'NEUTRE', false);
  }
  return inflige;
}

/** Applique des dégâts bruts (déjà calculés) en tenant compte du bouclier. */
function infligerBrut(
  etat: EtatCombat,
  cote: Cote,
  u: UniteCombat,
  montant: number,
  evts: EvtCombat[],
  efficacite: Efficacite,
  critique: boolean,
): number {
  if (u.ko || montant <= 0) return 0;
  let restant = montant;
  let absorbe = 0;
  if (u.bouclier > 0) {
    absorbe = Math.min(u.bouclier, restant);
    u.bouclier -= absorbe;
    restant -= absorbe;
  }
  let pvPerdus = Math.min(u.pv, restant);
  u.pv -= pvPerdus;

  if (u.pv <= 0 && itemEffet(u) === 'SURVIE' && !u.flags.survieUtilisee) {
    u.flags.survieUtilisee = 1;
    u.pv = 1;
    evts.push({ t: 'MESSAGE', texte: `${u.nom} survit de justesse !`, ton: 'epique' });
  }

  evts.push({
    t: 'DEGATS',
    cote,
    uniteUid: u.uid,
    montant: absorbe + pvPerdus,
    pv: u.pv,
    pvMax: u.pvMax,
    efficacite,
    critique,
    absorbeBouclier: absorbe,
  });

  if (u.pv <= 0) {
    u.pv = 0;
    mettreKo(etat, cote, u, evts);
  }
  return absorbe + pvPerdus;
}

function mettreKo(etat: EtatCombat, cote: Cote, u: UniteCombat, evts: EvtCombat[]): void {
  if (u.ko) return;
  u.ko = true;
  u.bouclier = 0;
  u.statuts = [];
  u.paliers = { atq: 0, def: 0, mag: 0, res: 0, vit: 0, chance: 0 };
  evts.push({ t: 'KO', cote, uniteUid: u.uid });
  evts.push({ t: 'MESSAGE', texte: `${u.nom} est hors de combat !`, ton: 'mal' });

  const eq = etat.equipes[cote];
  if (eq.unites[eq.actif].ko && vivants(eq).length > 0) {
    etat.remplacement = cote;
    // Le côté KO sort de la file : il ne rejouera pas ce round avec l'unité tombée.
    etat.file = etat.file.filter((c) => c !== cote);
  }
}

function soigner(
  etat: EtatCombat,
  cote: Cote,
  u: UniteCombat,
  montant: number,
  evts: EvtCombat[],
): number {
  if (u.ko || montant <= 0) return 0;
  let m = montant;
  if (u.passifId === 'second_souffle') m *= 1.25;
  // Pendant l'escalade, les soins ne suivent pas : impossible de temporiser.
  if (etat.round >= ROUND_ESCALADE) m *= Math.max(0.3, 1 - 0.1 * (etat.round - ROUND_ESCALADE + 1));
  if (aStatut(u, 'MALEDICTION')) m *= 0.5;
  const reel = Math.min(u.pvMax - u.pv, Math.round(m));
  if (reel <= 0) return 0;
  u.pv += reel;
  evts.push({ t: 'SOIN', cote, uniteUid: u.uid, montant: reel, pv: u.pv, pvMax: u.pvMax });
  return reel;
}

function donnerEnergie(
  etat: EtatCombat,
  cote: Cote,
  u: UniteCombat,
  montant: number,
  evts: EvtCombat[],
): void {
  const avant = u.energie;
  u.energie = Math.max(0, Math.min(u.energieMax, u.energie + montant));
  const delta = u.energie - avant;
  if (delta !== 0) {
    evts.push({ t: 'ENERGIE', cote, uniteUid: u.uid, valeur: delta, total: u.energie });
  }
}

function changerPalier(
  etat: EtatCombat,
  cote: Cote,
  u: UniteCombat,
  stat: Exclude<StatKey, 'pv'>,
  delta: number,
  evts: EvtCombat[],
): void {
  const avant = u.paliers[stat];
  u.paliers[stat] = Math.max(-6, Math.min(6, avant + delta));
  const reel = u.paliers[stat] - avant;
  if (reel !== 0) {
    evts.push({ t: 'PALIER', cote, uniteUid: u.uid, stat, delta: reel });
  }
}

function ajouterStatut(
  etat: EtatCombat,
  cote: Cote,
  u: UniteCombat,
  id: StatutId,
  duree: number,
  evts: EvtCombat[],
): void {
  if (u.ko) return;
  if (estMauvais(id) && itemEffet(u) === 'TALISMAN' && !u.flags.talismanUtilise) {
    u.flags.talismanUtilise = 1;
    evts.push({ t: 'MESSAGE', texte: `${u.nom} annule ${INFO_STATUTS[id].nom} !`, ton: 'bien' });
    return;
  }
  const existant = u.statuts.find((s) => s.id === id);
  if (existant) {
    existant.duree = Math.max(existant.duree, duree);
    existant.puissance += 1;
    return;
  }
  u.statuts.push({ id, duree, puissance: 1 });
  evts.push({ t: 'STATUT', cote, uniteUid: u.uid, statut: id, ajoute: true });
  evts.push({
    t: 'MESSAGE',
    texte: `${u.nom} : ${INFO_STATUTS[id].nom} !`,
    ton: INFO_STATUTS[id].bon ? 'bien' : 'mal',
  });
}

function retirerStatut(
  etat: EtatCombat,
  cote: Cote,
  u: UniteCombat,
  id: StatutId,
  evts: EvtCombat[],
): void {
  const avant = u.statuts.length;
  u.statuts = u.statuts.filter((s) => s.id !== id);
  if (u.statuts.length !== avant) {
    evts.push({ t: 'STATUT', cote, uniteUid: u.uid, statut: id, ajoute: false });
  }
}

function appliquerEffets(
  etat: EtatCombat,
  cote: Cote,
  sort: SortPret,
  coeff: number,
  degats: number,
  evts: EvtCombat[],
): void {
  const rng = new Rng(etat.rng);
  const lanceur = actif(etat, cote);
  const coteAdv = autreCote(cote);

  for (const effet of sort.def.effets) {
    const resoudre = (c: 'ENNEMI' | 'SOI'): { u: UniteCombat; cote: Cote } =>
      c === 'SOI' ? { u: lanceur, cote } : { u: actif(etat, coteAdv), cote: coteAdv };

    switch (effet.type) {
      case 'STATUT': {
        const { u, cote: c } = resoudre(effet.cible);
        if (!u.ko && rng.chance(effet.chance)) ajouterStatut(etat, c, u, effet.statut, effet.duree, evts);
        break;
      }
      case 'BUFF': {
        const { u, cote: c } = resoudre(effet.cible);
        if (u.ko) break;
        if (effet.chance !== undefined && !rng.chance(effet.chance)) break;
        changerPalier(etat, c, u, effet.stat, effet.palier, evts);
        break;
      }
      case 'BOUCLIER': {
        const val = Math.round(effet.valeur * coeff * (0.5 + lanceur.niveau / 40));
        lanceur.bouclier += val;
        evts.push({ t: 'BOUCLIER', cote, uniteUid: lanceur.uid, valeur: lanceur.bouclier });
        break;
      }
      case 'ENERGIE': {
        const { u, cote: c } = resoudre(effet.cible);
        donnerEnergie(etat, c, u, effet.valeur, evts);
        break;
      }
      case 'DRAIN': {
        if (degats > 0) soigner(etat, cote, lanceur, Math.round(degats * effet.ratio), evts);
        break;
      }
      case 'RECUL': {
        if (degats > 0) {
          infligerBrut(etat, cote, lanceur, Math.round(degats * effet.ratio), evts, 'NEUTRE', false);
        }
        break;
      }
      case 'PURGE': {
        const { u, cote: c } = resoudre(effet.cible);
        const cibles = u.statuts.filter((s) => (effet.cible === 'SOI' ? estMauvais(s.id) : s.id !== 'CONFUSION' && !estMauvais(s.id)));
        for (const s of cibles) retirerStatut(etat, c, u, s.id, evts);
        if (effet.cible === 'SOI') {
          for (const k of ['atq', 'def', 'mag', 'res', 'vit', 'chance'] as const) {
            if (u.paliers[k] < 0) changerPalier(etat, c, u, k, -u.paliers[k], evts);
          }
        }
        break;
      }
      case 'RELANCE': {
        if (rng.chance(effet.chance)) {
          lanceur.flags.relance = 1;
          evts.push({ t: 'MESSAGE', texte: `${lanceur.nom} rejoue !`, ton: 'epique' });
        }
        break;
      }
      case 'SOIN_FIXE': {
        const { u, cote: c } = resoudre(effet.cible);
        soigner(etat, c, u, Math.round(u.pvMax * effet.ratioPvMax), evts);
        break;
      }
      default:
        break;
    }
  }
  etat.rng = rng.state;
}

// ───────────────────────────── Fin de tour ─────────────────────────────

function terminerTour(
  etat: EtatCombat,
  cote: Cote,
  evts: EvtCombat[],
  rejoue = false,
): void {
  const u = actif(etat, cote);
  u.flags.tours = (u.flags.tours ?? 0) + 1;
  u.flags.tourDemarre = 0;

  // Dégâts et soins périodiques.
  for (const s of [...u.statuts]) {
    if (u.ko) break;
    switch (s.id) {
      case 'BRULURE':
        infligerBrut(etat, cote, u, Math.round(u.pvMax * 0.06), evts, 'NEUTRE', false);
        break;
      case 'POISON':
        infligerBrut(etat, cote, u, Math.round(u.pvMax * (0.04 + 0.015 * s.puissance)), evts, 'NEUTRE', false);
        s.puissance += 1;
        break;
      case 'SAIGNEMENT':
        infligerBrut(etat, cote, u, Math.round(u.pvMax * 0.07), evts, 'NEUTRE', false);
        break;
      case 'MALEDICTION':
        infligerBrut(etat, cote, u, Math.round(u.pvMax * 0.05), evts, 'NEUTRE', false);
        break;
      case 'REGEN':
        soigner(etat, cote, u, Math.round(u.pvMax * 0.08), evts);
        break;
      default:
        break;
    }
  }

  if (!u.ko && u.passifId === 'ressac') {
    soigner(etat, cote, u, Math.round(u.pvMax * 0.05), evts);
  }

  // Décompte des durées.
  u.statuts = u.statuts
    .map((s) => ({ ...s, duree: s.duree - 1 }))
    .filter((s) => {
      if (s.duree > 0) return true;
      evts.push({ t: 'STATUT', cote, uniteUid: u.uid, statut: s.id, ajoute: false });
      return false;
    });

  // La garde ne dure qu'un tour adverse.
  const adv = actif(etat, autreCote(cote));
  adv.flags.garde = 0;

  if (!rejoue) {
    etat.file = etat.file.filter((c) => c !== cote);
  }
}

// ───────────────────────────── Fin de combat ─────────────────────────────

function verifierFin(etat: EtatCombat, evts: EvtCombat[]): boolean {
  if (etat.phase === 'TERMINE') return true;
  const a = vivants(etat.equipes[0]).length;
  const b = vivants(etat.equipes[1]).length;
  if (a === 0 && b === 0) {
    terminer(etat, null, 'double KO', evts);
    return true;
  }
  if (a === 0) {
    terminer(etat, 1, 'KO', evts);
    return true;
  }
  if (b === 0) {
    terminer(etat, 0, 'KO', evts);
    return true;
  }
  return false;
}

function finParLimite(etat: EtatCombat, evts: EvtCombat[]): void {
  const ratio = (c: Cote): number => {
    const eq = etat.equipes[c];
    const tot = eq.unites.reduce((s, u) => s + u.pvMax, 0);
    const cur = eq.unites.reduce((s, u) => s + u.pv, 0);
    return tot > 0 ? cur / tot : 0;
  };
  const ra = ratio(0);
  const rb = ratio(1);
  if (Math.abs(ra - rb) < 0.01) terminer(etat, null, 'limite de rounds', evts);
  else terminer(etat, ra > rb ? 0 : 1, 'limite de rounds — meilleure santé', evts);
}

function terminer(etat: EtatCombat, vainqueur: Cote | null, motif: string, evts: EvtCombat[]): void {
  if (etat.phase === 'TERMINE') return;
  etat.phase = 'TERMINE';
  etat.vainqueur = vainqueur;
  etat.motifFin = motif;
  etat.remplacement = null;
  etat.file = [];
  evts.push({ t: 'FIN', vainqueur, motif });
  evts.push({
    t: 'MESSAGE',
    texte:
      vainqueur === null
        ? 'Match nul !'
        : `${etat.equipes[vainqueur].nom} remporte le combat ! (${motif})`,
    ton: 'epique',
  });
}

// ───────────────────────────── Vues ─────────────────────────────

function vueUnite(u: UniteCombat, complet: boolean): UnitePublique {
  const base: UnitePublique = {
    uid: u.uid,
    especeId: u.especeId,
    nom: u.nom,
    niveau: u.niveau,
    element: u.element,
    role: u.role,
    art: u.art,
    chromatique: u.chromatique,
    sceau: u.sceau,
    pv: u.pv,
    pvMax: u.pvMax,
    energie: u.energie,
    energieMax: u.energieMax,
    bouclier: u.bouclier,
    paliers: { ...u.paliers },
    statuts: u.statuts.map((s) => ({ ...s })),
    ko: u.ko,
    itemId: u.itemId,
    passifId: u.passifId,
  };
  if (complet) {
    base.sorts = u.sorts;
    base.recharges = [...u.recharges];
    base.stats = { ...u.stats };
  }
  return base;
}

export function vuePour(etat: EtatCombat, moi: Cote): VueCombat {
  return {
    id: etat.id,
    round: etat.round,
    tour: etat.tour,
    phase: etat.phase,
    vainqueur: etat.vainqueur,
    motifFin: etat.motifFin,
    moi,
    auTour: etat.phase === 'TERMINE' ? null : (etat.remplacement ?? etat.file[0] ?? null),
    remplacement: etat.remplacement,
    equipes: [0, 1].map((i) => {
      const eq = etat.equipes[i as Cote];
      return {
        proprietaire: eq.proprietaire,
        nom: eq.nom,
        actif: eq.actif,
        unites: eq.unites.map((u) => vueUnite(u, i === moi)),
      };
    }) as VueCombat['equipes'],
    limiteRounds: etat.limiteRounds,
  };
}

export function unitesSurvivantes(etat: EtatCombat, cote: Cote): number {
  return vivants(etat.equipes[cote]).length;
}

export function especeDe(u: UniteCombat) {
  return ESPECES_PAR_ID[u.especeId];
}
