import { useEffect, useState } from 'react';
import type { Element, StatutActif, VfxSpec } from '@arene/engine';
import { INFO_ELEMENTS, INFO_STATUTS } from '@arene/engine';

// ───────────────────────────── Effets de sort ─────────────────────────────

export interface VfxActif {
  cle: number;
  spec: VfxSpec;
  element: Element;
  /** 0 = le sort part du joueur, 1 = de l'adversaire. */
  origine: 0 | 1;
  versSoi: boolean;
}

export function CoucheVfx({ vfx }: { vfx: VfxActif | null }) {
  if (!vfx) return null;
  const c = INFO_ELEMENTS[vfx.element];
  const sens = vfx.origine === 0 ? 1 : -1;
  const style = {
    '--vfx-couleur': c.couleur,
    '--vfx-claire': c.couleurClaire,
    '--vfx-sens': String(sens),
    '--vfx-intensite': String(vfx.spec.intensite ?? 1),
  } as React.CSSProperties;

  return (
    <div
      key={vfx.cle}
      className={`vfx vfx--${vfx.spec.forme} ${vfx.versSoi ? 'vfx--soi' : ''} ${
        vfx.origine === 1 ? 'vfx--inverse' : ''
      }`}
      style={style}
      aria-hidden
    >
      {vfx.spec.forme === 'projectile' && <span className="vfx__boule" />}
      {vfx.spec.forme === 'rayon' && <span className="vfx__rayon" />}
      {vfx.spec.forme === 'lame' && (
        <>
          <span className="vfx__lame" />
          <span className="vfx__lame vfx__lame--2" />
        </>
      )}
      {vfx.spec.forme === 'impact' && <span className="vfx__impact" />}
      {vfx.spec.forme === 'explosion' && (
        <>
          <span className="vfx__explosion" />
          <span className="vfx__onde" />
        </>
      )}
      {vfx.spec.forme === 'aura' && <span className="vfx__aura" />}
      {vfx.spec.forme === 'lien' && <span className="vfx__lien" />}
      {vfx.spec.forme === 'balayage' && <span className="vfx__balayage" />}
      {vfx.spec.forme === 'pluie' && (
        <span className="vfx__pluie">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </span>
      )}
      {(vfx.spec.forme === 'explosion' || vfx.spec.forme === 'impact') && (
        <span className="vfx__particules">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ '--a': `${i * 30}deg` } as React.CSSProperties} />
          ))}
        </span>
      )}
    </div>
  );
}

// ───────────────────────────── Nombres flottants ─────────────────────────────

export interface Flottant {
  cle: number;
  texte: string;
  ton: 'degat' | 'soin' | 'critique' | 'super' | 'faible' | 'bouclier' | 'energie' | 'info';
  decalage: number;
}

export function NombresFlottants({ liste }: { liste: Flottant[] }) {
  return (
    <div className="flottants" aria-hidden>
      {liste.map((f) => (
        <span
          key={f.cle}
          className={`flottant flottant--${f.ton}`}
          style={{ '--dx': `${f.decalage}px` } as React.CSSProperties}
        >
          {f.texte}
        </span>
      ))}
    </div>
  );
}

// ───────────────────────────── Le dé ─────────────────────────────

export function De({
  faces,
  resultat,
  parfait,
  cle,
}: {
  faces: number;
  resultat: number;
  parfait: boolean;
  cle: number;
}) {
  const [affiche, setAffiche] = useState(resultat);
  const [roule, setRoule] = useState(true);

  useEffect(() => {
    setRoule(true);
    let n = 0;
    const timer = setInterval(() => {
      n++;
      setAffiche(1 + Math.floor(Math.random() * faces));
      if (n > 7) {
        clearInterval(timer);
        setAffiche(resultat);
        setRoule(false);
      }
    }, 55);
    return () => clearInterval(timer);
  }, [cle, faces, resultat]);

  return (
    <div className={`de ${roule ? 'de--roule' : ''} ${parfait && !roule ? 'de--parfait' : ''}`}>
      <div className="de__cube">
        <span className="de__valeur">{affiche}</span>
      </div>
      <span className="de__faces">d{faces}</span>
      {parfait && !roule && <span className="de__mention">DÉ PARFAIT</span>}
    </div>
  );
}

// ───────────────────────────── Jauges ─────────────────────────────

export function BarreVie({
  pv,
  pvMax,
  bouclier = 0,
  compact = false,
}: {
  pv: number;
  pvMax: number;
  bouclier?: number;
  compact?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, pv / Math.max(1, pvMax)));
  const ratioBouclier = Math.max(0, Math.min(1 - ratio, bouclier / Math.max(1, pvMax)));
  const niveau = ratio > 0.5 ? 'haut' : ratio > 0.22 ? 'moyen' : 'bas';
  return (
    <div className={`jauge jauge--vie jauge--${niveau} ${compact ? 'jauge--compact' : ''}`}>
      <div className="jauge__fond">
        <div className="jauge__remplissage" style={{ width: `${ratio * 100}%` }} />
        {ratioBouclier > 0 && (
          <div
            className="jauge__bouclier"
            style={{ left: `${ratio * 100}%`, width: `${ratioBouclier * 100}%` }}
          />
        )}
      </div>
      {!compact && (
        <span className="jauge__texte">
          {Math.max(0, pv)}
          <i>/{pvMax}</i>
          {bouclier > 0 && <b> 🛡{bouclier}</b>}
        </span>
      )}
    </div>
  );
}

export function BarreEnergie({ energie, max }: { energie: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, energie / Math.max(1, max)));
  return (
    <div className="jauge jauge--energie">
      <div className="jauge__fond">
        <div className="jauge__remplissage" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="jauge__texte">⚡ {Math.round(energie)}</span>
    </div>
  );
}

// ───────────────────────────── Statuts ─────────────────────────────

export function PucesStatut({ statuts }: { statuts: StatutActif[] }) {
  if (statuts.length === 0) return null;
  return (
    <div className="statuts">
      {statuts.map((s) => {
        const info = INFO_STATUTS[s.id];
        return (
          <span
            key={s.id}
            className={`puce-statut ${info.bon ? 'puce-statut--bon' : 'puce-statut--mauvais'}`}
            style={{ '--couleur': info.couleur } as React.CSSProperties}
            title={`${info.nom} — ${info.texte} (${s.duree} tour${s.duree > 1 ? 's' : ''})`}
          >
            {info.emoji}
            <i>{s.duree}</i>
          </span>
        );
      })}
    </div>
  );
}

export function PucesPalier({
  paliers,
}: {
  paliers: Record<string, number>;
}) {
  const actifs = Object.entries(paliers).filter(([, v]) => v !== 0);
  if (actifs.length === 0) return null;
  const NOMS: Record<string, string> = {
    atq: 'ATQ',
    def: 'DÉF',
    mag: 'MAG',
    res: 'RÉS',
    vit: 'VIT',
    chance: 'CHA',
  };
  return (
    <div className="paliers">
      {actifs.map(([k, v]) => (
        <span key={k} className={`puce-palier ${v > 0 ? 'est-positif' : 'est-negatif'}`}>
          {NOMS[k] ?? k} {v > 0 ? '+' : ''}
          {v}
        </span>
      ))}
    </div>
  );
}
