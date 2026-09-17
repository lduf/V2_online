import { useMemo } from 'react';
import type { ArtSpec, Element } from '@arene/engine';
import { INFO_ELEMENTS } from '@arene/engine';

export type Pose = 'repos' | 'attaque' | 'touche' | 'ko' | 'victoire' | 'portrait';

interface Props {
  art: ArtSpec;
  element?: Element;
  taille?: number;
  pose?: Pose;
  /** Retourne le personnage : l'adversaire regarde vers la gauche. */
  miroir?: boolean;
  avecFond?: boolean;
  className?: string;
}

interface Morphologie {
  /** Demi-largeur des épaules. */
  epaules: number;
  /** Demi-largeur à la taille. */
  taille: number;
  torse: number;
  /** Rayon de la tête. */
  tete: number;
  cou: number;
  jambes: number;
  /** Épaisseur des bras. */
  bras: number;
}

/**
 * Proportions volontairement « chibi » : une grosse tête se lit bien même
 * à 50 px de haut, là où une silhouette réaliste devient une tache.
 */
const MORPHOS: Record<number, Morphologie> = {
  1: { epaules: 19, taille: 16, torse: 30, tete: 22, cou: 3, jambes: 17, bras: 8 }, // élancée
  2: { epaules: 25, taille: 19, torse: 29, tete: 21, cou: 4, jambes: 17, bras: 10 }, // athlétique
  3: { epaules: 20, taille: 14, torse: 32, tete: 20, cou: 5, jambes: 20, bras: 8 }, // longiligne
  4: { epaules: 30, taille: 25, torse: 28, tete: 22, cou: 2, jambes: 14, bras: 12 }, // massive
  5: { epaules: 21, taille: 15, torse: 29, tete: 21, cou: 4, jambes: 20, bras: 8 }, // nerveuse
  6: { epaules: 22, taille: 26, torse: 34, tete: 21, cou: 3, jambes: 10, bras: 9 }, // en robe
};

function melange(hex: string, facteur: number): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = (d: number) => Math.max(0, Math.min(255, Math.round(d * facteur)));
  const r = c((n >> 16) & 255);
  const v = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (v << 8) | b).toString(16).padStart(6, '0')}`;
}

let compteur = 0;

export function Avatar({
  art,
  element,
  taille = 150,
  pose = 'repos',
  miroir = false,
  avecFond = true,
  className,
}: Props) {
  const id = useMemo(() => `av${++compteur}`, []);
  const m = MORPHOS[art.silhouette] ?? MORPHOS[1];

  const cx = 60;
  const sol = 132;
  const yHanches = sol - m.jambes;
  const yEpaules = yHanches - m.torse;
  const yTete = yEpaules - m.cou - m.tete * 2; // sommet du crâne
  const cyTete = yTete + m.tete;

  const couleurElement = element ? INFO_ELEMENTS[element].couleur : art.accent;
  const contour = melange(art.tenue, 0.35);
  const ombreTenue = melange(art.tenue, 0.66);
  const ombrePeau = melange(art.peau, 0.85);
  const ombreCheveux = melange(art.cheveux, 0.68);

  return (
    <svg
      className={`avatar avatar--${pose} ${className ?? ''}`}
      viewBox="0 0 120 145"
      width={taille}
      height={taille * 1.21}
      role="img"
      aria-label="Personnage"
      style={{ transform: miroir ? 'scaleX(-1)' : undefined, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`${id}-fond`} cx="50%" cy="34%" r="74%">
          <stop offset="0%" stopColor={art.fond[1]} />
          <stop offset="100%" stopColor={art.fond[0]} />
        </radialGradient>
        <linearGradient id={`${id}-tenue`} x1="0.1" y1="0" x2="0.65" y2="1">
          <stop offset="0%" stopColor={melange(art.tenue, 1.15)} />
          <stop offset="55%" stopColor={art.tenue} />
          <stop offset="100%" stopColor={ombreTenue} />
        </linearGradient>
        <linearGradient id={`${id}-peau`} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={melange(art.peau, 1.06)} />
          <stop offset="100%" stopColor={ombrePeau} />
        </linearGradient>
        <linearGradient id={`${id}-cheveux`} x1="0.1" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={melange(art.cheveux, 1.12)} />
          <stop offset="100%" stopColor={ombreCheveux} />
        </linearGradient>
        <filter id={`${id}-lueur`} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="2.6" result="f" />
          <feMerge>
            <feMergeNode in="f" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {avecFond && (
        <>
          <circle cx={cx} cy="70" r="59" fill={`url(#${id}-fond)`} />
          <circle
            cx={cx}
            cy="70"
            r="58"
            fill="none"
            stroke={couleurElement}
            strokeOpacity="0.55"
            strokeWidth="1.6"
          />
          {/* Halo derrière le personnage */}
          <ellipse cx={cx} cy={cyTete + 6} rx="42" ry="46" fill={couleurElement} opacity="0.1" />
        </>
      )}

      <ellipse cx={cx} cy={sol + 2} rx={m.epaules * 1.05} ry="4.5" fill="#000" opacity="0.35" />

      <g className="avatar__corps" stroke={contour} strokeWidth="1.6" strokeLinejoin="round">
        {/* Jambes */}
        <path
          d={`M${cx - m.taille * 0.72} ${yHanches} L${cx - m.taille * 0.62} ${sol} h${m.taille * 0.5} L${cx - 1} ${yHanches} Z`}
          fill={ombreTenue}
        />
        <path
          d={`M${cx + m.taille * 0.72} ${yHanches} L${cx + m.taille * 0.62} ${sol} h${-m.taille * 0.5} L${cx + 1} ${yHanches} Z`}
          fill={art.tenue}
        />
        {/* Pieds */}
        <ellipse cx={cx - m.taille * 0.4} cy={sol} rx="6.5" ry="3.4" fill={contour} />
        <ellipse cx={cx + m.taille * 0.4} cy={sol} rx="6.5" ry="3.4" fill={melange(contour, 1.3)} />

        {/* Bras arrière */}
        <path
          className="avatar__bras-arriere"
          d={`M${cx - m.epaules * 0.85} ${yEpaules + 5} q-${m.bras} ${m.torse * 0.45} -${m.bras * 0.5} ${m.torse * 0.85}`}
          stroke={ombreTenue}
          strokeWidth={m.bras}
          strokeLinecap="round"
          fill="none"
        />

        {/* Torse */}
        <Torse
          silhouette={art.silhouette}
          cx={cx}
          yEpaules={yEpaules}
          yHanches={yHanches}
          m={m}
          remplissage={`url(#${id}-tenue)`}
        />
        {/* Détail d'accent */}
        <path
          d={`M${cx - 4.5} ${yEpaules + 2} h9 l-2 ${yHanches - yEpaules - 4} h-5 Z`}
          fill={art.accent}
          stroke="none"
          opacity="0.92"
        />
        <circle
          cx={cx}
          cy={yEpaules + m.torse * 0.38}
          r="4"
          fill={couleurElement}
          stroke={contour}
          strokeWidth="1.2"
        />

        {/* Bras avant */}
        <path
          className="avatar__bras-avant"
          d={`M${cx + m.epaules * 0.85} ${yEpaules + 5} q${m.bras * 1.1} ${m.torse * 0.45} ${m.bras * 0.6} ${m.torse * 0.85}`}
          stroke={art.tenue}
          strokeWidth={m.bras}
          strokeLinecap="round"
          fill="none"
        />
        <circle
          cx={cx + m.epaules * 0.85 + m.bras * 0.6}
          cy={yEpaules + 5 + m.torse * 0.85}
          r={m.bras * 0.62}
          fill={`url(#${id}-peau)`}
        />

        {/* Cou */}
        <rect
          x={cx - 5}
          y={cyTete + m.tete - 4}
          width="10"
          height={m.cou + 7}
          rx="4"
          fill={ombrePeau}
        />

        {/* Tête */}
        <g className="avatar__tete">
          <ellipse
            cx={cx}
            cy={cyTete}
            rx={m.tete * 0.92}
            ry={m.tete}
            fill={`url(#${id}-peau)`}
            stroke={melange(art.peau, 0.55)}
            strokeWidth="1.4"
          />
          {/* Oreilles */}
          <ellipse cx={cx - m.tete * 0.9} cy={cyTete + 2} rx="3.2" ry="4.6" fill={ombrePeau} />
          <ellipse cx={cx + m.tete * 0.9} cy={cyTete + 2} rx="3.2" ry="4.6" fill={ombrePeau} />

          <Cheveux
            silhouette={art.silhouette}
            cx={cx}
            cy={cyTete}
            r={m.tete}
            fill={`url(#${id}-cheveux)`}
            contour={melange(art.cheveux, 0.45)}
          />
          <Visage cx={cx} cy={cyTete} r={m.tete} pose={pose} accent={art.accent} />
          <Accessoire
            type={art.accessoire}
            cx={cx}
            cy={cyTete}
            r={m.tete}
            accent={art.accent}
            element={couleurElement}
            idLueur={`${id}-lueur`}
          />
        </g>
      </g>

      {avecFond && (
        <g className="avatar__embleme">
          <circle cx="102" cy="22" r="13" fill="#0c0818" opacity="0.9" />
          <circle cx="102" cy="22" r="13" fill="none" stroke={couleurElement} strokeWidth="1.6" />
          <text x="102" y="27" textAnchor="middle" fontSize="14" style={{ userSelect: 'none' }}>
            {art.embleme}
          </text>
        </g>
      )}
    </svg>
  );
}

function Torse({
  silhouette,
  cx,
  yEpaules,
  yHanches,
  m,
  remplissage,
}: {
  silhouette: number;
  cx: number;
  yEpaules: number;
  yHanches: number;
  m: Morphologie;
  remplissage: string;
}) {
  if (silhouette === 6) {
    // Robe évasée : le bas s'ouvre largement jusqu'au sol.
    return (
      <path
        d={`M${cx - m.epaules} ${yEpaules + 4}
           q0 -8 ${m.epaules * 0.55} -8 h${m.epaules * 0.9}
           q${m.epaules * 0.55} 0 ${m.epaules * 0.55} 8
           L${cx + m.taille * 1.15} ${yHanches + m.jambes}
           q${-m.taille * 1.15} 5 ${-m.taille * 2.3} 0 Z`}
        fill={remplissage}
      />
    );
  }
  if (silhouette === 4) {
    // Carrure trapézoïdale, très large en haut.
    return (
      <path
        d={`M${cx - m.epaules} ${yEpaules + 2}
           q0 -9 ${m.epaules * 0.5} -9 h${m.epaules}
           q${m.epaules * 0.5} 0 ${m.epaules * 0.5} 9
           L${cx + m.taille} ${yHanches}
           h${-m.taille * 2} Z`}
        fill={remplissage}
      />
    );
  }
  return (
    <path
      d={`M${cx - m.epaules} ${yEpaules + 4}
         q0 -9 ${m.epaules * 0.5} -9 h${m.epaules}
         q${m.epaules * 0.5} 0 ${m.epaules * 0.5} 9
         L${cx + m.taille} ${yHanches}
         q${-m.taille} 5 ${-m.taille * 2} 0 Z`}
      fill={remplissage}
    />
  );
}

function Cheveux({
  silhouette,
  cx,
  cy,
  r,
  fill,
  contour,
}: {
  silhouette: number;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  contour: string;
}) {
  const commun = { fill, stroke: contour, strokeWidth: 1.2 };
  switch (silhouette) {
    case 1: // longs, deux mèches encadrantes
      return (
        <g {...commun}>
          <path
            d={`M${cx - r * 0.95} ${cy - r * 0.05}
               a${r * 0.95} ${r * 0.95} 0 0 1 ${r * 1.9} 0
               q-${r * 0.24} -${r * 0.62} -${r * 0.95} -${r * 0.56}
               q-${r * 0.71} -0.06 -${r * 0.95} ${r * 0.56} Z`}
          />
          <path d={`M${cx - r * 0.93} ${cy - r * 0.2} q-4 ${r * 1.1} 1 ${r * 1.5} l7 -1.5 q-4 -${r * 0.8} -2 -${r * 1.4} Z`} />
          <path d={`M${cx + r * 0.93} ${cy - r * 0.2} q4 ${r * 1.1} -1 ${r * 1.5} l-7 -1.5 q4 -${r * 0.8} 2 -${r * 1.4} Z`} />
        </g>
      );
    case 2: // court, en pétard
      return (
        <path
          {...commun}
          d={`M${cx - r * 0.95} ${cy - r * 0.08}
             q0 -${r * 0.98} ${r * 0.95} -${r * 0.95}
             q${r * 0.95} -0.03 ${r * 0.95} ${r * 0.95}
             l-${r * 0.3} -${r * 0.26} l-${r * 0.2} ${r * 0.3}
             l-${r * 0.3} -${r * 0.36} l-${r * 0.25} ${r * 0.32}
             l-${r * 0.32} -${r * 0.34} l-${r * 0.26} ${r * 0.34} Z`}
        />
      );
    case 3: // longue mèche asymétrique
      return (
        <g {...commun}>
          <path
            d={`M${cx - r * 0.95} ${cy - r * 0.02}
               a${r * 0.95} ${r * 0.9} 0 0 1 ${r * 1.9} 0
               q-${r * 0.55} -${r * 0.5} -${r * 1.2} -${r * 0.2} Z`}
          />
          <path
            d={`M${cx + r * 0.55} ${cy - r * 0.68}
               q${r * 0.62} ${r * 0.95} ${r * 0.12} ${r * 1.55}
               l-${r * 0.32} -0.4 q${r * 0.3} -${r * 0.75} -${r * 0.12} -${r * 1.15} Z`}
          />
        </g>
      );
    case 4: // coupe courte, nuque dégagée
      return (
        <path
          {...commun}
          d={`M${cx - r * 0.9} ${cy - r * 0.28}
             q${r * 0.2} -${r * 0.86} ${r * 0.9} -${r * 0.84}
             q${r * 0.7} -0.02 ${r * 0.9} ${r * 0.84}
             q-${r * 0.9} -${r * 0.32} -${r * 1.8} 0 Z`}
        />
      );
    case 5: // crête
      return (
        <g {...commun}>
          <path d={`M${cx - r * 0.92} ${cy - r * 0.08} a${r * 0.92} ${r * 0.88} 0 0 1 ${r * 1.84} 0 Z`} />
          <path
            d={`M${cx - r * 0.32} ${cy - r * 0.82}
               l${r * 0.16} -${r * 0.6} l${r * 0.18} ${r * 0.44}
               l${r * 0.22} -${r * 0.72} l${r * 0.2} ${r * 0.56}
               l${r * 0.2} -${r * 0.5} l${r * 0.14} ${r * 0.52} Z`}
          />
        </g>
      );
    default: // 6 — longs et lisses
      return (
        <g {...commun}>
          <path
            d={`M${cx - r * 0.98} ${cy + r * 0.12}
               a${r * 0.98} ${r} 0 0 1 ${r * 1.96} 0
               q-${r * 0.18} -${r * 0.66} -${r * 0.98} -${r * 0.6}
               q-${r * 0.8} -0.06 -${r * 0.98} ${r * 0.6} Z`}
          />
          <path d={`M${cx - r * 0.98} ${cy} q-5 ${r * 0.8} -1 ${r * 1.25} l7 -1 q-3 -${r * 0.6} -1 -${r * 1.15} Z`} />
          <path d={`M${cx + r * 0.98} ${cy} q5 ${r * 0.8} 1 ${r * 1.25} l-7 -1 q3 -${r * 0.6} 1 -${r * 1.15} Z`} />
        </g>
      );
  }
}

function Visage({
  cx,
  cy,
  r,
  pose,
  accent,
}: {
  cx: number;
  cy: number;
  r: number;
  pose: Pose;
  accent: string;
}) {
  const yYeux = cy + r * 0.16;
  const dx = r * 0.38;
  const encre = '#17101f';

  if (pose === 'ko') {
    return (
      <g stroke={encre} strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d={`M${cx - dx - 4} ${yYeux - 4} l8 8 M${cx - dx + 4} ${yYeux - 4} l-8 8`} />
        <path d={`M${cx + dx - 4} ${yYeux - 4} l8 8 M${cx + dx + 4} ${yYeux - 4} l-8 8`} />
        <path d={`M${cx - 5} ${cy + r * 0.66} q5 -5 10 0`} />
      </g>
    );
  }

  const enColere = pose === 'attaque' || pose === 'touche';
  const contentement = pose === 'victoire';

  return (
    <g>
      {/* Yeux */}
      {contentement ? (
        <g stroke={encre} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d={`M${cx - dx - 4} ${yYeux + 1} q4 -5 8 0`} />
          <path d={`M${cx + dx - 4} ${yYeux + 1} q4 -5 8 0`} />
        </g>
      ) : (
        <>
          <ellipse cx={cx - dx} cy={yYeux} rx="3.4" ry="4.4" fill={encre} />
          <ellipse cx={cx + dx} cy={yYeux} rx="3.4" ry="4.4" fill={encre} />
          <circle cx={cx - dx + 1.2} cy={yYeux - 1.4} r="1.3" fill="#fff" opacity="0.95" />
          <circle cx={cx + dx + 1.2} cy={yYeux - 1.4} r="1.3" fill="#fff" opacity="0.95" />
        </>
      )}

      {/* Sourcils */}
      <g stroke={encre} strokeWidth="2.2" strokeLinecap="round">
        {enColere ? (
          <>
            <path d={`M${cx - dx - 5.5} ${yYeux - 8.5} l9 3.4`} />
            <path d={`M${cx + dx + 5.5} ${yYeux - 8.5} l-9 3.4`} />
          </>
        ) : (
          <>
            <path d={`M${cx - dx - 5} ${yYeux - 8} l9 -1.2`} />
            <path d={`M${cx + dx + 5} ${yYeux - 8} l-9 -1.2`} />
          </>
        )}
      </g>

      {/* Bouche */}
      <path
        d={
          contentement
            ? `M${cx - 5.5} ${cy + r * 0.52} q5.5 6 11 0`
            : pose === 'touche'
              ? `M${cx - 5} ${cy + r * 0.58} q5 -5 10 0`
              : enColere
                ? `M${cx - 5} ${cy + r * 0.56} q5 -3 10 0`
                : `M${cx - 4} ${cy + r * 0.55} h8`
        }
        stroke={encre}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Joues */}
      <ellipse cx={cx - r * 0.66} cy={cy + r * 0.38} rx="4.2" ry="2.8" fill={accent} opacity="0.3" />
      <ellipse cx={cx + r * 0.66} cy={cy + r * 0.38} rx="4.2" ry="2.8" fill={accent} opacity="0.3" />
    </g>
  );
}

function Accessoire({
  type,
  cx,
  cy,
  r,
  accent,
  element,
  idLueur,
}: {
  type: ArtSpec['accessoire'];
  cx: number;
  cy: number;
  r: number;
  accent: string;
  element: string;
  idLueur: string;
}) {
  switch (type) {
    case 'chapeau':
      return (
        <g stroke="#1a1426" strokeWidth="1.3">
          <ellipse cx={cx} cy={cy - r * 0.62} rx={r * 1.42} ry={r * 0.2} fill="#2a2038" />
          <path
            d={`M${cx - r * 0.78} ${cy - r * 0.62} q0 -${r * 0.82} ${r * 0.78} -${r * 0.82} q${r * 0.78} 0 ${r * 0.78} ${r * 0.82} Z`}
            fill="#352a48"
          />
          <rect x={cx - r * 0.8} y={cy - r * 0.76} width={r * 1.6} height={r * 0.17} fill={accent} stroke="none" />
        </g>
      );
    case 'casque':
      return (
        <g stroke="#3b4453" strokeWidth="1.3">
          <path
            d={`M${cx - r * 0.98} ${cy - r * 0.06} a${r * 0.98} ${r * 0.96} 0 0 1 ${r * 1.96} 0 l0 ${r * 0.14} l-${r * 1.96} 0 Z`}
            fill="#9aa5b4"
          />
          <path d={`M${cx - r * 0.98} ${cy + r * 0.08} h${r * 1.96}`} stroke={accent} strokeWidth="3" />
          <path d={`M${cx} ${cy - r * 1.02} v${r * 0.42}`} stroke={accent} strokeWidth="3.2" />
        </g>
      );
    case 'couronne':
      return (
        <g filter={`url(#${idLueur})`}>
          <path
            d={`M${cx - r * 0.78} ${cy - r * 0.66}
               l${r * 0.26} -${r * 0.52} l${r * 0.26} ${r * 0.3}
               l${r * 0.26} -${r * 0.64} l${r * 0.26} ${r * 0.64}
               l${r * 0.26} -${r * 0.3} l${r * 0.26} ${r * 0.52} Z`}
            fill="#f7d35e"
            stroke="#8a6b12"
            strokeWidth="1.2"
          />
          <circle cx={cx} cy={cy - r * 0.78} r="2.8" fill={element} stroke="none" />
        </g>
      );
    case 'capuche':
      return (
        <path
          d={`M${cx - r * 1.12} ${cy + r * 0.42}
             q-${r * 0.1} -${r * 1.5} ${r * 1.12} -${r * 1.5}
             q${r * 1.22} 0 ${r * 1.12} ${r * 1.5}
             q-${r * 0.36} -${r * 0.56} -${r * 0.6} -${r * 0.34}
             q-${r * 0.5} -${r * 0.48} -${r * 1.04} 0
             q-${r * 0.24} -${r * 0.22} -${r * 0.6} ${r * 0.34} Z`}
          fill="#1e1533"
          stroke={accent}
          strokeWidth="1.4"
          strokeOpacity="0.75"
        />
      );
    case 'lunettes':
      return (
        <g stroke="#f0ecf7" strokeWidth="1.8" fill="#bfe0ff" fillOpacity="0.4">
          <circle cx={cx - r * 0.38} cy={cy + r * 0.16} r={r * 0.3} />
          <circle cx={cx + r * 0.38} cy={cy + r * 0.16} r={r * 0.3} />
          <path d={`M${cx - r * 0.08} ${cy + r * 0.16} h${r * 0.16}`} fill="none" />
        </g>
      );
    case 'cornes':
      return (
        <g fill={accent} stroke="#2a1038" strokeWidth="1.2" filter={`url(#${idLueur})`}>
          <path d={`M${cx - r * 0.74} ${cy - r * 0.62} q-${r * 0.4} -${r * 0.56} -${r * 0.06} -${r * 0.92} q${r * 0.28} ${r * 0.4} ${r * 0.4} ${r * 0.82} Z`} />
          <path d={`M${cx + r * 0.74} ${cy - r * 0.62} q${r * 0.4} -${r * 0.56} ${r * 0.06} -${r * 0.92} q-${r * 0.28} ${r * 0.4} -${r * 0.4} ${r * 0.82} Z`} />
        </g>
      );
    case 'aureole':
      return (
        <g filter={`url(#${idLueur})`}>
          <ellipse
            cx={cx}
            cy={cy - r * 1.34}
            rx={r * 0.66}
            ry={r * 0.18}
            fill="none"
            stroke="#ffeaa8"
            strokeWidth="3"
          />
        </g>
      );
    case 'casque_audio':
      return (
        <g>
          <path
            d={`M${cx - r * 1.02} ${cy + r * 0.06} a${r * 1.02} ${r} 0 0 1 ${r * 2.04} 0`}
            stroke="#2e2740"
            strokeWidth="4.5"
            fill="none"
          />
          <rect x={cx - r * 1.2} y={cy - r * 0.14} width={r * 0.38} height={r * 0.52} rx="4" fill={accent} stroke="#2e2740" strokeWidth="1.2" />
          <rect x={cx + r * 0.82} y={cy - r * 0.14} width={r * 0.38} height={r * 0.52} rx="4" fill={accent} stroke="#2e2740" strokeWidth="1.2" />
        </g>
      );
    default:
      return null;
  }
}
