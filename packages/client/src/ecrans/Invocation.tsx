import { useState } from 'react';
import {
  BANNIERES,
  ESPECES,
  INFO_ELEMENTS,
  type TypeBanniere,
} from '@arene/engine';
import { api, ErreurApi } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { Rarete } from '../composants';
import { OuvertureBooster, type BoosterClient } from './OuvertureBooster';

export function Invocation() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [banniere, setBanniere] = useState<TypeBanniere>('STANDARD');
  const [boosters, setBoosters] = useState<BoosterClient[] | null>(null);
  const [enCours, setEnCours] = useState(false);

  const b = BANNIERES[banniere];
  const pitie = banniere === 'STANDARD' ? profil.compte.pitie_standard : profil.compte.pitie_legendaire;

  const abordable = (lot: boolean): boolean => {
    const cout = lot ? b.coutLot : b.coutBooster;
    return (
      (cout.credits ?? 0) <= profil.compte.credits && (cout.eclats ?? 0) <= profil.compte.eclats
    );
  };

  const prix = (lot: boolean): string => {
    const cout = lot ? b.coutLot : b.coutBooster;
    return cout.credits ? `💰 ${cout.credits.toLocaleString('fr-FR')}` : `✨ ${cout.eclats}`;
  };

  const ouvrir = async (lot: boolean) => {
    if (!abordable(lot)) return notifier('Pas assez de ressources pour ce paquet.', 'mal');
    setEnCours(true);
    jouer('clic');
    try {
      const r = await api.invoquer(banniere, lot);
      appliquerProfil(r);
      setBoosters(r.boosters as BoosterClient[]);
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Invocation impossible.', 'mal');
    } finally {
      setEnCours(false);
    }
  };

  const ordre = ['LEGENDAIRE', 'EPIQUE', 'RARE', 'COMMUN'];
  const vitrine = ESPECES.filter((e) => (b.poids[e.rarete] ?? 0) > 0).sort(
    (x, y) => ordre.indexOf(x.rarete) - ordre.indexOf(y.rarete),
  );
  const possedes = new Set(profil.persos.map((p) => p.especeId));

  return (
    <div className="invocation">
      <div className="panneau">
        <h3>Boosters</h3>
        <div className="onglets onglets--compact">
          {(Object.keys(BANNIERES) as TypeBanniere[]).map((k) => (
            <button
              key={k}
              className={banniere === k ? 'est-actif' : ''}
              onClick={() => setBanniere(k)}
            >
              {BANNIERES[k].nom}
            </button>
          ))}
        </div>

        <div className={`banniere banniere--${banniere.toLowerCase()}`}>
          <div className="banniere__texte">
            <h2>{b.nom}</h2>
            <p>{b.texte}</p>
            <p className="banniere__regle">
              <strong>{b.cartes} cartes par paquet</strong>, dont au moins une rare. La meilleure
              est toujours révélée en dernier.
            </p>
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
              Garantie {b.pitieRarete.toLowerCase()} dans{' '}
              <strong>{Math.max(1, b.pitiePas - pitie)}</strong> carte
              {b.pitiePas - pitie > 1 ? 's' : ''} · gènes minimum {b.plancherIv}
              {b.bonusVariante > 1 && ` · chances de variante ×${b.bonusVariante}`}
            </p>
          </div>
          <div className="banniere__boutons">
            <button
              className="bouton bouton--primaire"
              onClick={() => ouvrir(false)}
              disabled={enCours || !abordable(false)}
            >
              Un paquet — {prix(false)}
              {!abordable(false) && <small>pas assez</small>}
            </button>
            <button
              className="bouton bouton--primaire"
              onClick={() => ouvrir(true)}
              disabled={enCours || !abordable(true)}
            >
              {b.boostersParLot} paquets — {prix(true)}
              <small>{abordable(true) ? 'tarif dégressif' : 'pas assez'}</small>
            </button>
          </div>
        </div>

        <h3 className="invocation__titre-vitrine">
          Personnages accessibles sur cette bannière ({vitrine.length})
        </h3>
        <div className="vitrine">
          {vitrine.map((e) => (
            <div
              key={e.id}
              className={`vitrine__perso rarete--${e.rarete.toLowerCase()} ${
                possedes.has(e.id) ? 'est-possede' : ''
              }`}
              style={{ '--el': INFO_ELEMENTS[e.element].couleur } as React.CSSProperties}
              title={`${e.nom} — ${e.titre} · ${e.passif.nom}`}
            >
              <Avatar art={e.art} element={e.element} taille={64} pose="portrait" />
              <strong>{e.nom}</strong>
              <Rarete rarete={e.rarete} />
              {possedes.has(e.id) && <span className="vitrine__coche">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {boosters && <OuvertureBooster boosters={boosters} onFini={() => setBoosters(null)} />}
    </div>
  );
}
