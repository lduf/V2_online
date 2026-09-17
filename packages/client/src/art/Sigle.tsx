import { useMemo } from 'react';
import type { SortDef } from '@arene/engine';
import { INFO_ELEMENTS } from '@arene/engine';

let compteur = 0;

/**
 * Sceau d'un sort : un glyphe géométrique dérivé de la forme de son effet.
 * L'anneau extérieur porte autant d'encoches que le dé a de faces (plafonné) :
 * d'un coup d'œil on voit si le sort est fiable ou s'il joue à la roulette.
 */
export function Sigle({ def, taille = 110 }: { def: SortDef; taille?: number }) {
  const id = useMemo(() => `sg${++compteur}`, []);
  const el = INFO_ELEMENTS[def.element];
  const encoches = Math.max(3, Math.min(36, def.de));
  const risque = Math.min(1, Math.log10(Math.max(1, def.de)) / 2);

  return (
    <svg
      viewBox="0 0 120 120"
      width={taille}
      height={taille}
      className="sigle"
      role="img"
      aria-label={`Sceau de ${def.nom}`}
    >
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={el.couleurClaire} stopOpacity="0.95" />
          <stop offset="55%" stopColor={el.couleur} stopOpacity="0.35" />
          <stop offset="100%" stopColor={el.couleur} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-trait`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor={el.couleur} />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="f" />
          <feMerge>
            <feMergeNode in="f" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="60" cy="60" r="56" fill={`url(#${id}-halo)`} />

      {/* Anneau des faces du dé */}
      <g className="sigle__anneau" stroke={el.couleur} strokeOpacity="0.75">
        <circle cx="60" cy="60" r="50" fill="none" strokeWidth="1" strokeOpacity="0.35" />
        {Array.from({ length: encoches }, (_, i) => {
          const a = (i / encoches) * Math.PI * 2 - Math.PI / 2;
          const r1 = 46;
          const r2 = 50 + risque * 4;
          return (
            <line
              key={i}
              x1={60 + Math.cos(a) * r1}
              y1={60 + Math.sin(a) * r1}
              x2={60 + Math.cos(a) * r2}
              y2={60 + Math.sin(a) * r2}
              strokeWidth={def.de > 24 ? 1.2 : 2}
            />
          );
        })}
      </g>

      <g filter={`url(#${id}-glow)`} stroke={`url(#${id}-trait)`} fill="none" strokeLinecap="round">
        <Glyphe forme={def.vfx.forme} couleur={el.couleur} />
      </g>

      {/* Marque de catégorie au centre */}
      <circle cx="60" cy="60" r="9" fill="#0d0819" stroke={el.couleur} strokeWidth="1.4" />
      <text
        x="60"
        y="64.5"
        textAnchor="middle"
        fontSize="10"
        fill={el.couleurClaire}
        style={{ userSelect: 'none', fontWeight: 700 }}
      >
        {def.categorie === 'PHYSIQUE'
          ? '✦'
          : def.categorie === 'MAGIQUE'
            ? '✧'
            : def.categorie === 'PUR'
              ? '◈'
              : '✚'}
      </text>
    </svg>
  );
}

function Glyphe({ forme, couleur }: { forme: SortDef['vfx']['forme']; couleur: string }) {
  switch (forme) {
    case 'projectile':
      return (
        <>
          <circle cx="60" cy="60" r="20" strokeWidth="2.5" />
          <path d="M60 26 l0 -8 M60 94 l0 8 M26 60 l-8 0 M94 60 l8 0" strokeWidth="2" />
          <circle cx="60" cy="60" r="28" strokeWidth="1" strokeOpacity="0.5" />
        </>
      );
    case 'rayon':
      return (
        <>
          <path d="M20 60 h80" strokeWidth="3" />
          <path d="M32 46 h56 M32 74 h56" strokeWidth="1.6" strokeOpacity="0.7" />
          <path d="M84 48 l12 12 l-12 12" strokeWidth="2.5" />
        </>
      );
    case 'lame':
      return (
        <>
          <path d="M28 88 L92 32" strokeWidth="3" />
          <path d="M34 32 L88 86" strokeWidth="2" strokeOpacity="0.65" />
          <circle cx="60" cy="60" r="30" strokeWidth="1" strokeOpacity="0.4" />
        </>
      );
    case 'impact':
      return (
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <path
                key={i}
                d={`M${60 + Math.cos(a) * 12} ${60 + Math.sin(a) * 12} L${60 + Math.cos(a) * 34} ${60 + Math.sin(a) * 34}`}
                strokeWidth={i % 2 ? 1.6 : 3}
              />
            );
          })}
        </>
      );
    case 'explosion':
      return (
        <>
          <circle cx="60" cy="60" r="14" strokeWidth="3" />
          <circle cx="60" cy="60" r="24" strokeWidth="2" strokeOpacity="0.7" />
          <circle cx="60" cy="60" r="34" strokeWidth="1.2" strokeOpacity="0.45" />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + 0.4;
            return (
              <path
                key={i}
                d={`M${60 + Math.cos(a) * 36} ${60 + Math.sin(a) * 36} l${Math.cos(a) * 8} ${Math.sin(a) * 8}`}
                strokeWidth="2.5"
              />
            );
          })}
        </>
      );
    case 'aura':
      return (
        <>
          <circle cx="60" cy="60" r="18" strokeWidth="2.5" />
          <path d="M60 78 q-18 -18 0 -36 q18 18 0 36" strokeWidth="2" strokeOpacity="0.8" />
          <path d="M42 60 q18 -18 36 0 q-18 18 -36 0" strokeWidth="2" strokeOpacity="0.8" />
          <circle cx="60" cy="60" r="32" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4 6" />
        </>
      );
    case 'lien':
      return (
        <>
          <circle cx="36" cy="60" r="10" strokeWidth="2.5" />
          <circle cx="84" cy="60" r="10" strokeWidth="2.5" />
          <path d="M46 60 h28" strokeWidth="2" strokeDasharray="5 4" />
          <path d="M36 44 v-12 M84 76 v12" strokeWidth="1.6" strokeOpacity="0.6" />
        </>
      );
    case 'balayage':
      return (
        <>
          <path d="M22 78 Q60 26 98 78" strokeWidth="3" />
          <path d="M30 86 Q60 42 90 86" strokeWidth="1.8" strokeOpacity="0.6" />
          <path d="M38 94 Q60 58 82 94" strokeWidth="1.2" strokeOpacity="0.4" />
        </>
      );
    case 'pluie':
      return (
        <>
          {[28, 44, 60, 76, 92].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${26 + (i % 2) * 8} l0 ${44 - (i % 2) * 8}`}
              strokeWidth={i % 2 ? 1.8 : 2.8}
            />
          ))}
          <path d="M24 84 h72" strokeWidth="2" strokeOpacity="0.5" />
        </>
      );
    default:
      return <circle cx="60" cy="60" r="24" strokeWidth="2.5" />;
  }
}
