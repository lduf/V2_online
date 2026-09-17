import type { ReactNode } from 'react';
import {
  ESPECES_PAR_ID,
  gradeDepuisPourcent,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  IV_MAX,
  NATURES_PAR_ID,
  maxTheorique,
  perfectionIvs,
  perfectionIvsSort,
  progression,
  SORTS_PAR_ID,
  TOUTES_STATS,
  calculerStats,
  type PersoPossede,
  type SortPossede,
} from '@arene/engine';
import { Avatar } from './art/Avatar';

export const NOMS_STATS: Record<string, string> = {
  pv: 'PV',
  atq: 'Attaque',
  def: 'Défense',
  mag: 'Magie',
  res: 'Résistance',
  vit: 'Vitesse',
  chance: 'Chance',
};

export const NOMS_STATS_COURT: Record<string, string> = {
  pv: 'PV',
  atq: 'ATQ',
  def: 'DÉF',
  mag: 'MAG',
  res: 'RÉS',
  vit: 'VIT',
  chance: 'CHA',
};

export function Rarete({ rarete }: { rarete: string }) {
  return <span className={`rarete-puce rarete--${rarete.toLowerCase()}`}>{rarete}</span>;
}

export function Grade({ pourcent }: { pourcent: number }) {
  const g = gradeDepuisPourcent(pourcent);
  return (
    <span className={`grade grade--${g}`} title={`Gènes : ${pourcent} % de perfection`}>
      {g}
    </span>
  );
}

export function CartePerso({
  perso,
  selectionne,
  surbrillance,
  onClick,
  compact,
  badge,
}: {
  perso: PersoPossede;
  selectionne?: boolean;
  surbrillance?: boolean;
  onClick?: () => void;
  compact?: boolean;
  badge?: ReactNode;
}) {
  const espece = ESPECES_PAR_ID[perso.especeId];
  if (!espece) return null;
  const el = INFO_ELEMENTS[espece.element];
  const prog = progression(perso.xp);
  const perfection = perfectionIvs(perso.ivs);

  return (
    <button
      type="button"
      className={`carte-perso rarete--${espece.rarete.toLowerCase()} ${
        selectionne ? 'est-selectionne' : ''
      } ${surbrillance ? 'est-surbrillance' : ''} ${compact ? 'est-compact' : ''}`}
      style={{ '--el': el.couleur, '--el-clair': el.couleurClaire } as React.CSSProperties}
      onClick={onClick}
    >
      {badge && <span className="carte-perso__badge">{badge}</span>}
      <div className="carte-perso__portrait">
        <Avatar art={espece.art} element={espece.element} taille={compact ? 56 : 84} pose="portrait" />
      </div>
      <div className="carte-perso__corps">
        <div className="carte-perso__titre">
          <strong>{perso.surnom || espece.nom}</strong>
          <Grade pourcent={perfection} />
        </div>
        <div className="carte-perso__meta">
          <span style={{ color: el.couleur }}>
            {el.emoji} {espece.role.toLowerCase()}
          </span>
          <span>N.{perso.niveau}</span>
        </div>
        {!compact && (
          <>
            <div className="carte-perso__xp" title={`XP ${perso.xp}`}>
              <i style={{ width: `${Math.round(prog.ratio * 100)}%` }} />
            </div>
            <div className="carte-perso__bas">
              <Rarete rarete={espece.rarete} />
              {perso.itemId && (
                <span className="carte-perso__item" title={ITEMS_PAR_ID[perso.itemId]?.nom}>
                  {ITEMS_PAR_ID[perso.itemId]?.emoji}
                </span>
              )}
              <span className="carte-perso__sorts">
                {perso.sorts.filter(Boolean).length}/4 sorts
              </span>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export function LigneStat({
  cle,
  valeur,
  iv,
  max,
  nature,
}: {
  cle: string;
  valeur: number;
  iv: number;
  max: number;
  nature?: 'plus' | 'moins' | null;
}) {
  return (
    <div className="ligne-stat">
      <span className={`ligne-stat__nom ${nature === 'plus' ? 'est-boost' : nature === 'moins' ? 'est-malus' : ''}`}>
        {NOMS_STATS[cle]}
        {nature === 'plus' && ' ▲'}
        {nature === 'moins' && ' ▼'}
      </span>
      <span className="ligne-stat__valeur">{valeur}</span>
      <span className="ligne-stat__barre">
        <i style={{ width: `${Math.min(100, (valeur / Math.max(1, max)) * 100)}%` }} />
      </span>
      <span
        className={`ligne-stat__iv ${iv === IV_MAX ? 'est-parfait' : iv >= 25 ? 'est-bon' : iv <= 6 ? 'est-faible' : ''}`}
        title={`Gène : ${iv}/${IV_MAX}`}
      >
        {iv}
      </span>
    </div>
  );
}

export function FicheStats({ perso }: { perso: PersoPossede }) {
  const stats = calculerStats(perso);
  const nature = NATURES_PAR_ID[perso.natureId];
  return (
    <div className="fiche-stats">
      {TOUTES_STATS.map((k) => (
        <LigneStat
          key={k}
          cle={k}
          valeur={stats[k]}
          iv={perso.ivs[k] ?? 0}
          max={maxTheorique(k, perso.niveau)}
          nature={nature?.plus === k ? 'plus' : nature?.moins === k ? 'moins' : null}
        />
      ))}
    </div>
  );
}

export function CarteSortPossede({
  sort,
  selectionne,
  compatible = true,
  onClick,
  compact,
}: {
  sort: SortPossede;
  selectionne?: boolean;
  compatible?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const def = SORTS_PAR_ID[sort.defId];
  if (!def) return null;
  const el = INFO_ELEMENTS[def.element];
  const perfection = perfectionIvsSort(sort.ivs);

  return (
    <button
      type="button"
      className={`carte-sort-liste rarete--${def.rarete.toLowerCase()} ${
        selectionne ? 'est-selectionne' : ''
      } ${compatible ? '' : 'est-incompatible'} ${compact ? 'est-compact' : ''}`}
      style={{ '--el': el.couleur, '--el-clair': el.couleurClaire } as React.CSSProperties}
      onClick={onClick}
      disabled={!compatible}
      title={compatible ? def.texte : 'Ce personnage ne peut pas apprendre ce sort.'}
    >
      <span className="carte-sort-liste__el">{el.emoji}</span>
      <span className="carte-sort-liste__nom">
        {def.nom}
        <small>{def.categorie.toLowerCase()}</small>
      </span>
      <span className="carte-sort-liste__chiffres">
        {def.puissance > 0 && <b>⚔{Math.round(def.puissance * (0.85 + (0.3 * sort.ivs.puissance) / IV_MAX))}</b>}
        {def.soin > 0 && <b className="est-soin">✚{def.soin}</b>}
        <b>🎲{def.de}</b>
        <b>⚡{Math.max(0, def.cout - Math.round((4 * sort.ivs.cout) / IV_MAX))}</b>
      </span>
      <Grade pourcent={perfection} />
    </button>
  );
}

export function Ressources({
  credits,
  eclats,
  essence,
}: {
  credits: number;
  eclats: number;
  essence: number;
}) {
  return (
    <div className="ressources">
      <span className="ressource ressource--credits" title="Crédits — combats et boutique">
        💰 {credits.toLocaleString('fr-FR')}
      </span>
      <span className="ressource ressource--eclats" title="Éclats — invocations">
        ✨ {eclats.toLocaleString('fr-FR')}
      </span>
      <span className="ressource ressource--essence" title="Essence — dissolution des doublons">
        💠 {essence.toLocaleString('fr-FR')}
      </span>
    </div>
  );
}

export function Vide({ texte, emoji = '🫥' }: { texte: string; emoji?: string }) {
  return (
    <div className="vide">
      <span>{emoji}</span>
      <p>{texte}</p>
    </div>
  );
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="chargement">
      <div className="chargeur" />
      <p>{texte}</p>
    </div>
  );
}
