import { useState } from 'react';
import {
  BANNIERES,
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  NATURES_PAR_ID,
  perfectionIvs,
  perfectionIvsSort,
  SORTS_PAR_ID,
  type TypeBanniere,
} from '@arene/engine';
import { api, ErreurApi } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { Grade, Rarete } from '../composants';

type Tirage = {
  kind: 'PERSO' | 'SORT' | 'ITEM';
  rarete: string;
  especeId?: string;
  defId?: string;
  itemId?: string;
  natureId?: string;
  ivs?: Record<string, number>;
};

export function Invocation() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [banniere, setBanniere] = useState<TypeBanniere>('STANDARD');
  const [resultats, setResultats] = useState<Tirage[] | null>(null);
  const [anime, setAnime] = useState(false);

  const b = BANNIERES[banniere];
  const pitie = banniere === 'STANDARD' ? profil.compte.pitie_standard : profil.compte.pitie_legendaire;

  const invoquer = async (nombre: 1 | 10) => {
    const cout = nombre === 10 ? b.coutDix : b.coutUnite;
    if ((cout.credits ?? 0) > profil.compte.credits) return notifier('Pas assez de crédits.', 'mal');
    if ((cout.eclats ?? 0) > profil.compte.eclats) return notifier('Pas assez d’éclats.', 'mal');

    setAnime(true);
    setResultats(null);
    jouer('invocation');
    try {
      const r = await api.invoquer(banniere, nombre);
      const tirages = r.tirages as Tirage[];
      setTimeout(() => {
        setResultats(tirages);
        setAnime(false);
        appliquerProfil(r);
        if (tirages.some((t) => t.rarete === 'LEGENDAIRE')) jouer('legendaire');
        else if (tirages.some((t) => t.rarete === 'EPIQUE')) jouer('victoire');
        else jouer('achat');
      }, 900);
    } catch (e) {
      setAnime(false);
      notifier(e instanceof ErreurApi ? e.message : 'Invocation impossible.', 'mal');
    }
  };

  return (
    <div className="invocation">
      <div className="panneau">
        <h3>Invocations</h3>
        <div className="onglets onglets--compact">
          {(Object.keys(BANNIERES) as TypeBanniere[]).map((k) => (
            <button
              key={k}
              className={banniere === k ? 'est-actif' : ''}
              onClick={() => {
                setBanniere(k);
                setResultats(null);
              }}
            >
              {BANNIERES[k].nom}
            </button>
          ))}
        </div>

        <div className={`banniere banniere--${banniere.toLowerCase()}`}>
          <div className="banniere__texte">
            <h2>{b.nom}</h2>
            <p>{b.texte}</p>
            <ul className="banniere__taux">
              {(Object.entries(b.poids) as [string, number][])
                .filter(([, v]) => v > 0)
                .map(([r, v]) => (
                  <li key={r}>
                    <Rarete rarete={r} /> {v} %
                  </li>
                ))}
            </ul>
            <p className="banniere__pitie">
              Garantie {b.pitieRarete.toLowerCase()} dans <strong>{Math.max(1, b.pitiePas - pitie)}</strong>{' '}
              tirage{b.pitiePas - pitie > 1 ? 's' : ''} · gènes minimum {b.plancherIv}
            </p>
          </div>
          <div className="banniere__boutons">
            <button className="bouton bouton--primaire" onClick={() => invoquer(1)} disabled={anime}>
              ×1 — {b.coutUnite.credits ? `💰 ${b.coutUnite.credits}` : `✨ ${b.coutUnite.eclats}`}
            </button>
            <button className="bouton bouton--primaire" onClick={() => invoquer(10)} disabled={anime}>
              ×10 — {b.coutDix.credits ? `💰 ${b.coutDix.credits}` : `✨ ${b.coutDix.eclats}`}
              <small>1 rare garanti</small>
            </button>
          </div>
        </div>

        {anime && (
          <div className="invocation__rituel">
            <div className="rituel__cercle" />
            <p>Le rituel s’accomplit…</p>
          </div>
        )}

        {resultats && (
          <div className="invocation__resultats">
            {resultats.map((t, i) => (
              <CarteTirage key={i} tirage={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CarteTirage({ tirage, index }: { tirage: Tirage; index: number }) {
  const style = { '--i': index } as React.CSSProperties;

  if (tirage.kind === 'PERSO' && tirage.especeId) {
    const e = ESPECES_PAR_ID[tirage.especeId];
    if (!e) return null;
    const perfection = perfectionIvs(tirage.ivs as never);
    return (
      <div className={`tirage rarete--${tirage.rarete.toLowerCase()}`} style={style}>
        <Avatar art={e.art} element={e.element} taille={82} pose="victoire" />
        <strong>{e.nom}</strong>
        <small>{e.titre}</small>
        <div className="tirage__bas">
          <Rarete rarete={tirage.rarete} />
          <Grade pourcent={perfection} />
        </div>
        <em>{NATURES_PAR_ID[tirage.natureId ?? '']?.nom}</em>
      </div>
    );
  }

  if (tirage.kind === 'SORT' && tirage.defId) {
    const s = SORTS_PAR_ID[tirage.defId];
    if (!s) return null;
    return (
      <div className={`tirage rarete--${tirage.rarete.toLowerCase()}`} style={style}>
        <span className="tirage__emoji">{INFO_ELEMENTS[s.element].emoji}</span>
        <strong>{s.nom}</strong>
        <small>
          {s.puissance > 0 && `⚔ ${s.puissance} · `}🎲 d{s.de}
        </small>
        <div className="tirage__bas">
          <Rarete rarete={tirage.rarete} />
          <Grade pourcent={perfectionIvsSort(tirage.ivs as never)} />
        </div>
      </div>
    );
  }

  const i = ITEMS_PAR_ID[tirage.itemId ?? ''];
  if (!i) return null;
  return (
    <div className={`tirage rarete--${tirage.rarete.toLowerCase()}`} style={style}>
      <span className="tirage__emoji">{i.emoji}</span>
      <strong>{i.nom}</strong>
      <small>{i.texte}</small>
      <div className="tirage__bas">
        <Rarete rarete={tirage.rarete} />
      </div>
    </div>
  );
}
