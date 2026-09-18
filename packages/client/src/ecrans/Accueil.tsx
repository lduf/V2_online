import { useEffect, useRef, useState } from 'react';
import {
  DIVISIONS,
  divisionPourElo,
  divisionSuivante,
  ESPECES_PAR_ID,
  LIBELLES_DIFFICULTE,
  type Difficulte,
} from '@arene/engine';
import { api, ErreurApi, type LigneMatch } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { Vide } from '../composants';
import { CarteConnexion, IntroEcran, PanneauObjectifs, useObjectifs } from '../Objectifs';

export function Accueil() {
  const profil = useApp((s) => s.profil)!;
  const aller = useApp((s) => s.aller);
  const entrerEnCombat = useApp((s) => s.entrerEnCombat);
  const notifier = useApp((s) => s.notifier);

  const [enFile, setEnFile] = useState(false);
  const [attente, setAttente] = useState(0);
  const [joueursEnFile, setJoueursEnFile] = useState(0);
  const [lancement, setLancement] = useState<string | null>(null);
  const [codeSalon, setCodeSalon] = useState<string | null>(null);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [historique, setHistorique] = useState<LigneMatch[]>([]);
  const monte = useRef(true);

  const compte = profil.compte;
  const division = divisionPourElo(compte.elo);
  const suivante = divisionSuivante(compte.elo);

  const { recharger: rechargerObjectifs } = useObjectifs();

  useEffect(() => {
    void rechargerObjectifs();
  }, [rechargerObjectifs]);

  useEffect(() => {
    monte.current = true;
    api
      .historique()
      .then((h) => monte.current && setHistorique(h.matchs.slice(0, 6)))
      .catch(() => undefined);
    return () => {
      monte.current = false;
    };
  }, []);

  // Interrogation de la file classée.
  useEffect(() => {
    if (!enFile) return;
    const t = setInterval(async () => {
      try {
        const e = await api.etatFile();
        if (!monte.current) return;
        setAttente(e.attenteMs);
        setJoueursEnFile(e.joueursEnFile);
        if (e.combatId) {
          setEnFile(false);
          jouer('victoire');
          entrerEnCombat(e.combatId);
        }
      } catch {
        /* on retentera */
      }
    }, 1800);
    return () => clearInterval(t);
  }, [enFile, entrerEnCombat]);

  // Interrogation du salon privé (côté hôte).
  useEffect(() => {
    if (!codeSalon) return;
    const t = setInterval(async () => {
      try {
        const e = await api.etatSalon(codeSalon);
        if (!monte.current) return;
        if (e.combatId) {
          setCodeSalon(null);
          entrerEnCombat(e.combatId);
        }
      } catch {
        /* on retentera */
      }
    }, 1800);
    return () => clearInterval(t);
  }, [codeSalon, entrerEnCombat]);

  const lancerSolo = async (difficulte: Difficulte) => {
    setLancement(difficulte);
    try {
      const c = await api.combatSolo(difficulte);
      entrerEnCombat(c.combatId);
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Impossible de lancer le combat.', 'mal');
    } finally {
      if (monte.current) setLancement(null);
    }
  };

  const basculerFile = async () => {
    try {
      if (enFile) {
        await api.quitterFile();
        setEnFile(false);
      } else {
        const e = await api.rejoindreFile();
        if (e.combatId) return entrerEnCombat(e.combatId);
        setEnFile(true);
        setAttente(0);
      }
      jouer('clic');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'File indisponible.', 'mal');
    }
  };

  const creerSalon = async () => {
    try {
      const r = await api.creerSalon();
      setCodeSalon(r.code);
      jouer('clic');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Salon indisponible.', 'mal');
    }
  };

  const rejoindreSalon = async () => {
    try {
      const r = await api.rejoindreSalon(codeSaisi.trim());
      entrerEnCombat(r.combatId);
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Code invalide.', 'mal');
    }
  };

  const equipe = profil.equipe
    .map((uid) => profil.persos.find((p) => p.uid === uid))
    .filter(Boolean);

  return (
    <div className="accueil">
      <IntroEcran ecran="accueil" titre="Bienvenue dans l’arène">
        <p>
          Tu diriges une équipe de trois personnages, un seul sur le terrain à la fois. Chaque sort
          a un <strong>dé</strong> : peu de faces, c’est fiable ; beaucoup de faces, c’est la
          loterie — et tomber sur la face maximale déclenche un coup critique.
        </p>
        <p>
          Commence par <strong>l’entraînement solo</strong> pour prendre le jeu en main. Les
          objectifs ci-dessous te guident et te paient.
        </p>
      </IntroEcran>

      <CarteConnexion />

      <section className="panneau panneau--profil">
        <div className="profil__entete">
          <div>
            <h2>{compte.pseudo}</h2>
            <p className="profil__division" style={{ color: division.couleur }}>
              {division.emoji} {division.nom} · {compte.elo} pts
              {compte.rang ? ` · #${compte.rang}` : ''}
            </p>
          </div>
          <div className="profil__bilan">
            <span className="est-positif">{compte.victoires} V</span>
            <span className="est-negatif">{compte.defaites} D</span>
            {compte.serie > 1 && <span className="profil__serie">🔥 {compte.serie}</span>}
          </div>
        </div>
        {suivante && (
          <div className="profil__progression">
            <div className="profil__barre">
              <i
                style={{
                  width: `${Math.max(3, Math.min(100, ((compte.elo - division.seuil) / Math.max(1, suivante.seuil - division.seuil)) * 100))}%`,
                  background: division.couleur,
                }}
              />
            </div>
            <small>
              {suivante.seuil - compte.elo} pts avant {suivante.emoji} {suivante.nom}
            </small>
          </div>
        )}
        <div className="profil__equipe">
          {equipe.length === 0 && <Vide texte="Aucune équipe : passe par l’Atelier." emoji="🧩" />}
          {equipe.map((p) => {
            const e = ESPECES_PAR_ID[p!.especeId];
            return (
              <div key={p!.uid} className="profil__membre" title={`${p!.surnom || e.nom} — N.${p!.niveau}`}>
                <Avatar art={e.art} taille={56} pose="portrait" />
                <span>{p!.surnom || e.nom}</span>
                <small>N.{p!.niveau}</small>
              </div>
            );
          })}
          <button className="bouton bouton--fantome" onClick={() => aller('atelier')}>
            Modifier
          </button>
        </div>
      </section>

      <section className="panneau panneau--jouer">
        <h3>Combat classé</h3>
        <p className="panneau__aide">
          Affronte un autre joueur. Sans adversaire humain sous 18 secondes, tu rencontres l’équipe
          d’un joueur réel pilotée par l’IA — le classement compte quand même.
        </p>
        <button
          className={`bouton bouton--primaire bouton--large ${enFile ? 'est-attente' : ''}`}
          onClick={basculerFile}
        >
          {enFile
            ? `Recherche… ${Math.floor(attente / 1000)} s${joueursEnFile > 1 ? ` · ${joueursEnFile} en file` : ''} — annuler`
            : '⚔️ Chercher un adversaire'}
        </button>

        <h3>Entraînement solo</h3>
        <div className="difficultes">
          {(['FACILE', 'NORMAL', 'DIFFICILE'] as Difficulte[]).map((d) => (
            <button
              key={d}
              className={`bouton bouton--difficulte diff--${d.toLowerCase()}`}
              disabled={!!lancement}
              onClick={() => lancerSolo(d)}
            >
              <strong>{LIBELLES_DIFFICULTE[d]}</strong>
              <small>
                {d === 'FACILE'
                  ? '110 💰 · 320 XP'
                  : d === 'NORMAL'
                    ? '185 💰 · 520 XP'
                    : '300 💰 · 820 XP'}
              </small>
            </button>
          ))}
        </div>

        <h3>Match privé</h3>
        <div className="salon">
          {codeSalon ? (
            <div className="salon__code">
              <span>Ton code&nbsp;:</span>
              <strong>{codeSalon}</strong>
              <button
                className="bouton bouton--fantome"
                onClick={() => {
                  void navigator.clipboard?.writeText(codeSalon);
                  notifier('Code copié.', 'bien');
                }}
              >
                Copier
              </button>
              <button className="bouton bouton--fantome" onClick={() => setCodeSalon(null)}>
                Annuler
              </button>
            </div>
          ) : (
            <>
              <button className="bouton" onClick={creerSalon}>
                Créer un salon
              </button>
              <div className="salon__rejoindre">
                <input
                  value={codeSaisi}
                  onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={5}
                />
                <button className="bouton" disabled={codeSaisi.length < 4} onClick={rejoindreSalon}>
                  Rejoindre
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panneau panneau--historique">
        <h3>Derniers combats</h3>
        {historique.length === 0 ? (
          <Vide texte="Aucun combat pour l’instant. Lance-toi !" emoji="⚔️" />
        ) : (
          <ul className="historique">
            {historique.map((m) => {
              const gagne = m.vainqueur === compte.id;
              const jeSuisA = m.compte_a === compte.id;
              const delta = jeSuisA ? m.delta_a : m.delta_b;
              return (
                <li key={m.id} className={gagne ? 'est-victoire' : m.vainqueur ? 'est-defaite' : ''}>
                  <span className="historique__resultat">{gagne ? 'V' : m.vainqueur ? 'D' : 'N'}</span>
                  <span className="historique__adv">{jeSuisA ? m.nom_b : m.nom_a}</span>
                  <span className="historique__mode">{libelleMode(m.mode)}</span>
                  {delta !== 0 && (
                    <span className={delta > 0 ? 'est-positif' : 'est-negatif'}>
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <button className="bouton bouton--fantome" onClick={() => aller('classement')}>
          Voir le classement
        </button>
      </section>

      <PanneauObjectifs />
    </div>
  );
}

function libelleMode(m: string): string {
  switch (m) {
    case 'CLASSE':
      return 'Classé';
    case 'AMICAL':
      return 'Amical';
    case 'SOLO_FACILE':
      return 'Sparring';
    case 'SOLO_NORMAL':
      return 'Championnat';
    case 'SOLO_DIFFICILE':
      return 'Cauchemar';
    default:
      return m;
  }
}
