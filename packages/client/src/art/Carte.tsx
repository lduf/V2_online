import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  artEffectif,
  aSceauParfait,
  aSceauParfaitSort,
  calculerStats,
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  IV_MAX,
  perfectionIvs,
  perfectionIvsSort,
  gradeDepuisPourcent,
  SORTS_PAR_ID,
  type ItemDef,
  type PersoPossede,
  type Rarete,
  type SortPossede,
} from '@arene/engine';
import { Illustration } from './Illustration';
import { Sigle } from './Sigle';

export type DonneesCarte =
  | { kind: 'PERSO'; especeId: string; perso?: PersoPossede; chromatique?: boolean }
  | { kind: 'SORT'; defId: string; sort?: SortPossede; prisme?: boolean }
  | { kind: 'ITEM'; itemId: string };

export type TailleCarte = 'mini' | 'normal' | 'grand';

interface Props {
  donnees: DonneesCarte;
  taille?: TailleCarte;
  /** Active l'inclinaison 3D et le foil qui suit le pointeur. */
  vivante?: boolean;
  /**
   * Traitement « full art » : l'illustration occupe la carte bord à bord et le
   * texte passe en surimpression. Réservé au prestige — une commune en full
   * art dilue le signal que le traitement est censé porter.
   */
  pleine?: boolean;
  selectionnee?: boolean;
  estompee?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const NIVEAU_FOIL: Record<Rarete, number> = {
  COMMUN: 0,
  RARE: 0.5,
  EPIQUE: 0.8,
  LEGENDAIRE: 1,
};

export function Carte({
  donnees,
  taille = 'normal',
  vivante = true,
  pleine = false,
  selectionnee,
  estompee,
  badge,
  onClick,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [survol, setSurvol] = useState(false);

  const bouger = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!vivante || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      ref.current.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      ref.current.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      ref.current.style.setProperty('--ry', `${((x - 0.5) * 22).toFixed(2)}deg`);
      ref.current.style.setProperty('--rx', `${((0.5 - y) * 18).toFixed(2)}deg`);
    },
    [vivante],
  );

  const quitter = useCallback(() => {
    setSurvol(false);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '50%');
  }, []);

  const contenu = construire(donnees, pleine);
  const el = contenu.element ? INFO_ELEMENTS[contenu.element] : null;

  return (
    <div
      ref={ref}
      className={[
        'carte',
        `carte--${taille}`,
        `rarete--${contenu.rarete.toLowerCase()}`,
        pleine ? 'carte--pleine' : '',
        contenu.variante ? 'carte--variante' : '',
        contenu.sceau ? 'carte--sceau' : '',
        selectionnee ? 'est-selectionnee' : '',
        estompee ? 'est-estompee' : '',
        survol ? 'est-survolee' : '',
        onClick ? 'est-cliquable' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--el': el?.couleur ?? '#8a7fb8',
          '--el-clair': el?.couleurClaire ?? '#c9c0e8',
          '--foil': String(NIVEAU_FOIL[contenu.rarete]),
        } as React.CSSProperties
      }
      onPointerMove={bouger}
      onPointerEnter={() => setSurvol(true)}
      onPointerLeave={quitter}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="carte__plan">
        <div className="carte__cadre">
          {badge && <span className="carte__badge">{badge}</span>}

          <header className="carte__entete">
            <span className="carte__nom">
              {contenu.variante === 'chromatique' && <i className="carte__etoile">✦</i>}
              {contenu.variante === 'prisme' && <i className="carte__etoile">◆</i>}
              {contenu.nom}
            </span>
            {contenu.coin && <span className="carte__coin">{contenu.coin}</span>}
          </header>

          <div className="carte__art">
            <div className="carte__lueur" />
            {contenu.art}
            {contenu.variante && <div className="carte__paillettes" aria-hidden>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} style={{ '--i': i } as React.CSSProperties} />
              ))}
            </div>}
          </div>

          <div className="carte__ligne-type">
            {el && <span className="carte__el">{el.emoji}</span>}
            <span>{contenu.type}</span>
            <span className={`carte__rarete rarete--${contenu.rarete.toLowerCase()}`}>
              {contenu.rarete[0]}
            </span>
          </div>

          {contenu.texte && <p className="carte__texte">{contenu.texte}</p>}

          <footer className="carte__pied">
            {contenu.stats.map((s) => (
              <span key={s.cle} title={s.titre}>
                {s.cle} <b>{s.valeur}</b>
              </span>
            ))}
            {contenu.grade && (
              <span className={`grade grade--${contenu.grade}`} title="Qualité des gènes">
                {contenu.grade}
              </span>
            )}
          </footer>

          {contenu.sceau && <span className="carte__sceau" title="Gènes parfaits">Ω</span>}
        </div>

        <div className="carte__foil" aria-hidden />
        {contenu.variante && <div className="carte__arcenciel" aria-hidden />}
        <div className="carte__brillance" aria-hidden />
      </div>
    </div>
  );
}

// ───────────────────────── Construction du contenu ─────────────────────────

interface ContenuCarte {
  nom: string;
  rarete: Rarete;
  element?: keyof typeof INFO_ELEMENTS;
  type: string;
  texte?: string;
  coin?: string;
  art: ReactNode;
  stats: { cle: string; valeur: string | number; titre: string }[];
  grade?: string;
  variante?: 'chromatique' | 'prisme';
  sceau?: boolean;
}

function construire(d: DonneesCarte, pleine = false): ContenuCarte {
  if (d.kind === 'PERSO') {
    const espece = ESPECES_PAR_ID[d.especeId];
    const chromatique = d.chromatique ?? d.perso?.chromatique ?? false;
    const art = artEffectif(espece.art, espece.id, chromatique);
    const stats = d.perso ? calculerStats(d.perso) : null;
    const perfection = d.perso ? perfectionIvs(d.perso.ivs) : null;

    return {
      nom: d.perso?.surnom || espece.nom,
      rarete: espece.rarete,
      type: `${espece.role.charAt(0)}${espece.role.slice(1).toLowerCase()} · ${espece.titre}`,
      texte: `✦ ${espece.passif.nom} — ${espece.passif.texte}`,
      coin: d.perso ? `N.${d.perso.niveau}` : undefined,
      art: (
        <Illustration
          especeId={espece.id}
          art={art}
          // En full art l'image couvre toute la carte : la plus grande fait
          // 268 px de large pour 375 de haut, donc on annonce la hauteur.
          taille={pleine ? 375 : 112}
          chromatique={chromatique}
        />
      ),
      stats: stats
        ? [
            { cle: 'PV', valeur: stats.pv, titre: 'Points de vie' },
            { cle: 'ATQ', valeur: stats.atq, titre: 'Attaque' },
            { cle: 'MAG', valeur: stats.mag, titre: 'Magie' },
            { cle: 'VIT', valeur: stats.vit, titre: 'Vitesse' },
          ]
        : [
            { cle: 'PV', valeur: espece.base.pv, titre: 'Base points de vie' },
            { cle: 'ATQ', valeur: espece.base.atq, titre: 'Base attaque' },
            { cle: 'MAG', valeur: espece.base.mag, titre: 'Base magie' },
            { cle: 'VIT', valeur: espece.base.vit, titre: 'Base vitesse' },
          ],
      grade: perfection !== null ? gradeDepuisPourcent(perfection) : undefined,
      variante: chromatique ? 'chromatique' : undefined,
      sceau: d.perso ? aSceauParfait(d.perso.ivs) : false,
    };
  }

  if (d.kind === 'SORT') {
    const def = SORTS_PAR_ID[d.defId];
    const ivs = d.sort?.ivs;
    const prisme = d.prisme ?? d.sort?.prisme ?? false;
    const puissance = ivs
      ? Math.round(def.puissance * (0.85 + (0.3 * ivs.puissance) / IV_MAX))
      : def.puissance;
    const cout = ivs ? Math.max(0, def.cout - Math.round((4 * ivs.cout) / IV_MAX)) : def.cout;

    const stats: ContenuCarte['stats'] = [];
    if (puissance > 0) stats.push({ cle: '⚔', valeur: puissance, titre: 'Puissance' });
    if (def.soin !== 0) stats.push({ cle: '✚', valeur: def.soin, titre: 'Soin' });
    stats.push({ cle: '🎲', valeur: `d${def.de}`, titre: 'Faces du dé' });
    if (def.recharge > 0) stats.push({ cle: '⏳', valeur: def.recharge, titre: 'Recharge' });

    return {
      nom: def.nom,
      rarete: def.rarete,
      element: def.element,
      type: `${def.categorie.charAt(0)}${def.categorie.slice(1).toLowerCase()}`,
      texte: def.texte,
      coin: `⚡${cout}`,
      art: <Sigle def={def} taille={112} />,
      stats,
      grade: ivs ? gradeDepuisPourcent(perfectionIvsSort(ivs)) : undefined,
      variante: prisme ? 'prisme' : undefined,
      sceau: ivs ? aSceauParfaitSort(ivs) : false,
    };
  }

  const item: ItemDef = ITEMS_PAR_ID[d.itemId];
  return {
    nom: item.nom,
    rarete: item.rarete,
    type: 'Objet tenu',
    texte: item.texte,
    art: (
      <div className="carte__objet">
        <span>{item.emoji}</span>
      </div>
    ),
    stats: Object.entries(item.bonus).map(([k, v]) => ({
      cle: k.toUpperCase(),
      valeur: `${v > 0 ? '+' : ''}${v}`,
      titre: k,
    })),
  };
}
