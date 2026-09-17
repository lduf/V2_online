import { useMemo, useState } from 'react';
import {
  COUT_REROLL_GENES_SORT,
  ESPECES,
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS,
  ITEMS_PAR_ID,
  SORTS,
  SORTS_PAR_ID,
  multiplicateurElement,
  ELEMENTS,
  type Element,
} from '@arene/engine';
import { api, ErreurApi } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { CarteSortPossede, Rarete, Vide } from '../composants';

type Onglet = 'personnages' | 'sorts' | 'objets' | 'elements';

export function Collection() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [onglet, setOnglet] = useState<Onglet>('personnages');
  const [filtre, setFiltre] = useState('');

  const possedes = useMemo(
    () => new Set(profil.persos.map((p) => p.especeId)),
    [profil.persos],
  );
  const sortsPossedes = useMemo(
    () => new Set(profil.sorts.map((s) => s.defId)),
    [profil.sorts],
  );

  const correspond = (texte: string) =>
    filtre.trim() === '' || texte.toLowerCase().includes(filtre.trim().toLowerCase());

  const rerollSort = async (uid: string) => {
    if (profil.compte.credits < COUT_REROLL_GENES_SORT) return notifier('Pas assez de crédits.', 'mal');
    if (!confirm(`Retirer les gènes de ce sort pour ${COUT_REROLL_GENES_SORT} crédits ?`)) return;
    try {
      appliquerProfil(await api.rerollGenesSort(uid));
      jouer('invocation');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Opération impossible.', 'mal');
    }
  };

  return (
    <div className="collection">
      <div className="panneau">
        <div className="atelier__entete">
          <h3>Codex</h3>
          <input
            className="recherche"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Rechercher…"
          />
        </div>
        <div className="onglets onglets--compact">
          {(['personnages', 'sorts', 'objets', 'elements'] as Onglet[]).map((o) => (
            <button key={o} className={onglet === o ? 'est-actif' : ''} onClick={() => setOnglet(o)}>
              {o === 'elements' ? 'éléments' : o}
            </button>
          ))}
        </div>

        {onglet === 'personnages' && (
          <div className="codex__grille">
            {ESPECES.filter((e) => correspond(e.nom + e.titre + e.role)).map((e) => (
              <div
                key={e.id}
                className={`codex-perso rarete--${e.rarete.toLowerCase()} ${
                  possedes.has(e.id) ? '' : 'est-verrouille'
                }`}
                style={{ '--el': INFO_ELEMENTS[e.element].couleur } as React.CSSProperties}
              >
                <Avatar art={e.art} element={e.element} taille={92} pose="repos" />
                <strong>{e.nom}</strong>
                <small>{e.titre}</small>
                <div className="codex-perso__meta">
                  <Rarete rarete={e.rarete} />
                  <span>{INFO_ELEMENTS[e.element].emoji}</span>
                  <span>{e.role.toLowerCase()}</span>
                </div>
                <em className="codex-perso__passif">
                  ✦ {e.passif.nom} — {e.passif.texte}
                </em>
                <p className="codex-perso__lore">« {e.lore} »</p>
                <div className="codex-perso__base">
                  {Object.entries(e.base).map(([k, v]) => (
                    <span key={k}>
                      {k.toUpperCase()} <b>{v}</b>
                    </span>
                  ))}
                </div>
                {!possedes.has(e.id) && <span className="codex__verrou">🔒 non possédé</span>}
              </div>
            ))}
          </div>
        )}

        {onglet === 'sorts' && (
          <>
            <p className="panneau__aide">
              Tes {profil.sorts.length} sorts. Chaque exemplaire a ses propres gènes : deux « Boule
              de Feu » ne se valent pas.
            </p>
            <div className="codex__sorts">
              {profil.sorts
                .filter((s) => correspond(SORTS_PAR_ID[s.defId]?.nom ?? ''))
                .map((s) => (
                  <div key={s.uid} className="codex__sort-ligne">
                    <CarteSortPossede sort={s} compatible onClick={() => undefined} />
                    <button
                      className="bouton-mini"
                      title={`Retirer les gènes — ${COUT_REROLL_GENES_SORT} crédits`}
                      onClick={() => rerollSort(s.uid)}
                    >
                      🎲
                    </button>
                  </div>
                ))}
              {profil.sorts.length === 0 && <Vide texte="Aucun sort." emoji="📜" />}
            </div>
            <details className="atelier__pool">
              <summary>
                Tous les sorts du jeu ({SORTS.filter((s) => sortsPossedes.has(s.id)).length}/
                {SORTS.length} découverts)
              </summary>
              <ul className="codex__tous">
                {SORTS.filter((s) => correspond(s.nom)).map((s) => (
                  <li key={s.id} className={sortsPossedes.has(s.id) ? 'est-possede' : ''}>
                    {INFO_ELEMENTS[s.element].emoji} <strong>{s.nom}</strong>{' '}
                    <Rarete rarete={s.rarete} />
                    <small>
                      {s.puissance > 0 && `⚔${s.puissance} `}
                      {s.soin !== 0 && `✚${s.soin} `}🎲d{s.de} ⚡{s.cout}
                      {s.recharge > 0 && ` · CD${s.recharge}`}
                    </small>
                    <em>{s.texte}</em>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        {onglet === 'objets' && (
          <div className="codex__objets">
            {ITEMS.filter((i) => correspond(i.nom)).map((i) => {
              const q = profil.items[i.id] ?? 0;
              return (
                <div
                  key={i.id}
                  className={`codex-objet rarete--${i.rarete.toLowerCase()} ${q ? '' : 'est-verrouille'}`}
                >
                  <span className="codex-objet__emoji">{i.emoji}</span>
                  <div>
                    <strong>
                      {i.nom} {q > 0 && <b>×{q}</b>}
                    </strong>
                    <small>
                      {Object.entries(i.bonus)
                        .map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`)
                        .join(' · ')}
                    </small>
                    <em>{i.texte}</em>
                  </div>
                  <Rarete rarete={i.rarete} />
                </div>
              );
            })}
          </div>
        )}

        {onglet === 'elements' && (
          <>
            <p className="panneau__aide">
              Un sort super efficace inflige +50 % de dégâts, un sort peu efficace −30 %. Lancer un
              sort de son propre élément donne +20 % (affinité). L’Arcane ne subit ni bonus ni malus.
            </p>
            <div className="table-elements">
              <table>
                <thead>
                  <tr>
                    <th>Attaque ↓ / Défense →</th>
                    {ELEMENTS.map((e) => (
                      <th key={e} style={{ color: INFO_ELEMENTS[e].couleur }}>
                        {INFO_ELEMENTS[e].emoji}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ELEMENTS.map((a) => (
                    <tr key={a}>
                      <th style={{ color: INFO_ELEMENTS[a].couleur }}>
                        {INFO_ELEMENTS[a].emoji} {INFO_ELEMENTS[a].nom}
                      </th>
                      {ELEMENTS.map((d) => {
                        const m = multiplicateurElement(a as Element, d as Element);
                        return (
                          <td
                            key={d}
                            className={m > 1 ? 'est-super' : m < 1 ? 'est-faible' : ''}
                            title={`${INFO_ELEMENTS[a].nom} → ${INFO_ELEMENTS[d].nom} : ×${m}`}
                          >
                            {m === 1 ? '·' : `×${m}`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
