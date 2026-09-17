import { useCallback, useEffect, useState } from 'react';
import {
  BONUS_PAR_ID,
  ETAGES_TOUR,
  nomEtage,
  recompensesTour,
} from '@arene/engine';
import { api, ErreurApi, type VueTour } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Chargement } from '../composants';

export function Tour() {
  const profil = useApp((s) => s.profil)!;
  const entrerEnCombat = useApp((s) => s.entrerEnCombat);
  const notifier = useApp((s) => s.notifier);
  const rafraichir = useApp((s) => s.rafraichir);
  const [vue, setVue] = useState<VueTour | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    try {
      setVue(await api.tour());
    } catch {
      notifier('Tour indisponible.', 'mal');
    }
  }, [notifier]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const demarrer = async () => {
    setOccupe(true);
    try {
      const v = await api.tourDemarrer();
      await rafraichir();
      jouer('victoire');
      if (v.combatId) entrerEnCombat(v.combatId);
      else setVue(v);
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Impossible de lancer la tentative.', 'mal');
    } finally {
      setOccupe(false);
    }
  };

  const prendreBonus = async (id: string) => {
    setOccupe(true);
    try {
      const v = await api.tourBonus(id);
      jouer('achat');
      if (v.combatId) entrerEnCombat(v.combatId);
      else setVue(v);
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Choix impossible.', 'mal');
      void charger();
    } finally {
      setOccupe(false);
    }
  };

  const abandonner = async () => {
    if (!confirm('Abandonner la tentative ? Tu gardes les récompenses des étages réussis.')) return;
    setOccupe(true);
    try {
      setVue(await api.tourAbandonner());
      await rafraichir();
    } finally {
      setOccupe(false);
    }
  };

  if (!vue) return <Chargement texte="Ouverture de la Tour…" />;

  const etagesReussis = Math.max(0, vue.etage - 1);

  return (
    <div className="tour">
      <div className="panneau">
        <div className="atelier__entete">
          <h3>La Tour des Rattrapages</h3>
          {vue.enCours ? (
            <span className="etiquette etiquette--classe">Tentative en cours</span>
          ) : (
            <span className="etiquette">
              {vue.tentativeGratuiteDispo
                ? 'Tentative gratuite disponible'
                : `Tentative suivante : ${vue.coutTentative} 💰`}
            </span>
          )}
        </div>

        <p className="panneau__aide">
          Dix étages d’affilée. <strong>Les points de vie ne se régénèrent pas entre les
          combats</strong> — seulement 20 % des PV max après chaque victoire, et un combattant
          K.O. le reste jusqu’à la fin. Après chaque étage, tu choisis une bénédiction parmi
          trois. Une défaite termine la tentative : tu gardes les récompenses des étages réussis.
        </p>

        <Escalier etage={vue.enCours ? vue.etage : 0} />

        {vue.enCours && vue.choix && (
          <div className="benedictions">
            <h3>Choisis ta bénédiction</h3>
            <div className="benedictions__grille">
              {vue.choix.map((id) => {
                const b = BONUS_PAR_ID[id];
                if (!b) return null;
                return (
                  <button
                    key={id}
                    className={`benediction rarete--${b.rarete.toLowerCase()}`}
                    disabled={occupe}
                    onClick={() => prendreBonus(id)}
                  >
                    <span className="benediction__emoji">{b.emoji}</span>
                    <strong>{b.nom}</strong>
                    <small>{b.texte}</small>
                    <em className={`rarete-puce rarete--${b.rarete.toLowerCase()}`}>{b.rarete}</em>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {vue.enCours && !vue.choix && vue.combatId && (
          <div className="tour__reprise">
            <p>
              Étage {vue.etage} — <strong>{vue.nomEtage}</strong>
            </p>
            <button
              className="bouton bouton--primaire bouton--large"
              onClick={() => entrerEnCombat(vue.combatId!)}
            >
              Reprendre le combat
            </button>
          </div>
        )}

        {!vue.enCours && (
          <div className="tour__lancement">
            <button
              className="bouton bouton--primaire bouton--large"
              disabled={occupe || (!vue.tentativeGratuiteDispo && profil.compte.credits < vue.coutTentative)}
              onClick={demarrer}
            >
              {vue.tentativeGratuiteDispo
                ? '🗼 Lancer la tentative du jour'
                : `🗼 Nouvelle tentative — ${vue.coutTentative} 💰`}
            </button>
          </div>
        )}

        {vue.enCours && vue.bonus.length > 0 && (
          <>
            <h3 className="codex__sous-titre">Bénédictions acquises</h3>
            <div className="benedictions__acquises">
              {vue.bonus.map((id, i) => {
                const b = BONUS_PAR_ID[id];
                return b ? (
                  <span key={i} className={`benediction-puce rarete--${b.rarete.toLowerCase()}`} title={b.texte}>
                    {b.emoji} {b.nom}
                  </span>
                ) : null;
              })}
            </div>
          </>
        )}

        {vue.enCours && (
          <button className="bouton bouton--fantome bouton--danger" onClick={abandonner} disabled={occupe}>
            Abandonner la tentative
          </button>
        )}

        <h3 className="codex__sous-titre">Récompenses selon l’étage atteint</h3>
        <div className="tour__bareme">
          {[2, 4, 6, 8, 10].map((n) => {
            const r = recompensesTour(n, n === ETAGES_TOUR);
            return (
              <div key={n} className={`bareme ${etagesReussis >= n ? 'est-atteint' : ''}`}>
                <strong>Étage {n}</strong>
                <span>💰 {r.credits.toLocaleString('fr-FR')}</span>
                <span>✨ {r.eclats}</span>
                {n === ETAGES_TOUR && <em>Jury Final</em>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Escalier({ etage }: { etage: number }) {
  return (
    <ol className="escalier">
      {Array.from({ length: ETAGES_TOUR }, (_, i) => {
        const n = ETAGES_TOUR - i;
        const etat = etage === 0 ? 'vierge' : n < etage ? 'reussi' : n === etage ? 'courant' : 'a-venir';
        return (
          <li key={n} className={`escalier__etage est-${etat}`}>
            <span className="escalier__numero">{n}</span>
            <span className="escalier__nom">{nomEtage(n)}</span>
            {etat === 'reussi' && <span className="escalier__marque">✓</span>}
            {etat === 'courant' && <span className="escalier__marque">▶</span>}
          </li>
        );
      })}
    </ol>
  );
}
