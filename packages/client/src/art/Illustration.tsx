import { useState } from 'react';
import type { ArtSpec } from '@arene/engine';
import { Avatar } from './Avatar';
import { illustrationEspece } from './illustrations';

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
  const source = illustrationEspece(especeId);
  const [echouee, setEchouee] = useState(false);

  if (!source || echouee) {
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
      onError={() => setEchouee(true)}
    />
  );
}
