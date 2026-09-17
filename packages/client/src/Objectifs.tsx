import { useCallback, useEffect, useState } from 'react';
import { api, ErreurApi, type ObjectifVue, type VueObjectifs } from './api';
import { useApp } from './store';
import { jouer } from './son';

/** Contexte partagé : la vue des objectifs est lue par le hub et la navigation. */
let cacheVue: VueObjectifs | null = null;
const abonnes = new Set<(v: VueObjectifs | null) => void>();

export function diffuserObjectifs(v: VueObjectifs | null): void {
  cacheVue = v;
  for (const f of abonnes) f(v);
}

export function useObjectifs() {
  const [vue, setVue] = useState<VueObjectifs | null>(cacheVue);

  useEffect(() => {
    abonnes.add(setVue);
    return () => {
      abonnes.delete(setVue);
    };
  }, []);

  const recharger = useCallback(async () => {
    try {
      diffuserObjectifs(await api.objectifs());
    } catch {
      /* sans objectifs, le jeu reste jouable */
    }
  }, []);

  return { vue, recharger };
}

// ───────────────────────────── Panneau ─────────────────────────────

export function PanneauObjectifs() {
  const { vue, recharger } = useObjectifs();
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [onglet, setOnglet] = useState<'pas' | 'contrats'>('pas');
  const [occupe, setOccupe] = useState<string | null>(null);

  useEffect(() => {
    if (!vue) void recharger();
  }, [vue, recharger]);

  // Une fois les premiers pas terminés, les contrats prennent la vedette.
  useEffect(() => {
    if (vue?.premiersPasFinis) setOnglet('contrats');
  }, [vue?.premiersPasFinis]);

  if (!vue) return null;

  const reclamer = async (o: ObjectifVue) => {
    setOccupe(o.id);
    try {
      const r = await api.reclamerObjectif(o.id);
      appliquerProfil(r);
      await recharger();
      jouer('achat');
      notifier(
        `${o.nom} : +${r.credits} 💰${r.eclats ? ` +${r.eclats} ✨` : ''}`,
        'bien',
      );
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Impossible de récupérer.', 'mal');
    } finally {
      setOccupe(null);
    }
  };

  const liste = onglet === 'pas' ? vue.premiersPas : vue.contrats;
  const restantsPas = vue.premiersPas.filter((o) => !o.reclame).length;

  return (
    <section className="panneau panneau--objectifs">
      <div className="atelier__entete">
        <h3>Objectifs</h3>
        {vue.aReclamer > 0 && (
          <span className="etiquette etiquette--classe">{vue.aReclamer} à récupérer</span>
        )}
      </div>

      <div className="onglets onglets--compact">
        <button className={onglet === 'pas' ? 'est-actif' : ''} onClick={() => setOnglet('pas')}>
          Premiers pas {restantsPas > 0 && `(${restantsPas})`}
        </button>
        <button
          className={onglet === 'contrats' ? 'est-actif' : ''}
          onClick={() => setOnglet('contrats')}
        >
          Contrats du jour
        </button>
      </div>

      {onglet === 'contrats' && (
        <p className="panneau__aide">
          Trois contrats tirés chaque jour, les mêmes pour tout le monde. Ils poussent à sortir de
          son équipe habituelle plutôt qu'à enchaîner les parties.
        </p>
      )}

      <ul className="objectifs">
        {liste.map((o) => (
          <li key={o.id} className={`objectif ${o.reclame ? 'est-reclame' : o.fait ? 'est-fait' : ''}`}>
            <span className="objectif__emoji">{o.emoji}</span>
            <div className="objectif__corps">
              <strong>{o.nom}</strong>
              <small>{o.texte}</small>
              {o.cible > 1 && !o.reclame && (
                <div className="objectif__barre">
                  <i style={{ width: `${Math.min(100, (o.valeur / o.cible) * 100)}%` }} />
                  <b>
                    {o.valeur}/{o.cible}
                  </b>
                </div>
              )}
            </div>
            <div className="objectif__action">
              {o.reclame ? (
                <span className="objectif__coche">✓</span>
              ) : o.fait ? (
                <button
                  className="bouton bouton--primaire"
                  disabled={occupe === o.id}
                  onClick={() => reclamer(o)}
                >
                  Récupérer
                </button>
              ) : (
                <span className="objectif__gain">
                  {o.recompense.credits ? `💰 ${o.recompense.credits}` : ''}
                  {o.recompense.eclats ? ` ✨ ${o.recompense.eclats}` : ''}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ───────────────────────── Récompense de connexion ─────────────────────────

export function CarteConnexion() {
  const { vue, recharger } = useObjectifs();
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [occupe, setOccupe] = useState(false);

  if (!vue || !vue.connexion.reclamableAujourdhui) return null;

  const prochain = (vue.connexion.palier % vue.connexion.cycle.length) + 1;
  const p = vue.connexion.cycle[prochain - 1];

  const reclamer = async () => {
    setOccupe(true);
    try {
      const r = await api.reclamerConnexion();
      appliquerProfil(r);
      await recharger();
      jouer('victoire');
      notifier(`Jour ${r.palier} : +${r.credits} 💰${r.eclats ? ` +${r.eclats} ✨` : ''}`, 'bien');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Impossible de récupérer.', 'mal');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <section className="panneau panneau--connexion">
      <div className="connexion-jour">
        <div>
          <h3>Récompense du jour</h3>
          <p className="panneau__aide">
            Jour {prochain} sur {vue.connexion.cycle.length}. Sauter un jour ne remet rien à zéro.
          </p>
        </div>
        <div className="connexion-jour__paliers">
          {vue.connexion.cycle.map((c) => (
            <span
              key={c.jour}
              className={`palier ${c.jour < prochain ? 'est-passe' : ''} ${
                c.jour === prochain ? 'est-courant' : ''
              } ${c.booster ? 'est-booster' : ''}`}
              title={`${c.recompense.credits ?? 0} crédits${c.recompense.eclats ? `, ${c.recompense.eclats} éclats` : ''}`}
            >
              {c.booster ? '🎴' : c.jour}
            </span>
          ))}
        </div>
        <button className="bouton bouton--primaire" disabled={occupe} onClick={reclamer}>
          Récupérer {p.recompense.credits ? `💰 ${p.recompense.credits}` : ''}
          {p.recompense.eclats ? ` ✨ ${p.recompense.eclats}` : ''}
        </button>
      </div>
    </section>
  );
}

// ───────────────────────── Introduction d'écran ─────────────────────────

export function IntroEcran({
  ecran,
  titre,
  children,
}: {
  ecran: string;
  titre: string;
  children: React.ReactNode;
}) {
  const { vue, recharger } = useObjectifs();
  const [ferme, setFerme] = useState(false);

  if (!vue || ferme || vue.vuIntro.includes(ecran)) return null;

  const fermer = async () => {
    setFerme(true);
    try {
      await api.marquerIntro(ecran);
      await recharger();
    } catch {
      /* la fermeture locale suffit pour cette session */
    }
  };

  return (
    <div className="intro-ecran">
      <div className="intro-ecran__corps">
        <strong>{titre}</strong>
        <div>{children}</div>
      </div>
      <button className="bouton bouton--fantome" onClick={fermer}>
        J’ai compris
      </button>
    </div>
  );
}
