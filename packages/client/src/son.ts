/**
 * Effets sonores entièrement synthétisés via la Web Audio API : aucun fichier
 * à charger, donc aucun coût de bande passante et tout fonctionne hors ligne.
 */
let ctx: AudioContext | null = null;
let actif = localStorage.getItem('arene.son') !== 'off';

function contexte(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function sonActif(): boolean {
  return actif;
}

export function basculerSon(): boolean {
  actif = !actif;
  localStorage.setItem('arene.son', actif ? 'on' : 'off');
  if (actif) jouer('clic');
  return actif;
}

interface Note {
  type?: OscillatorType;
  freq: number;
  vers?: number;
  duree: number;
  volume?: number;
  retard?: number;
  /** Ajoute un souffle de bruit blanc (impacts, explosions). */
  bruit?: number;
}

function note(n: Note): void {
  const c = contexte();
  if (!c) return;
  const t0 = c.currentTime + (n.retard ?? 0);
  const gain = c.createGain();
  gain.connect(c.destination);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, n.volume ?? 0.09), t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.duree);

  const osc = c.createOscillator();
  osc.type = n.type ?? 'sine';
  osc.frequency.setValueAtTime(n.freq, t0);
  if (n.vers) osc.frequency.exponentialRampToValueAtTime(Math.max(20, n.vers), t0 + n.duree);
  osc.connect(gain);
  osc.start(t0);
  osc.stop(t0 + n.duree + 0.02);

  if (n.bruit) {
    const taille = Math.floor(c.sampleRate * n.duree);
    const tampon = c.createBuffer(1, Math.max(1, taille), c.sampleRate);
    const data = tampon.getChannelData(0);
    for (let i = 0; i < taille; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / taille);
    }
    const src = c.createBufferSource();
    src.buffer = tampon;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(n.bruit, t0);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + n.duree);
    const filtre = c.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.setValueAtTime(2200, t0);
    src.connect(filtre).connect(g2).connect(c.destination);
    src.start(t0);
  }
}

export type NomSon =
  | 'clic'
  | 'survol'
  | 'de'
  | 'deParfait'
  | 'impact'
  | 'critique'
  | 'super'
  | 'faible'
  | 'soin'
  | 'bouclier'
  | 'energie'
  | 'statut'
  | 'ko'
  | 'victoire'
  | 'defaite'
  | 'invocation'
  | 'legendaire'
  | 'achat'
  | 'erreur'
  | 'tour';

export function jouer(nom: NomSon): void {
  if (!actif) return;
  switch (nom) {
    case 'clic':
      note({ type: 'triangle', freq: 620, vers: 880, duree: 0.07, volume: 0.05 });
      break;
    case 'survol':
      note({ type: 'sine', freq: 1200, duree: 0.03, volume: 0.02 });
      break;
    case 'de':
      for (let i = 0; i < 5; i++) {
        note({
          type: 'square',
          freq: 300 + i * 90,
          duree: 0.05,
          volume: 0.035,
          retard: i * 0.055,
          bruit: 0.02,
        });
      }
      break;
    case 'deParfait':
      [880, 1108, 1318, 1760].forEach((f, i) =>
        note({ type: 'triangle', freq: f, duree: 0.25, volume: 0.07, retard: i * 0.06 }),
      );
      break;
    case 'impact':
      note({ type: 'sawtooth', freq: 180, vers: 60, duree: 0.18, volume: 0.09, bruit: 0.14 });
      break;
    case 'critique':
      note({ type: 'sawtooth', freq: 320, vers: 70, duree: 0.3, volume: 0.13, bruit: 0.24 });
      note({ type: 'square', freq: 1400, vers: 400, duree: 0.2, volume: 0.05, retard: 0.03 });
      break;
    case 'super':
      note({ type: 'sawtooth', freq: 420, vers: 90, duree: 0.28, volume: 0.11, bruit: 0.2 });
      note({ type: 'sine', freq: 1600, vers: 900, duree: 0.22, volume: 0.045, retard: 0.02 });
      break;
    case 'faible':
      note({ type: 'sine', freq: 150, vers: 90, duree: 0.14, volume: 0.05, bruit: 0.05 });
      break;
    case 'soin':
      [660, 880, 1046].forEach((f, i) =>
        note({ type: 'sine', freq: f, duree: 0.3, volume: 0.05, retard: i * 0.07 }),
      );
      break;
    case 'bouclier':
      note({ type: 'triangle', freq: 300, vers: 720, duree: 0.28, volume: 0.06 });
      break;
    case 'energie':
      note({ type: 'square', freq: 900, vers: 1500, duree: 0.1, volume: 0.03 });
      break;
    case 'statut':
      note({ type: 'sawtooth', freq: 420, vers: 240, duree: 0.2, volume: 0.045 });
      break;
    case 'ko':
      note({ type: 'sawtooth', freq: 260, vers: 40, duree: 0.7, volume: 0.11, bruit: 0.1 });
      break;
    case 'victoire':
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        note({ type: 'triangle', freq: f, duree: 0.45, volume: 0.075, retard: i * 0.11 }),
      );
      break;
    case 'defaite':
      [440, 392, 330, 262].forEach((f, i) =>
        note({ type: 'sine', freq: f, duree: 0.5, volume: 0.06, retard: i * 0.16 }),
      );
      break;
    case 'invocation':
      note({ type: 'sine', freq: 200, vers: 1400, duree: 0.6, volume: 0.06 });
      break;
    case 'legendaire':
      [659, 784, 988, 1318, 1568].forEach((f, i) =>
        note({ type: 'triangle', freq: f, duree: 0.7, volume: 0.09, retard: i * 0.09 }),
      );
      break;
    case 'achat':
      [784, 1046].forEach((f, i) =>
        note({ type: 'triangle', freq: f, duree: 0.18, volume: 0.06, retard: i * 0.08 }),
      );
      break;
    case 'erreur':
      note({ type: 'square', freq: 180, vers: 120, duree: 0.2, volume: 0.05 });
      break;
    case 'tour':
      note({ type: 'triangle', freq: 520, vers: 700, duree: 0.12, volume: 0.04 });
      break;
  }
}
