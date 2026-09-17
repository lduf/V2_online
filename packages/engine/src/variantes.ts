import type { ArtSpec, IvsPerso, IvsSort } from './types.js';
import { IV_MAX } from './stats.js';
import type { Rng } from './rng.js';

/**
 * Variantes purement cosmétiques. Aucune d'entre elles ne touche aux
 * statistiques : dans un jeu compétitif, le prestige ne doit jamais acheter
 * de la puissance, sinon c'est la chance qui décide du classement.
 */

/** Une chance sur 128 à l'obtention d'un personnage. */
export const TAUX_CHROMATIQUE = 1 / 128;
/** Une chance sur 96 à l'obtention d'un sort. */
export const TAUX_PRISME = 1 / 96;

export function tirerChromatique(rng: Rng, multiplicateur = 1): boolean {
  return rng.next() < TAUX_CHROMATIQUE * multiplicateur;
}

export function tirerPrisme(rng: Rng, multiplicateur = 1): boolean {
  return rng.next() < TAUX_PRISME * multiplicateur;
}

/** Le sceau récompense les sept gènes au maximum. Statistiquement, presque jamais. */
export function aSceauParfait(ivs: IvsPerso): boolean {
  return (
    ivs.pv === IV_MAX &&
    ivs.atq === IV_MAX &&
    ivs.def === IV_MAX &&
    ivs.mag === IV_MAX &&
    ivs.res === IV_MAX &&
    ivs.vit === IV_MAX &&
    ivs.chance === IV_MAX
  );
}

export function aSceauParfaitSort(ivs: IvsSort): boolean {
  return (
    ivs.puissance === IV_MAX &&
    ivs.precision === IV_MAX &&
    ivs.critique === IV_MAX &&
    ivs.cout === IV_MAX
  );
}

// ───────────────────────────── Palette alternative ─────────────────────────────

interface Tsl {
  t: number;
  s: number;
  l: number;
}

function versTsl(hex: string): Tsl | null {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const v = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, v, b);
  const min = Math.min(r, v, b);
  const l = (max + min) / 2;
  if (max === min) return { t: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let t: number;
  if (max === r) t = ((v - b) / d + (v < b ? 6 : 0)) / 6;
  else if (max === v) t = ((b - r) / d + 2) / 6;
  else t = ((r - v) / d + 4) / 6;
  return { t, s, l };
}

function versHex({ t, s, l }: Tsl): string {
  const composante = (p: number, q: number, x: number): number => {
    let y = x;
    if (y < 0) y += 1;
    if (y > 1) y -= 1;
    if (y < 1 / 6) return p + (q - p) * 6 * y;
    if (y < 1 / 2) return q;
    if (y < 2 / 3) return p + (q - p) * (2 / 3 - y) * 6;
    return p;
  };
  let r: number;
  let v: number;
  let b: number;
  if (s === 0) {
    r = v = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = composante(p, q, t + 1 / 3);
    v = composante(p, q, t);
    b = composante(p, q, t - 1 / 3);
  }
  const oct = (x: number) => Math.max(0, Math.min(255, Math.round(x * 255)));
  return `#${((oct(r) << 16) | (oct(v) << 8) | oct(b)).toString(16).padStart(6, '0')}`;
}

function decaler(hex: string, teinte: number, gainSat: number, gainLum = 0): string {
  const tsl = versTsl(hex);
  if (!tsl) return hex;
  return versHex({
    t: (tsl.t + teinte + 1) % 1,
    s: Math.max(0, Math.min(1, tsl.s * gainSat)),
    l: Math.max(0.06, Math.min(0.94, tsl.l + gainLum)),
  });
}

/** Décalage déterministe par espèce : un chromatique donné a toujours la même robe. */
function decalageEspece(especeId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < especeId.length; i++) {
    h ^= especeId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Entre 0,32 et 0,78 de tour : assez loin pour être évident, jamais identique
  // à l'original.
  return 0.32 + ((h >>> 0) % 1000) / 1000 * 0.46;
}

/**
 * Robe chromatique : teintes décalées, saturation poussée, fond assombri pour
 * faire ressortir les particules. La peau ne bouge presque pas, sinon le
 * personnage n'est plus reconnaissable.
 */
export function paletteChromatique(art: ArtSpec, especeId: string): ArtSpec {
  const d = decalageEspece(especeId);
  return {
    ...art,
    peau: decaler(art.peau, d * 0.12, 1.05),
    cheveux: decaler(art.cheveux, d, 1.35, 0.06),
    tenue: decaler(art.tenue, d, 1.3),
    accent: decaler(art.accent, d + 0.5, 1.4, 0.08),
    fond: [decaler(art.fond[0], d, 1.25, -0.04), decaler(art.fond[1], d, 1.3)],
  };
}

/** Art à afficher pour un personnage, selon qu'il est chromatique ou non. */
export function artEffectif(art: ArtSpec, especeId: string, chromatique?: boolean): ArtSpec {
  return chromatique ? paletteChromatique(art, especeId) : art;
}
