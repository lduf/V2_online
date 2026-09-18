import { useState } from 'react';
import {
  ESPECES_PAR_ID,
  IV_MAX,
  TOUTES_STATS,
  type IvsPerso,
  type PersoPossede,
} from '@arene/engine';
import { Carte } from '../art/Carte';
import { ContexteStyleArt, SANS_ILLUSTRATION } from '../art/Illustration';
import { ILLUSTRATIONS, STYLE_ACTIF } from '../art/illustrations';

/**
 * Vitrine du composant Carte : tous ses états sur une seule page, sans
 * serveur, sans compte, sans partie en cours.
 *
 * À quoi ça sert : juger une direction artistique sur des images brutes ne
 * veut rien dire. Ce que voit le joueur, c'est une carte — avec son cadre de
 * rareté, son foil, son bandeau de stats et son recadrage. Une illustration
 * qui gagne en planche de comparaison peut perdre une fois posée dans le
 * cadre, et c'est le cadre qui décide.
 *
 * Elle sert aussi de cible aux captures Playwright, d'où les `id` sur les
 * sections : un changement de rendu se voit en diff d'image, pas à l'œil nu
 * trois semaines plus tard.
 *
 * On y accède par `#vitrine` — hors de l'App, donc hors authentification.
 */

/** Gènes tous au maximum : c'est ce qui déclenche le Sceau Parfait (Ω). */
const GENES_PARFAITS = Object.fromEntries(
  TOUTES_STATS.map((s) => [s, IV_MAX]),
) as IvsPerso;

/** Gènes quelconques mais fixes — une vitrine qui bouge ne se compare plus. */
const GENES_MOYENS = Object.fromEntries(
  TOUTES_STATS.map((s, i) => [s, 12 + ((i * 7) % 15)]),
) as IvsPerso;

const SANS_EVS = Object.fromEntries(TOUTES_STATS.map((s) => [s, 0])) as IvsPerso;

function perso(
  especeId: string,
  options: Partial<PersoPossede> & { ivs?: IvsPerso } = {},
): PersoPossede {
  return {
    uid: `vitrine-${especeId}-${options.chromatique ? 'c' : ''}${options.ivs === GENES_PARFAITS ? 'o' : ''}`,
    especeId,
    niveau: 50,
    xp: 0,
    ivs: GENES_MOYENS,
    evs: SANS_EVS,
    natureId: 'temeraire',
    sorts: [null, null, null, null],
    itemId: null,
    obtenuLe: 0,
    ...options,
  };
}

/** Les six sujets de validation, dans l'ordre des quatre raretés du moteur. */
const RARETES = ['maxence', 'ondine', 'brigitte', 'vlad', 'zora', 'ignis'];

/** Les bibles du traitement standard : l'illustration au centre du cadre. */
function biblesDisponibles(): string[] {
  return Object.keys(ILLUSTRATIONS).filter((s) => !s.startsWith('pleine-'));
}

/**
 * Les directions de prestige, pour le full art.
 *
 * Elles ne sont plus dérivées de la bible plate : le prestige a son propre
 * médium (rendu, reflets, profondeur de champ), que les bibles plates
 * interdisent par construction. Deux axes indépendants, donc deux sélecteurs.
 */
function prestigesDisponibles(): string[] {
  return Object.keys(ILLUSTRATIONS).filter((s) => s.startsWith('pleine-'));
}

function Section({
  id,
  titre,
  note,
  outils,
  children,
}: {
  id: string;
  titre: string;
  note: string;
  /** Sélecteur propre à la section, quand elle a son propre axe de choix. */
  outils?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="demo-carte__section" id={id}>
      <h2>{titre}</h2>
      <p className="demo-carte__note">{note}</p>
      {outils}
      <div className="demo-carte__rangee">{children}</div>
    </section>
  );
}

export function Vitrine() {
  const bibles = biblesDisponibles();
  const [style, setStyle] = useState(
    bibles.includes(STYLE_ACTIF) ? STYLE_ACTIF : (bibles[0] ?? SANS_ILLUSTRATION),
  );
  const prestiges = prestigesDisponibles();
  const [stylePlein, setStylePlein] = useState(prestiges[0] ?? SANS_ILLUSTRATION);
  const aDuFullArt = Boolean(ILLUSTRATIONS[stylePlein]);

  return (
    <div className="demo-carte">
      <header className="demo-carte__entete">
        <h1>Vitrine du composant Carte</h1>
        <p>
          Tous les états de la carte, sans serveur. Le sélecteur bascule la bible de style :
          c'est la même carte, la même rareté, le même cadre — seule l'illustration change.
        </p>
        <div className="demo-carte__styles">
          {bibles.map((b) => (
            <button
              key={b}
              className={b === style ? 'est-actif' : ''}
              onClick={() => setStyle(b)}
              data-style={b}
            >
              {b}
            </button>
          ))}
        </div>
      </header>

      <ContexteStyleArt.Provider value={style}>
        <Section
          id="raretes"
          titre="Les quatre raretés"
          note="COMMUN sans foil, RARE à 50 %, EPIQUE à 80 %, LEGENDAIRE à fond et bordure dorée. Le foil ne se voit qu'au survol — c'est voulu."
        >
          {RARETES.map((id) => (
            <figure key={id}>
              <Carte donnees={{ kind: 'PERSO', especeId: id, perso: perso(id) }} taille="grand" />
              <figcaption>
                {ESPECES_PAR_ID[id].nom} · {ESPECES_PAR_ID[id].rarete}
              </figcaption>
            </figure>
          ))}
        </Section>

        <Section
          id="variantes"
          titre="Chromatique et Sceau Parfait"
          note="Le Chromatique (✦) décale la teinte de l'illustration et allume le cadre arc-en-ciel. Le Sceau (Ω) marque les sept gènes à 31. Les deux sont strictement cosmétiques."
        >
          <figure>
            <Carte
              donnees={{ kind: 'PERSO', especeId: 'zora', perso: perso('zora') }}
              taille="grand"
            />
            <figcaption>Zora — normale, pour comparer</figcaption>
          </figure>
          <figure>
            <Carte
              donnees={{
                kind: 'PERSO',
                especeId: 'zora',
                perso: perso('zora', { chromatique: true }),
              }}
              taille="grand"
            />
            <figcaption>Zora — Chromatique ✦</figcaption>
          </figure>
          <figure>
            <Carte
              donnees={{
                kind: 'PERSO',
                especeId: 'ignis',
                perso: perso('ignis', { ivs: GENES_PARFAITS }),
              }}
              taille="grand"
            />
            <figcaption>Ignis Rex — Sceau Parfait Ω</figcaption>
          </figure>
        </Section>

        <Section
          id="repli"
          titre="Illustration contre repli SVG"
          note="À gauche l'illustration peinte, à droite l'avatar procédural que voit un joueur quand l'image manque. L'écart entre les deux est le coût réel d'un lot incomplet."
        >
          {['vlad', 'ignis'].map((id) => (
            <div className="demo-carte__paire" key={id}>
              <figure>
                <Carte
                  donnees={{ kind: 'PERSO', especeId: id, perso: perso(id) }}
                  taille="grand"
                />
                <figcaption>{ESPECES_PAR_ID[id].nom} — illustration</figcaption>
              </figure>
              <ContexteStyleArt.Provider value={SANS_ILLUSTRATION}>
                <figure>
                  <Carte
                    donnees={{ kind: 'PERSO', especeId: id, perso: perso(id) }}
                    taille="grand"
                  />
                  <figcaption>{ESPECES_PAR_ID[id].nom} — repli SVG</figcaption>
                </figure>
              </ContexteStyleArt.Provider>
            </div>
          ))}
        </Section>

        <Section
          id="tailles"
          titre="Les trois tailles"
          note="mini 128 px (grilles denses), normal 200 px, grand 268 px. Le texte de passif disparaît en mini : la carte doit rester lisible, pas complète."
        >
          {(['mini', 'normal', 'grand'] as const).map((t) => (
            <figure key={t}>
              <Carte
                donnees={{ kind: 'PERSO', especeId: 'ignis', perso: perso('ignis') }}
                taille={t}
              />
              <figcaption>{t}</figcaption>
            </figure>
          ))}
        </Section>
      </ContexteStyleArt.Provider>

      <ContexteStyleArt.Provider value={stylePlein}>
        <Section
          id="fullart"
          titre="Maquette full art"
          outils={
            <div className="demo-carte__styles">
              {prestiges.map((p) => (
                <button
                  key={p}
                  className={p === stylePlein ? 'est-actif' : ''}
                  onClick={() => setStylePlein(p)}
                  data-prestige={p}
                >
                  {p.replace('pleine-', '')}
                </button>
              ))}
            </div>
          }
          note={
            aDuFullArt
              ? "L'illustration occupe la carte bord à bord, le texte passe en surimpression sur un voile dégradé. Le prestige a son propre médium — rendu, reflets, profondeur de champ — que les bibles plates interdisent : c'est un axe indépendant du choix ci-dessus, comme l'alternate art d'un jeu de cartes."
              : 'Aucune illustration full art sur le disque — les cartes ci-dessous montrent le repli.'
          }
        >
          {['zora', 'ignis'].map((id) => (
            <figure key={id}>
              <Carte
                donnees={{ kind: 'PERSO', especeId: id, perso: perso(id) }}
                taille="grand"
                pleine
              />
              <figcaption>
                {ESPECES_PAR_ID[id].nom} — full art · {ESPECES_PAR_ID[id].rarete}
              </figcaption>
            </figure>
          ))}
          {/* Le témoin reprend la bible STANDARD : comparer le full art à
              lui-même dans un petit panneau ne dirait rien. */}
          <ContexteStyleArt.Provider value={style}>
            <figure>
              <Carte
                donnees={{ kind: 'PERSO', especeId: 'ignis', perso: perso('ignis') }}
                taille="grand"
              />
              <figcaption>Ignis Rex — traitement standard, pour comparer</figcaption>
            </figure>
          </ContexteStyleArt.Provider>
        </Section>
      </ContexteStyleArt.Provider>
    </div>
  );
}
