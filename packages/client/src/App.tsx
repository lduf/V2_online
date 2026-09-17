import { useEffect } from 'react';
import { useApp, type Ecran } from './store';
import { basculerSon, jouer, sonActif } from './son';
import { useState } from 'react';
import { Ressources } from './composants';
import { Connexion } from './ecrans/Connexion';
import { Accueil } from './ecrans/Accueil';
import { Combat } from './ecrans/Combat';
import { Atelier } from './ecrans/Atelier';
import { Collection } from './ecrans/Collection';
import { Boutique } from './ecrans/Boutique';
import { Invocation } from './ecrans/Invocation';
import { Classement } from './ecrans/Classement';
import { Tour } from './ecrans/Tour';

const NAV: { id: Ecran; libelle: string; emoji: string }[] = [
  { id: 'accueil', libelle: 'Hub', emoji: '🏟️' },
  { id: 'tour', libelle: 'La Tour', emoji: '🗼' },
  { id: 'atelier', libelle: 'Atelier', emoji: '🧬' },
  { id: 'invocation', libelle: 'Invocation', emoji: '🔮' },
  { id: 'boutique', libelle: 'Boutique', emoji: '🏪' },
  { id: 'collection', libelle: 'Codex', emoji: '📚' },
  { id: 'classement', libelle: 'Classement', emoji: '🏆' },
];

export function App() {
  const { pret, connecte, profil, ecran, combatId, toasts } = useApp();
  const initialiser = useApp((s) => s.initialiser);
  const aller = useApp((s) => s.aller);
  const deconnexion = useApp((s) => s.deconnexion);
  const fermerToast = useApp((s) => s.fermerToast);
  const [son, setSon] = useState(sonActif());

  useEffect(() => {
    void initialiser();
  }, [initialiser]);

  if (!pret) {
    return (
      <div className="app app--demarrage">
        <div className="chargeur" />
      </div>
    );
  }

  if (!connecte || !profil) {
    return (
      <div className="app app--connexion">
        <Connexion />
        <Toasts toasts={toasts} onFermer={fermerToast} />
      </div>
    );
  }

  const enCombat = ecran === 'combat' && combatId;

  return (
    <div className="app">
      <header className="entete">
        <button
          className="entete__logo"
          onClick={() => !enCombat && aller('accueil')}
          disabled={!!enCombat}
        >
          <span className="logo__arene">ARÈNE</span>
          <span className="logo__v2">V2</span>
        </button>

        {!enCombat && (
          <nav className="nav">
            {NAV.map((n) => (
              <button
                key={n.id}
                className={ecran === n.id ? 'est-actif' : ''}
                onClick={() => aller(n.id)}
                onMouseEnter={() => jouer('survol')}
              >
                <span aria-hidden>{n.emoji}</span>
                <i>{n.libelle}</i>
              </button>
            ))}
          </nav>
        )}

        <div className="entete__droite">
          <Ressources credits={profil.compte.credits} eclats={profil.compte.eclats} />
          <button
            className="bouton-mini"
            title={son ? 'Couper le son' : 'Activer le son'}
            onClick={() => setSon(basculerSon())}
          >
            {son ? '🔊' : '🔇'}
          </button>
          {!enCombat && (
            <button className="bouton-mini" title="Se déconnecter" onClick={deconnexion}>
              ⏻
            </button>
          )}
        </div>
      </header>

      <main className={`contenu ${enCombat ? 'contenu--combat' : ''}`}>
        {enCombat ? (
          <Combat combatId={combatId} />
        ) : ecran === 'atelier' ? (
          <Atelier />
        ) : ecran === 'collection' ? (
          <Collection />
        ) : ecran === 'boutique' ? (
          <Boutique />
        ) : ecran === 'invocation' ? (
          <Invocation />
        ) : ecran === 'classement' ? (
          <Classement />
        ) : ecran === 'tour' ? (
          <Tour />
        ) : (
          <Accueil />
        )}
      </main>

      <Toasts toasts={toasts} onFermer={fermerToast} />
    </div>
  );
}

function Toasts({
  toasts,
  onFermer,
}: {
  toasts: { id: number; texte: string; ton: string }[];
  onFermer: (id: number) => void;
}) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast--${t.ton}`} onClick={() => onFermer(t.id)}>
          {t.texte}
        </button>
      ))}
    </div>
  );
}
