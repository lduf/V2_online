/**
 * RNG déterministe (mulberry32). L'état tient dans un entier 32 bits, ce qui
 * permet de le sérialiser dans l'état de combat et de rejouer exactement la
 * même partie côté client et côté serveur.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  static fromString(seed: string): Rng {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return new Rng(h >>> 0);
  }

  get state(): number {
    return this.s >>> 0;
  }

  set state(v: number) {
    this.s = v >>> 0;
  }

  /** Flottant dans [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Lancer de dé à `faces` faces : 1..faces. */
  de(faces: number): number {
    return this.int(1, Math.max(1, Math.floor(faces)));
  }

  /** Vrai avec une probabilité de `pourcent` %. */
  chance(pourcent: number): boolean {
    return this.next() * 100 < pourcent;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Mélange de Fisher-Yates, renvoie une nouvelle liste. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /** Tirage pondéré. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((s, e) => s + e[1], 0);
    let r = this.next() * total;
    for (const [value, weight] of entries) {
      r -= weight;
      if (r <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }
}

export function seedAleatoire(): number {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}
