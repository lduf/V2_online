import { useEffect, useState } from 'react';
import {
  coutFabrication,
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  PLANCHER_IV_FABRICATION,
  SORTS,
  SORTS_PAR_ID,
} from '@arene/engine';
import { api, ErreurApi, type Boutique as BoutiqueData, type OffreBoutique } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { Chargement, Rarete, Vide } from '../composants';

export function Boutique() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [data, setData] = useState<BoutiqueData | null>(null);
  const [onglet, setOnglet] = useState<'rotation' | 'permanents' | 'forge'>('rotation');
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
          <button className={onglet === 'forge' ? 'est-actif' : ''} onClick={() => setOnglet('forge')}>
            Forge 💠
          </button>
        </div>

        {onglet === 'forge' ? (
          <Forge />
        ) : (
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
        )}
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

/**
 * La Forge est la contrepartie déterministe de l'invocation : plus cher qu'un
 * booster à l'unité, mais on choisit exactement ce qui sort. C'est ce qui rend
 * la dissolution des doublons intéressante — l'essence a une destination.
 */
function Forge() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [element, setElement] = useState<string>('TOUS');

  const fabriquer = async (defId: string) => {
    setOccupe(defId);
    try {
      const r = await api.fabriquer(defId);
      appliquerProfil(r);
      jouer('invocation');
      notifier(`${SORTS_PAR_ID[defId].nom} forgé !`, 'bien');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Fabrication impossible.', 'mal');
    } finally {
      setOccupe(null);
    }
  };

  // Les espèces du joueur déterminent ce qui lui est utile : on remonte en tête
  // les sorts qu'au moins un de ses personnages peut apprendre.
  const apprenables = new Set(
    profil.persos.flatMap((p) => ESPECES_PAR_ID[p.especeId]?.pool ?? []),
  );
  const elements = ['TOUS', ...Object.keys(INFO_ELEMENTS)];
  const liste = SORTS.filter((s) => element === 'TOUS' || s.element === element).sort((a, b) => {
    const ua = apprenables.has(a.id) ? 0 : 1;
    const ub = apprenables.has(b.id) ? 0 : 1;
    return ua - ub || coutFabrication(a.id) - coutFabrication(b.id);
  });

  return (
    <>
      <p className="panneau__aide">
        La Forge produit le sort que tu désignes, sans passer par le hasard. Ses gènes sont tirés
        avec un plancher de {PLANCHER_IV_FABRICATION}/31 : corrects, jamais parfaits — un exemplaire
        forgé ne remplace pas un coup de chance en booster. Tu as{' '}
        <strong>💠 {profil.compte.essence.toLocaleString('fr-FR')}</strong> d’essence.
      </p>
      <div className="forge__filtres">
        {elements.map((e) => (
          <button
            key={e}
            className={`bouton bouton--mini ${element === e ? 'est-actif' : ''}`}
            onClick={() => setElement(e)}
          >
            {e === 'TOUS' ? 'Tous' : `${INFO_ELEMENTS[e as keyof typeof INFO_ELEMENTS].emoji} ${INFO_ELEMENTS[e as keyof typeof INFO_ELEMENTS].nom}`}
          </button>
        ))}
      </div>
      <div className="boutique__grille">
        {liste.length === 0 && <Vide texte="Aucun sort de cet élément." emoji="📜" />}
        {liste.map((s) => {
          const cout = coutFabrication(s.id);
          const abordable = profil.compte.essence >= cout;
          return (
            <div
              key={s.id}
              className={`offre rarete--${s.rarete.toLowerCase()} ${apprenables.has(s.id) ? 'offre--utile' : ''}`}
              style={{ '--el': INFO_ELEMENTS[s.element].couleur } as React.CSSProperties}
            >
              {apprenables.has(s.id) && <span className="offre__remise">apprenable</span>}
              <div className="offre__corps">
                <span className="offre__emoji">{INFO_ELEMENTS[s.element].emoji}</span>
                <strong>{s.nom}</strong>
                <small>
                  {s.puissance > 0 && `⚔ ${s.puissance} · `}
                  {s.soin > 0 && `✚ ${s.soin} · `}🎲 d{s.de} · ⚡ {s.cout}
                </small>
                <em>{s.texte}</em>
              </div>
              <div className="offre__bas">
                <Rarete rarete={s.rarete} />
                <button
                  className={`bouton ${abordable ? 'bouton--primaire' : ''}`}
                  disabled={!abordable || occupe !== null}
                  onClick={() => fabriquer(s.id)}
                >
                  💠 {cout.toLocaleString('fr-FR')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
