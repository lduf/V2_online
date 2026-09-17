import type {
  BattleAction,
  EvtCombat,
  PersoPossede,
  SortPossede,
  VueCombat,
} from '@arene/engine';

const BASE = '/api';

let token: string | null = localStorage.getItem('arene.token');

export function definirToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem('arene.token', t);
  else localStorage.removeItem('arene.token');
}

export function aUnToken(): boolean {
  return !!token;
}

export class ErreurApi extends Error {
  constructor(
    message: string,
    public readonly statut: number,
  ) {
    super(message);
  }
}

async function requete<T>(methode: string, chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(BASE + chemin, {
    method: methode,
    headers: {
      ...(corps ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  const donnees = texte ? (JSON.parse(texte) as Record<string, unknown>) : {};
  if (!r.ok) {
    if (r.status === 401) definirToken(null);
    throw new ErreurApi(
      (donnees.erreur as string) ?? 'Une erreur est survenue.',
      r.status,
    );
  }
  return donnees as T;
}

// ───────────────────────────── Types de réponse ─────────────────────────────

export interface CompteInfo {
  id: string;
  pseudo: string;
  credits: number;
  eclats: number;
  elo: number;
  parties: number;
  victoires: number;
  defaites: number;
  serie: number;
  meilleure_serie: number;
  pitie_standard: number;
  pitie_legendaire: number;
  saison: number;
  cree_le: number;
  vu_le: number;
  rang: number | null;
  division?: string;
}

export interface Profil {
  compte: CompteInfo;
  persos: PersoPossede[];
  sorts: SortPossede[];
  items: Record<string, number>;
  equipe: string[];
}

export interface RecompensesJoueur {
  credits: number;
  eclats: number;
  xp: number;
  deltaElo: number;
  nouveauElo: number;
  monteesNiveau: { uid: string; nom: string; niveau: number }[];
  victoire: boolean;
}

export interface EtatCombatClient {
  combatId: string;
  mode: string;
  classe: boolean;
  vue: VueCombat;
  evenements: EvtCombat[];
  curseur: number;
  termine: boolean;
  resultats: RecompensesJoueur | null;
  adversaire: { pseudo: string; elo: number; bot: boolean };
  limiteTour: number;
}

export interface OffreBoutique {
  kind: 'PERSO' | 'SORT' | 'ITEM';
  id: string;
  prix: number;
  remise: number;
  rarete: string;
}

export interface Boutique {
  jour: number;
  expireLe: number;
  rotation: OffreBoutique[];
  permanents: OffreBoutique[];
}

export interface LigneClassement {
  rang: number;
  id: string;
  pseudo: string;
  elo: number;
  parties: number;
  victoires: number;
  defaites: number;
  serie: number;
}

export interface VueTour {
  enCours: boolean;
  etage: number;
  etages: number;
  nomEtage: string;
  bonus: string[];
  choix: string[] | null;
  combatId: string | null;
  termine: boolean;
  victoire: boolean;
  pv: Record<string, number>;
  tentativeGratuiteDispo: boolean;
  coutTentative: number;
}

export interface EtatFile {
  enFile: boolean;
  combatId: string | null;
  attenteMs: number;
  joueursEnFile: number;
}

export interface LigneMatch {
  id: string;
  mode: string;
  nom_a: string;
  nom_b: string;
  vainqueur: string | null;
  compte_a: string;
  compte_b: string | null;
  delta_a: number;
  delta_b: number;
  rounds: number;
  cree_le: number;
}

// ───────────────────────────── Appels ─────────────────────────────

export const api = {
  inscription: (pseudo: string, motDePasse: string) =>
    requete<{ token: string; compte: CompteInfo }>('POST', '/auth/inscription', {
      pseudo,
      motDePasse,
    }),
  connexion: (pseudo: string, motDePasse: string) =>
    requete<{ token: string; compte: CompteInfo }>('POST', '/auth/connexion', {
      pseudo,
      motDePasse,
    }),
  moi: () => requete<Profil>('GET', '/moi'),

  definirEquipe: (membres: string[]) =>
    requete<{ equipe: string[] }>('PUT', '/equipe', { membres }),
  validerEquipe: () =>
    requete<{ problemes: { code: string; message: string }[] }>('GET', '/equipe/validation'),

  majPerso: (
    uid: string,
    patch: { sorts?: (string | null)[]; itemId?: string | null; surnom?: string | null },
  ) => requete<{ perso: PersoPossede }>('PUT', `/persos/${uid}`, patch),
  rerollGenes: (uid: string) => requete<Profil>('POST', `/persos/${uid}/genes`, {}),
  hyperEntrainement: (uid: string, stat: string) =>
    requete<Profil>('POST', `/persos/${uid}/hyper`, { stat }),
  rerollGenesSort: (uid: string) => requete<Profil>('POST', `/sorts/${uid}/genes`, {}),

  invoquer: (banniere: string, lot: boolean) =>
    requete<Profil & { boosters: unknown[] }>('POST', '/invocation', { banniere, lot }),
  boutique: () => requete<Boutique>('GET', '/boutique'),
  acheter: (kind: string, id: string) =>
    requete<Profil & { prix: number; obtenu: unknown }>('POST', '/boutique/achat', { kind, id }),

  classement: () =>
    requete<{
      saison: { numero: number; debut: number };
      lignes: LigneClassement[];
      monRang: number | null;
    }>('GET', '/classement'),
  historique: () => requete<{ matchs: LigneMatch[] }>('GET', '/historique'),

  combatSolo: (difficulte: string) =>
    requete<EtatCombatClient>('POST', '/combat/solo', { difficulte }),
  combatEnCours: () => requete<{ combatId: string | null }>('GET', '/combat/encours'),
  lireCombat: (id: string, depuis: number) =>
    requete<EtatCombatClient>('GET', `/combat/${id}?depuis=${depuis}`),
  agir: (id: string, action: BattleAction, depuis: number) =>
    requete<EtatCombatClient>('POST', `/combat/${id}/action`, { action, depuis }),
  abandonner: (id: string, depuis: number) =>
    requete<EtatCombatClient>('POST', `/combat/${id}/abandon`, { depuis }),

  tour: () => requete<VueTour>('GET', '/tour'),
  tourDemarrer: () => requete<VueTour>('POST', '/tour/demarrer', {}),
  tourBonus: (id: string) => requete<VueTour>('POST', '/tour/bonus', { id }),
  tourAbandonner: () => requete<VueTour>('POST', '/tour/abandonner', {}),

  rejoindreFile: () => requete<EtatFile>('POST', '/file/rejoindre', {}),
  etatFile: () => requete<EtatFile>('GET', '/file/etat'),
  quitterFile: () => requete<{ enFile: boolean }>('POST', '/file/quitter', {}),

  creerSalon: () => requete<{ code: string }>('POST', '/salon/creer', {}),
  etatSalon: (code: string) =>
    requete<{ combatId: string | null; existe: boolean }>('GET', `/salon/${code}`),
  rejoindreSalon: (code: string) =>
    requete<{ combatId: string }>('POST', '/salon/rejoindre', { code }),
};
