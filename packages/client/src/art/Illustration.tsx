import { createContext, useContext, useState } from 'react';
import type { ArtSpec } from '@arene/engine';
import { Avatar } from './Avatar';
import { illustrationEspece, STYLE_ACTIF } from './illustrations';

/**
 * Style d'illustration servi à l'arbre courant. Le jeu ne s'en sert pas — il
 * garde STYLE_ACTIF — mais la vitrine en a besoin pour poser les trois bibles
 * côte à côte dans de vraies cartes. Un contexte plutôt qu'une prop parce que
 * la Carte est l'intermédiaire, et qu'elle n'a aucune raison de connaître la
 * direction artistique.
 */
export const ContexteStyleArt = createContext<string>(STYLE_ACTIF);

/**
 * Style qui n'existe dans aucun manifeste : demander celui-ci force le repli
 * sur l'avatar SVG. C'est ce qui permet d'afficher une carte illustrée à côté
 * de son repli sans code de test dans le composant.
 */
export const SANS_ILLUSTRATION = '(aucun)';

interface Props {
  especeId: string;
  /** Fiche d'art du personnage, pour le repli procédural. */
  art: ArtSpec;
  taille: number;
  /** Une chromatique n'a pas d'illustration propre : on décale sa teinte. */
  chromatique?: boolean;
}

/**
 * L'art d'un personnage, illustration peinte si elle existe, avatar SVG
 * procédural sinon.
 *
 * Le repli est double : le manifeste écarte avant le rendu les espèces non
 * illustrées, et `onError` rattrape le cas où le fichier a disparu du dépôt
 * depuis la dernière génération. Le jeu doit rester complet même avec zéro
 * illustration commitée — c'est ce qui rend le choix de direction artistique
 * réversible.
 */
export function Illustration({ especeId, art, taille, chromatique }: Props) {
  const style = useContext(ContexteStyleArt);
  const source = illustrationEspece(especeId, style);
  // On mémorise QUELLE source a échoué, pas le simple fait d'un échec : la
  // vitrine change de bible sur la même carte, et un booléen la laisserait
  // repliée sur le SVG pour tous les styles suivants.
  const [echouee, setEchouee] = useState<string | null>(null);

  if (!source || echouee === source) {
    return <Avatar art={art} taille={taille} pose="portrait" avecFond={false} />;
  }

  return (
    <img
      className={`carte__illustration${chromatique ? ' est-chromatique' : ''}`}
      src={source}
      alt=""
      width={taille}
      height={taille}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setEchouee(source)}
    />
  );
}
