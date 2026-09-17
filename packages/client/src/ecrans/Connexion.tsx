import { useState } from 'react';
import { ESPECES } from '@arene/engine';
import { ErreurApi } from '../api';
import { useApp } from '../store';
import { Avatar } from '../art/Avatar';

export function Connexion() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [pseudo, setPseudo] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const connexion = useApp((s) => s.connexion);
  const inscription = useApp((s) => s.inscription);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      if (mode === 'connexion') await connexion(pseudo, mdp);
      else await inscription(pseudo, mdp);
    } catch (err) {
      setErreur(err instanceof ErreurApi ? err.message : 'Impossible de contacter le serveur.');
    } finally {
      setEnvoi(false);
    }
  };

  const vedettes = ESPECES.filter((e) =>
    ['ignis', 'kairos', 'vlad', 'aurore', 'zizou', 'seraphine'].includes(e.id),
  );

  return (
    <div className="connexion">
      <div className="connexion__vitrine" aria-hidden>
        {vedettes.map((e, i) => (
          <div key={e.id} className="connexion__vedette" style={{ '--i': i } as React.CSSProperties}>
            <Avatar art={e.art} element={e.element} taille={128} pose="repos" />
          </div>
        ))}
      </div>

      <div className="connexion__panneau">
        <h1 className="logo">
          <span className="logo__arene">ARÈNE</span>
          <span className="logo__v2">V2</span>
        </h1>
        <p className="connexion__accroche">
          Construis ton équipe, lance tes dés, grimpe au classement.
          <br />
          <em>Un projet de première année devenu un vrai jeu.</em>
        </p>

        <div className="onglets">
          <button
            className={mode === 'connexion' ? 'est-actif' : ''}
            onClick={() => setMode('connexion')}
            type="button"
          >
            Connexion
          </button>
          <button
            className={mode === 'inscription' ? 'est-actif' : ''}
            onClick={() => setMode('inscription')}
            type="button"
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={soumettre} className="formulaire">
          <label>
            Pseudo
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              autoComplete="username"
              placeholder="3 à 18 caractères"
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
              placeholder="6 caractères minimum"
              required
            />
          </label>
          {erreur && <p className="formulaire__erreur">{erreur}</p>}
          <button className="bouton bouton--primaire bouton--large" disabled={envoi} type="submit">
            {envoi ? '…' : mode === 'connexion' ? 'Entrer dans l’arène' : 'Créer mon écurie'}
          </button>
        </form>

        {mode === 'inscription' && (
          <p className="connexion__cadeau">
            🎁 4 personnages, 16 sorts, 2 500 crédits et 60 éclats offerts au départ.
          </p>
        )}
      </div>
    </div>
  );
}
