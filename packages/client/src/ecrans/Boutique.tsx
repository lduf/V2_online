import { useEffect, useState } from 'react';
import {
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  SORTS_PAR_ID,
} from '@arene/engine';
import { api, ErreurApi, type Boutique as BoutiqueData, type OffreBoutique } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { Chargement, Rarete } from '../composants';

export function Boutique() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [data, setData] = useState<BoutiqueData | null>(null);
  const [onglet, setOnglet] = useState<'rotation' | 'permanents'>('rotation');
  const [achat, setAchat] = useState<string | null>(null);

  useEffect(() => {
    api.boutique().then(setData).catch(() => notifier('Boutique indisponible.', 'mal'));
  }, [notifier]);

  const acheter = async (o: OffreBoutique) => {
    const prix = Math.round(o.prix * (1 - o.remise / 100));
    if (profil.compte.credits < prix) return notifier('Pas assez de crédits.', 'mal');
    setAchat(o.kind + o.id);
    try {
      const r = await api.acheter(o.kind, o.id);
      appliquerProfil(r);
      jouer('achat');
      notifier(`Acheté pour ${r.prix} crédits !`, 'bien');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Achat impossible.', 'mal');
    } finally {
      setAchat(null);
    }
  };

  if (!data) return <Chargement texte="Ouverture de la boutique…" />;

  const liste = onglet === 'rotation' ? data.rotation : data.permanents;
  const heuresRestantes = Math.max(0, Math.round((data.expireLe - Date.now()) / 3600000));

  return (
    <div className="boutique">
      <div className="panneau">
        <div className="atelier__entete">
          <h3>Boutique</h3>
          <span className="etiquette">Rotation dans {heuresRestantes} h</span>
        </div>
        <p className="panneau__aide">
          La vitrine du jour est la même pour tout le monde et change toutes les 24 heures. Les
          personnages et sorts achetés arrivent avec des gènes tirés au hasard.
        </p>
        <div className="onglets onglets--compact">
          <button className={onglet === 'rotation' ? 'est-actif' : ''} onClick={() => setOnglet('rotation')}>
            Vitrine du jour ({data.rotation.length})
          </button>
          <button
            className={onglet === 'permanents' ? 'est-actif' : ''}
            onClick={() => setOnglet('permanents')}
          >
            Fonds de rayon ({data.permanents.length})
          </button>
        </div>

        <div className="boutique__grille">
          {liste.map((o) => (
            <OffreCarte
              key={o.kind + o.id}
              offre={o}
              credits={profil.compte.credits}
              occupe={achat === o.kind + o.id}
              onAcheter={() => acheter(o)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OffreCarte({
  offre,
  credits,
  occupe,
  onAcheter,
}: {
  offre: OffreBoutique;
  credits: number;
  occupe: boolean;
  onAcheter: () => void;
}) {
  const prix = Math.round(offre.prix * (1 - offre.remise / 100));
  const abordable = credits >= prix;

  let contenu: React.ReactNode = null;
  let couleur = '#8a7fb8';

  if (offre.kind === 'PERSO') {
    const e = ESPECES_PAR_ID[offre.id];
    if (!e) return null;
    couleur = INFO_ELEMENTS[e.element].couleur;
    contenu = (
      <>
        <Avatar art={e.art} element={e.element} taille={76} pose="portrait" />
        <strong>{e.nom}</strong>
        <small>{e.titre}</small>
        <em>
          ✦ {e.passif.nom} — {e.passif.texte}
        </em>
      </>
    );
  } else if (offre.kind === 'SORT') {
    const s = SORTS_PAR_ID[offre.id];
    if (!s) return null;
    couleur = INFO_ELEMENTS[s.element].couleur;
    contenu = (
      <>
        <span className="offre__emoji">{INFO_ELEMENTS[s.element].emoji}</span>
        <strong>{s.nom}</strong>
        <small>
          {s.puissance > 0 && `⚔ ${s.puissance} · `}
          {s.soin > 0 && `✚ ${s.soin} · `}🎲 d{s.de} · ⚡ {s.cout}
        </small>
        <em>{s.texte}</em>
      </>
    );
  } else {
    const i = ITEMS_PAR_ID[offre.id];
    if (!i) return null;
    contenu = (
      <>
        <span className="offre__emoji">{i.emoji}</span>
        <strong>{i.nom}</strong>
        <small>
          {Object.entries(i.bonus)
            .map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`)
            .join(' · ')}
        </small>
        <em>{i.texte}</em>
      </>
    );
  }

  return (
    <div
      className={`offre rarete--${offre.rarete.toLowerCase()}`}
      style={{ '--el': couleur } as React.CSSProperties}
    >
      {offre.remise > 0 && <span className="offre__remise">−{offre.remise} %</span>}
      <div className="offre__corps">{contenu}</div>
      <div className="offre__bas">
        <Rarete rarete={offre.rarete} />
        <button
          className={`bouton ${abordable ? 'bouton--primaire' : ''}`}
          disabled={!abordable || occupe}
          onClick={onAcheter}
        >
          {offre.remise > 0 && <s>{offre.prix}</s>} 💰 {prix.toLocaleString('fr-FR')}
        </button>
      </div>
    </div>
  );
}
