import { create } from 'zustand';
import { api, definirToken, ErreurApi, type CompteInfo, type Profil } from './api';
import { jouer } from './son';

export type Ecran =
  | 'accueil'
  | 'combat'
  | 'atelier'
  | 'collection'
  | 'boutique'
  | 'invocation'
  | 'classement'
  | 'tour';

interface Toast {
  id: number;
  texte: string;
  ton: 'info' | 'bien' | 'mal';
}

interface EtatApp {
  pret: boolean;
  connecte: boolean;
  profil: Profil | null;
  ecran: Ecran;
  combatId: string | null;
  toasts: Toast[];

  initialiser: () => Promise<void>;
  connexion: (pseudo: string, mdp: string) => Promise<void>;
  inscription: (pseudo: string, mdp: string) => Promise<void>;
  deconnexion: () => void;
  rafraichir: () => Promise<void>;
  appliquerProfil: (p: Profil) => void;
  aller: (e: Ecran) => void;
  entrerEnCombat: (id: string) => void;
  quitterCombat: () => Promise<void>;
  notifier: (texte: string, ton?: Toast['ton']) => void;
  fermerToast: (id: number) => void;
}

let compteurToast = 0;

export const useApp = create<EtatApp>((set, get) => ({
  pret: false,
  connecte: false,
  profil: null,
  ecran: 'accueil',
  combatId: null,
  toasts: [],

  async initialiser() {
    if (!localStorage.getItem('arene.token')) {
      set({ pret: true, connecte: false });
      return;
    }
    try {
      const profil = await api.moi();
      const enCours = await api.combatEnCours().catch(() => ({ combatId: null }));
      set({
        pret: true,
        connecte: true,
        profil,
        combatId: enCours.combatId,
        ecran: enCours.combatId ? 'combat' : 'accueil',
      });
    } catch {
      definirToken(null);
      set({ pret: true, connecte: false, profil: null });
    }
  },

  async connexion(pseudo, mdp) {
    const r = await api.connexion(pseudo, mdp);
    definirToken(r.token);
    const profil = await api.moi();
    set({ connecte: true, profil, ecran: 'accueil' });
    jouer('clic');
  },

  async inscription(pseudo, mdp) {
    const r = await api.inscription(pseudo, mdp);
    definirToken(r.token);
    const profil = await api.moi();
    set({ connecte: true, profil, ecran: 'accueil' });
    jouer('victoire');
  },

  deconnexion() {
    definirToken(null);
    set({ connecte: false, profil: null, combatId: null, ecran: 'accueil' });
  },

  async rafraichir() {
    try {
      set({ profil: await api.moi() });
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 401) get().deconnexion();
    }
  },

  appliquerProfil(p) {
    set({ profil: p });
  },

  aller(ecran) {
    jouer('clic');
    set({ ecran });
  },

  entrerEnCombat(id) {
    set({ combatId: id, ecran: 'combat' });
  },

  async quitterCombat() {
    set({ combatId: null, ecran: 'accueil' });
    await get().rafraichir();
  },

  notifier(texte, ton = 'info') {
    const id = ++compteurToast;
    set((s) => ({ toasts: [...s.toasts, { id, texte, ton }] }));
    if (ton === 'mal') jouer('erreur');
    setTimeout(() => get().fermerToast(id), 4200);
  },

  fermerToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export function compte(): CompteInfo | null {
  return useApp.getState().profil?.compte ?? null;
}
