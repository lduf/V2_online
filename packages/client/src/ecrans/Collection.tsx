import { useMemo, useState } from 'react';
import {
  COUT_REROLL_GENES_SORT,
  ELEMENTS,
  valeurDissolutionSort,
  ESPECES,
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS,
  ITEMS_PAR_ID,
  SORTS,
  SORTS_PAR_ID,
  multiplicateurElement,
  type Element,
} from '@arene/engine';
import { api, ErreurApi } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Carte } from '../art/Carte';
import { Rarete, Vide } from '../composants';

type Onglet = 'personnages' | 'sorts' | 'objets' | 'elements';

export function Collection() {
  const profil = useApp((s) => s.profil)!;
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);
  const [onglet, setOnglet] = useState<Onglet>('personnages');
  const [filtre, setFiltre] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  // Le clic sur une carte de sort fait deux choses opposées : on demande
  // laquelle plutôt que de cacher la dissolution dans un menu contextuel.
  const [actionSort, setActionSort] = useState<'genes' | 'dissoudre'>('genes');

  const possedes = useMemo(() => new Set(profil.persos.map((p) => p.especeId)), [profil.persos]);
  const sortsPossedes = useMemo(() => new Set(profil.sorts.map((s) => s.defId)), [profil.sorts]);

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

  /** Un sort équipé ne se dissout pas : il faut d'abord le retirer dans l'Atelier. */
  const sortsEquipes = useMemo(
    () => new Set(profil.persos.flatMap((p) => p.sorts.filter((x): x is string => !!x))),
    [profil.persos],
  );

  const dissoudreSort = async (uid: string) => {
    const sort = profil.sorts.find((s) => s.uid === uid);
    if (!sort) return;
    if (sortsEquipes.has(uid)) {
      return notifier('Ce sort est équipé — retire-le d’abord dans l’Atelier.', 'mal');
    }
    const gain = valeurDissolutionSort(sort);
    if (!confirm(`Dissoudre ${SORTS_PAR_ID[sort.defId].nom} contre ${gain} essence ? C’est définitif.`)) {
      return;
    }
    try {
      const r = await api.dissoudreSort(uid);
      appliquerProfil(r);
      notifier(`+${r.gain} essence`, 'bien');
      jouer('achat');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Dissolution impossible.', 'mal');
    }
  };

  const chromatiques = profil.persos.filter((p) => p.chromatique).length;
  const prismes = profil.sorts.filter((s) => s.prisme).length;

  return (
    <div className="collection">
      <div className="panneau">
        <div className="atelier__entete">
          <h3>Codex</h3>
          <div className="codex__compteurs">
            <span title="Personnages découverts">
              👤 {possedes.size}/{ESPECES.length}
            </span>
            <span title="Sorts découverts">
              📜 {sortsPossedes.size}/{SORTS.length}
            </span>
            {chromatiques > 0 && <span title="Chromatiques">✦ {chromatiques}</span>}
            {prismes > 0 && <span title="Prismes">◆ {prismes}</span>}
          </div>
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
          <>
            <p className="panneau__aide">
              Une carte par personnage du jeu. Celles que tu possèdes sont en couleur — clique pour
              voir le détail et tes exemplaires.
            </p>
            <div className="grille-cartes">
              {ESPECES.filter((e) => correspond(e.nom + e.titre + e.role)).map((e) => {
                const miens = profil.persos.filter((p) => p.especeId === e.id);
                const vedette = miens.find((p) => p.chromatique) ?? miens[0];
                return (
                  <Carte
                    key={e.id}
                    donnees={{ kind: 'PERSO', especeId: e.id, perso: vedette }}
                    estompee={miens.length === 0}
                    badge={miens.length > 1 ? `×${miens.length}` : undefined}
                    onClick={() => setDetail(e.id)}
                  />
                );
              })}
            </div>
          </>
        )}

        {onglet === 'sorts' && (
          <>
            <p className="panneau__aide">
              Tes {profil.sorts.length} exemplaires. Chacun a ses propres gènes : deux « Boule de
              Feu » ne se valent pas.{' '}
              {actionSort === 'genes'
                ? `Clique sur une carte pour en retirer les gènes (${COUT_REROLL_GENES_SORT} 💰).`
                : 'Clique sur une carte pour la dissoudre en essence. Les sorts équipés sont protégés.'}
            </p>
            <div className="onglets onglets--compact">
              <button
                className={actionSort === 'genes' ? 'est-actif' : ''}
                onClick={() => setActionSort('genes')}
              >
                🎲 Retirer les gènes
              </button>
              <button
                className={actionSort === 'dissoudre' ? 'est-actif' : ''}
                onClick={() => setActionSort('dissoudre')}
              >
                💠 Dissoudre
              </button>
            </div>
            <div className="grille-cartes">
              {profil.sorts
                .filter((s) => correspond(SORTS_PAR_ID[s.defId]?.nom ?? ''))
                .map((s) => (
                  <Carte
                    key={s.uid}
                    donnees={{ kind: 'SORT', defId: s.defId, sort: s }}
                    taille="mini"
                    estompee={actionSort === 'dissoudre' && sortsEquipes.has(s.uid)}
                    onClick={() =>
                      actionSort === 'genes' ? rerollSort(s.uid) : dissoudreSort(s.uid)
                    }
                  />
                ))}
              {profil.sorts.length === 0 && <Vide texte="Aucun sort." emoji="📜" />}
            </div>

            <h3 className="codex__sous-titre">
              Sorts non découverts ({SORTS.length - sortsPossedes.size})
            </h3>
            <div className="grille-cartes">
              {SORTS.filter((s) => !sortsPossedes.has(s.id) && correspond(s.nom)).map((s) => (
                <Carte key={s.id} donnees={{ kind: 'SORT', defId: s.id }} taille="mini" estompee />
              ))}
            </div>
          </>
        )}

        {onglet === 'objets' && (
          <div className="grille-cartes">
            {ITEMS.filter((i) => correspond(i.nom)).map((i) => {
              const q = profil.items[i.id] ?? 0;
              return (
                <Carte
                  key={i.id}
                  donnees={{ kind: 'ITEM', itemId: i.id }}
                  taille="mini"
                  estompee={q === 0}
                  badge={q > 1 ? `×${q}` : undefined}
                />
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

      {detail && <DetailEspece especeId={detail} onFermer={() => setDetail(null)} />}
    </div>
  );
}

function DetailEspece({ especeId, onFermer }: { especeId: string; onFermer: () => void }) {
  const profil = useApp((s) => s.profil)!;
  const espece = ESPECES_PAR_ID[especeId];
  const miens = profil.persos.filter((p) => p.especeId === especeId);

  return (
    <div className="modale" onClick={onFermer}>
      <div className="modale__contenu" onClick={(e) => e.stopPropagation()}>
        <button className="modale__fermer" onClick={onFermer} aria-label="Fermer">
          ✕
        </button>
        <div className="detail-espece">
          <Carte
            donnees={{ kind: 'PERSO', especeId, perso: miens.find((p) => p.chromatique) ?? miens[0] }}
            taille="grand"
            estompee={miens.length === 0}
          />
          <div className="detail-espece__texte">
            <h2>
              {espece.nom} <small>{espece.titre}</small>
            </h2>
            <p className="detail__meta">
              <span style={{ color: INFO_ELEMENTS[espece.element].couleur }}>
                {INFO_ELEMENTS[espece.element].emoji} {INFO_ELEMENTS[espece.element].nom}
              </span>
              <Rarete rarete={espece.rarete} />
              <span>{espece.role.toLowerCase()}</span>
            </p>
            <div className="detail__passif">
              <strong>✦ {espece.passif.nom}</strong>
              <span>{espece.passif.texte}</span>
            </div>
            <p className="detail__lore">« {espece.lore} »</p>
            <div className="codex-perso__base">
              {Object.entries(espece.base).map(([k, v]) => (
                <span key={k}>
                  {k.toUpperCase()} <b>{v}</b>
                </span>
              ))}
            </div>
            <h3 className="codex__sous-titre">Sorts apprenables ({espece.pool.length})</h3>
            <div className="grille-cartes grille-cartes--serree">
              {espece.pool.map((id) => (
                <Carte key={id} donnees={{ kind: 'SORT', defId: id }} taille="mini" vivante={false} />
              ))}
            </div>
            {miens.length > 0 && (
              <>
                <h3 className="codex__sous-titre">Tes exemplaires ({miens.length})</h3>
                <ul className="detail-espece__miens">
                  {miens.map((p) => (
                    <li key={p.uid}>
                      {p.chromatique && <span className="est-chromatique">✦</span>}
                      {p.surnom || espece.nom} — niveau {p.niveau}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
