import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Rarete } from '@arene/engine';
import { Carte, type DonneesCarte } from '../art/Carte';
import { jouer } from '../son';

export interface TirageClient {
  kind: 'PERSO' | 'SORT' | 'ITEM';
  rarete: Rarete;
  especeId?: string;
  defId?: string;
  itemId?: string;
  natureId?: string;
  chromatique?: boolean;
  prisme?: boolean;
  ivs?: Record<string, number>;
}

export interface BoosterClient {
  cartes: TirageClient[];
  meilleureRarete: Rarete;
  contientVariante: boolean;
}

const LIBELLE_RARETE: Record<Rarete, string> = {
  COMMUN: 'Commun',
  RARE: 'Rare',
  EPIQUE: 'Épique',
  LEGENDAIRE: 'Légendaire',
};

function versDonnees(t: TirageClient): DonneesCarte {
  if (t.kind === 'PERSO') {
    return {
      kind: 'PERSO',
      especeId: t.especeId!,
      chromatique: t.chromatique,
    };
  }
  if (t.kind === 'SORT') {
    return { kind: 'SORT', defId: t.defId!, prisme: t.prisme };
  }
  return { kind: 'ITEM', itemId: t.itemId! };
}

function estVariante(t: TirageClient): boolean {
  return !!t.chromatique || !!t.prisme;
}

type Phase = 'paquet' | 'revelation' | 'resume';

export function OuvertureBooster({
  boosters,
  onFini,
}: {
  boosters: BoosterClient[];
  onFini: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('paquet');
  const [revelees, setRevelees] = useState(0);
  const [enRetournement, setEnRetournement] = useState(false);
  const [eclair, setEclair] = useState<Rarete | null>(null);

  const booster = boosters[index];
  const total = booster?.cartes.length ?? 0;
  const carteCourante = booster?.cartes[revelees];
  const toutes = useMemo(
    () => boosters.flatMap((b) => b.cartes),
    [boosters],
  );

  const ouvrirPaquet = useCallback(() => {
    jouer(booster.meilleureRarete === 'LEGENDAIRE' ? 'legendaire' : 'invocation');
    setPhase('revelation');
    setRevelees(0);
  }, [booster]);

  const reveler = useCallback(() => {
    if (enRetournement || !carteCourante) return;
    setEnRetournement(true);
    const r = carteCourante.rarete;
    const variante = estVariante(carteCourante);

    // Le son part au moment du retournement, pas à la fin : c'est lui qui
    // annonce la rareté avant que l'œil ne l'ait lue.
    if (variante) jouer('legendaire');
    else if (r === 'LEGENDAIRE') jouer('legendaire');
    else if (r === 'EPIQUE') jouer('victoire');
    else if (r === 'RARE') jouer('achat');
    else jouer('clic');

    if (r === 'LEGENDAIRE' || r === 'EPIQUE' || variante) setEclair(r);

    window.setTimeout(() => {
      setRevelees((n) => n + 1);
      setEnRetournement(false);
      setEclair(null);
    }, 620);
  }, [carteCourante, enRetournement]);

  const toutReveler = useCallback(() => {
    jouer('achat');
    setRevelees(total);
    setEnRetournement(false);
  }, [total]);

  const suivant = useCallback(() => {
    if (index + 1 < boosters.length) {
      setIndex((i) => i + 1);
      setPhase('paquet');
      setRevelees(0);
    } else {
      setPhase('resume');
    }
  }, [index, boosters.length]);

  // Barre d'espace et entrée font avancer la cérémonie.
  useEffect(() => {
    const onTouche = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (phase === 'paquet') ouvrirPaquet();
      else if (phase === 'revelation') {
        if (revelees >= total) suivant();
        else reveler();
      } else onFini();
    };
    window.addEventListener('keydown', onTouche);
    return () => window.removeEventListener('keydown', onTouche);
  }, [phase, revelees, total, ouvrirPaquet, reveler, suivant, onFini]);

  if (!booster) return null;

  return (
    <div className="ouverture">
      {eclair && <div className={`ouverture__eclair eclair--${eclair.toLowerCase()}`} aria-hidden />}

      <div className="ouverture__entete">
        <span>
          Paquet {index + 1} / {boosters.length}
        </span>
        {phase === 'revelation' && (
          <span>
            Carte {Math.min(revelees + 1, total)} / {total}
          </span>
        )}
        <button className="bouton bouton--fantome" onClick={onFini}>
          Fermer
        </button>
      </div>

      {phase === 'paquet' && (
        <div className="ouverture__scene">
          <button
            className={`paquet paquet--${booster.meilleureRarete.toLowerCase()} ${
              booster.contientVariante ? 'paquet--variante' : ''
            }`}
            onClick={ouvrirPaquet}
            aria-label="Ouvrir le paquet"
          >
            <span className="paquet__sceau">⚔</span>
            <span className="paquet__titre">ARÈNE</span>
            <span className="paquet__sous-titre">{booster.cartes.length} cartes</span>
            <span className="paquet__lueur" aria-hidden />
          </button>
          <p className="ouverture__consigne">
            {booster.meilleureRarete === 'LEGENDAIRE'
              ? 'Ce paquet est lourd…'
              : 'Clique pour ouvrir'}
          </p>
        </div>
      )}

      {phase === 'revelation' && (
        <>
          <div className="ouverture__scene">
            {revelees < total ? (
              <div
                className={[
                  'retournement',
                  `retournement--${carteCourante!.rarete.toLowerCase()}`,
                  estVariante(carteCourante!) ? 'retournement--variante' : '',
                  enRetournement ? 'est-retournee' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={reveler}
                role="button"
                tabIndex={0}
                aria-label="Révéler la carte"
              >
                <div className="retournement__face retournement__dos">
                  <span
                    className={`dos__indice indice--${carteCourante!.rarete.toLowerCase()} ${
                      estVariante(carteCourante!) ? 'indice--variante' : ''
                    }`}
                    aria-hidden
                  />
                  <span className="dos__marque">⚔</span>
                </div>
                <div className="retournement__face retournement__avant">
                  <Carte donnees={versDonnees(carteCourante!)} taille="grand" vivante={false} />
                </div>
              </div>
            ) : (
              <div className="ouverture__fin-paquet">
                <h3>Paquet terminé</h3>
                <div className="grille-cartes grille-cartes--serree">
                  {booster.cartes.map((t, i) => (
                    <Carte key={i} donnees={versDonnees(t)} taille="mini" />
                  ))}
                </div>
                <button className="bouton bouton--primaire bouton--large" onClick={suivant}>
                  {index + 1 < boosters.length ? 'Paquet suivant' : 'Voir le butin'}
                </button>
              </div>
            )}
          </div>

          {revelees < total && (
            <>
              <div className="ouverture__deja">
                {booster.cartes.slice(0, revelees).map((t, i) => (
                  <Carte key={i} donnees={versDonnees(t)} taille="mini" vivante={false} />
                ))}
              </div>
              <div className="ouverture__actions">
                <button className="bouton bouton--primaire" onClick={reveler}>
                  Révéler
                </button>
                <button className="bouton bouton--fantome" onClick={toutReveler}>
                  Tout révéler
                </button>
              </div>
            </>
          )}
        </>
      )}

      {phase === 'resume' && (
        <div className="ouverture__resume">
          <h2>Butin</h2>
          <p className="ouverture__compte">
            {toutes.length} cartes ·{' '}
            {(['LEGENDAIRE', 'EPIQUE', 'RARE'] as Rarete[])
              .map((r) => ({ r, n: toutes.filter((t) => t.rarete === r).length }))
              .filter((x) => x.n > 0)
              .map((x) => `${x.n} ${LIBELLE_RARETE[x.r].toLowerCase()}${x.n > 1 ? 's' : ''}`)
              .join(' · ') || 'que du commun, ça arrive'}
            {toutes.some(estVariante) && ' · ✦ variante !'}
          </p>
          <div className="grille-cartes">
            {toutes.map((t, i) => (
              <Carte key={i} donnees={versDonnees(t)} taille="mini" />
            ))}
          </div>
          <button className="bouton bouton--primaire bouton--large" onClick={onFini}>
            Terminer
          </button>
        </div>
      )}
    </div>
  );
}
