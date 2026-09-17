import { useMemo, useState } from 'react';
import {
  COUT_HYPER_ENTRAINEMENT,
  COUT_REROLL_GENES,
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  IV_MAX,
  NATURES_PAR_ID,
  perfectionIvs,
  SORTS_PAR_ID,
  TAILLE_EQUIPE,
  TOUTES_STATS,
  progression,
  type PersoPossede,
} from '@arene/engine';
import { api, ErreurApi } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar } from '../art/Avatar';
import { CartePerso, CarteSortPossede, FicheStats, Rarete, Vide } from '../composants';

export function Atelier() {
  const profil = useApp((s) => s.profil)!;
  const rafraichir = useApp((s) => s.rafraichir);
  const appliquerProfil = useApp((s) => s.appliquerProfil);
  const notifier = useApp((s) => s.notifier);

  const [selection, setSelection] = useState<string | null>(
    profil.equipe[0] ?? profil.persos[0]?.uid ?? null,
  );
  const [ongletDroite, setOngletDroite] = useState<'sorts' | 'objet' | 'genes'>('sorts');
  const [emplacement, setEmplacement] = useState<number | null>(null);
  const [occupe, setOccupe] = useState(false);

  const perso = profil.persos.find((p) => p.uid === selection) ?? null;
  const espece = perso ? ESPECES_PAR_ID[perso.especeId] : null;
  const sortsParUid = useMemo(
    () => new Map(profil.sorts.map((s) => [s.uid, s])),
    [profil.sorts],
  );

  const dansEquipe = (uid: string) => profil.equipe.includes(uid);

  const basculerEquipe = async (uid: string) => {
    let membres = [...profil.equipe];
    if (membres.includes(uid)) membres = membres.filter((m) => m !== uid);
    else if (membres.length < TAILLE_EQUIPE) membres.push(uid);
    else {
      notifier(`L’équipe est déjà complète (${TAILLE_EQUIPE}). Retire quelqu’un d’abord.`, 'mal');
      return;
    }
    if (membres.length !== TAILLE_EQUIPE) {
      // On autorise l'état intermédiaire côté client, mais le serveur exige 3.
      appliquerProfil({ ...profil, equipe: membres });
      return;
    }
    try {
      await api.definirEquipe(membres);
      appliquerProfil({ ...profil, equipe: membres });
      jouer('clic');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Équipe refusée.', 'mal');
    }
  };

  const equiperSort = async (index: number, uidSort: string | null) => {
    if (!perso) return;
    const sorts = [...perso.sorts];
    // Si le sort est déjà ailleurs sur ce personnage, on échange les places.
    if (uidSort) {
      const ancienIndex = sorts.indexOf(uidSort);
      if (ancienIndex >= 0) sorts[ancienIndex] = sorts[index];
    }
    sorts[index] = uidSort;
    setOccupe(true);
    try {
      await api.majPerso(perso.uid, { sorts });
      appliquerProfil({
        ...profil,
        persos: profil.persos.map((p) => (p.uid === perso.uid ? { ...p, sorts } : p)),
      });
      setEmplacement(null);
      jouer('clic');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Sort refusé.', 'mal');
    } finally {
      setOccupe(false);
    }
  };

  const equiperObjet = async (itemId: string | null) => {
    if (!perso) return;
    setOccupe(true);
    try {
      await api.majPerso(perso.uid, { itemId });
      appliquerProfil({
        ...profil,
        persos: profil.persos.map((p) => (p.uid === perso.uid ? { ...p, itemId } : p)),
      });
      jouer('clic');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Objet refusé.', 'mal');
    } finally {
      setOccupe(false);
    }
  };

  const renommer = async () => {
    if (!perso) return;
    const nom = prompt('Nouveau surnom (16 caractères max, vide pour réinitialiser) :', perso.surnom ?? '');
    if (nom === null) return;
    try {
      await api.majPerso(perso.uid, { surnom: nom.trim() || null });
      await rafraichir();
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Surnom refusé.', 'mal');
    }
  };

  const rerollGenes = async () => {
    if (!perso) return;
    if (!confirm(`Retirer les gènes de ce personnage pour ${COUT_REROLL_GENES} crédits ? Le tirage est définitif.`))
      return;
    setOccupe(true);
    try {
      appliquerProfil(await api.rerollGenes(perso.uid));
      jouer('invocation');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Opération impossible.', 'mal');
    } finally {
      setOccupe(false);
    }
  };

  const hyper = async (stat: string) => {
    if (!perso) return;
    setOccupe(true);
    try {
      appliquerProfil(await api.hyperEntrainement(perso.uid, stat));
      jouer('achat');
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Opération impossible.', 'mal');
    } finally {
      setOccupe(false);
    }
  };

  /** Sorts apprenables par ce personnage et non déjà équipés ailleurs. */
  const sortsCompatibles = useMemo(() => {
    if (!espece) return [];
    const pris = new Set(
      profil.persos
        .filter((p) => p.uid !== perso?.uid)
        .flatMap((p) => p.sorts.filter((x): x is string => !!x)),
    );
    return profil.sorts.filter((s) => espece.pool.includes(s.defId) && !pris.has(s.uid));
  }, [profil.sorts, profil.persos, espece, perso]);

  const objetsDisponibles = useMemo(() => {
    const porteurs = new Map<string, number>();
    for (const p of profil.persos) {
      if (p.itemId && p.uid !== perso?.uid) {
        porteurs.set(p.itemId, (porteurs.get(p.itemId) ?? 0) + 1);
      }
    }
    return Object.entries(profil.items)
      .map(([id, q]) => ({ id, restant: q - (porteurs.get(id) ?? 0) }))
      .filter((x) => x.restant > 0 || perso?.itemId === x.id);
  }, [profil.items, profil.persos, perso]);

  return (
    <div className="atelier">
      <section className="panneau atelier__roster">
        <div className="atelier__entete">
          <h3>Écurie</h3>
          <span className={profil.equipe.length === TAILLE_EQUIPE ? 'est-positif' : 'est-negatif'}>
            Équipe {profil.equipe.length}/{TAILLE_EQUIPE}
          </span>
        </div>
        <p className="panneau__aide">
          Clique sur un personnage pour l’éditer. Le bouton ⭐ l’aligne dans ton équipe de combat.
        </p>
        <div className="atelier__liste">
          {profil.persos.map((p) => (
            <div key={p.uid} className="atelier__entree">
              <CartePerso
                perso={p}
                selectionne={p.uid === selection}
                surbrillance={dansEquipe(p.uid)}
                onClick={() => setSelection(p.uid)}
              />
              <button
                className={`bouton-etoile ${dansEquipe(p.uid) ? 'est-actif' : ''}`}
                title={dansEquipe(p.uid) ? 'Retirer de l’équipe' : 'Aligner dans l’équipe'}
                onClick={() => basculerEquipe(p.uid)}
              >
                ⭐
              </button>
            </div>
          ))}
        </div>
      </section>

      {!perso || !espece ? (
        <section className="panneau">
          <Vide texte="Sélectionne un personnage." emoji="👈" />
        </section>
      ) : (
        <>
          <section className="panneau atelier__detail">
            <div className="detail__entete">
              <Avatar art={espece.art} element={espece.element} taille={120} pose="repos" />
              <div>
                <h2>
                  {perso.surnom || espece.nom}
                  <button className="bouton-mini" onClick={renommer} title="Renommer">
                    ✏️
                  </button>
                </h2>
                <p className="detail__titre">
                  {espece.titre} · {espece.role.toLowerCase()}
                </p>
                <p className="detail__meta">
                  <span style={{ color: INFO_ELEMENTS[espece.element].couleur }}>
                    {INFO_ELEMENTS[espece.element].emoji} {INFO_ELEMENTS[espece.element].nom}
                  </span>
                  <Rarete rarete={espece.rarete} />
                  <span>Niveau {perso.niveau}</span>
                  <span title="Nature">{NATURES_PAR_ID[perso.natureId]?.nom}</span>
                </p>
                <div className="detail__xp">
                  <div className="detail__xp-barre">
                    <i style={{ width: `${Math.round(progression(perso.xp).ratio * 100)}%` }} />
                  </div>
                  <small>
                    {progression(perso.xp).max
                      ? 'Niveau maximum'
                      : `${progression(perso.xp).xpDansNiveau} / ${progression(perso.xp).xpPourNiveauSuivant} XP`}
                  </small>
                </div>
              </div>
            </div>

            <div className="detail__passif">
              <strong>✦ {espece.passif.nom}</strong>
              <span>{espece.passif.texte}</span>
            </div>
            <p className="detail__lore">« {espece.lore} »</p>

            <FicheStats perso={perso} />
            <div className="detail__perfection">
              Perfection des gènes : <strong>{perfectionIvs(perso.ivs)} %</strong>
            </div>

            <div className="detail__sorts-equipes">
              {[0, 1, 2, 3].map((i) => {
                const uidSort = perso.sorts[i];
                const s = uidSort ? sortsParUid.get(uidSort) : null;
                const def = s ? SORTS_PAR_ID[s.defId] : null;
                return (
                  <button
                    key={i}
                    className={`emplacement ${emplacement === i ? 'est-actif' : ''} ${def ? '' : 'est-vide'}`}
                    style={
                      def
                        ? ({ '--el': INFO_ELEMENTS[def.element].couleur } as React.CSSProperties)
                        : undefined
                    }
                    onClick={() => {
                      setOngletDroite('sorts');
                      setEmplacement(emplacement === i ? null : i);
                    }}
                  >
                    {def ? (
                      <>
                        <span>{INFO_ELEMENTS[def.element].emoji}</span>
                        <strong>{def.nom}</strong>
                        <small>
                          {def.puissance > 0 ? `⚔${def.puissance} ` : ''}🎲d{def.de} ⚡{def.cout}
                        </small>
                      </>
                    ) : (
                      <>
                        <span>➕</span>
                        <strong>Emplacement {i + 1}</strong>
                        <small>vide</small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panneau atelier__equipement">
            <div className="onglets onglets--compact">
              <button
                className={ongletDroite === 'sorts' ? 'est-actif' : ''}
                onClick={() => setOngletDroite('sorts')}
              >
                Sorts
              </button>
              <button
                className={ongletDroite === 'objet' ? 'est-actif' : ''}
                onClick={() => setOngletDroite('objet')}
              >
                Objet
              </button>
              <button
                className={ongletDroite === 'genes' ? 'est-actif' : ''}
                onClick={() => setOngletDroite('genes')}
              >
                Gènes
              </button>
            </div>

            {ongletDroite === 'sorts' && (
              <>
                <p className="panneau__aide">
                  {emplacement === null
                    ? 'Choisis un emplacement à gauche, puis un sort ici.'
                    : `Emplacement ${emplacement + 1} — clique sur un sort pour l’équiper.`}
                </p>
                {emplacement !== null && perso.sorts[emplacement] && (
                  <button
                    className="bouton bouton--fantome"
                    onClick={() => equiperSort(emplacement, null)}
                    disabled={occupe}
                  >
                    Vider l’emplacement
                  </button>
                )}
                <div className="atelier__sorts">
                  {sortsCompatibles.length === 0 && (
                    <Vide texte={`Aucun sort apprenable par ${espece.nom} dans ta collection.`} emoji="📜" />
                  )}
                  {sortsCompatibles.map((s) => (
                    <CarteSortPossede
                      key={s.uid}
                      sort={s}
                      selectionne={perso.sorts.includes(s.uid)}
                      onClick={() => emplacement !== null && equiperSort(emplacement, s.uid)}
                      compatible={emplacement !== null}
                    />
                  ))}
                </div>
                <details className="atelier__pool">
                  <summary>Sorts que {espece.nom} peut apprendre ({espece.pool.length})</summary>
                  <ul>
                    {espece.pool.map((id) => {
                      const d = SORTS_PAR_ID[id];
                      const possede = profil.sorts.some((s) => s.defId === id);
                      return (
                        <li key={id} className={possede ? 'est-possede' : ''}>
                          {INFO_ELEMENTS[d.element].emoji} {d.nom} {possede ? '✓' : '—'}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </>
            )}

            {ongletDroite === 'objet' && (
              <>
                <p className="panneau__aide">
                  Un seul objet tenu par personnage. Un même exemplaire ne peut pas être porté deux fois.
                </p>
                <div className="atelier__objets">
                  <button
                    className={`carte-objet ${!perso.itemId ? 'est-selectionne' : ''}`}
                    onClick={() => equiperObjet(null)}
                    disabled={occupe}
                  >
                    <span>🚫</span>
                    <div>
                      <strong>Aucun objet</strong>
                      <small>Rien dans les poches.</small>
                    </div>
                  </button>
                  {objetsDisponibles.length === 0 && (
                    <Vide texte="Aucun objet disponible. La boutique en vend." emoji="🎒" />
                  )}
                  {objetsDisponibles.map(({ id, restant }) => {
                    const item = ITEMS_PAR_ID[id];
                    if (!item) return null;
                    return (
                      <button
                        key={id}
                        className={`carte-objet rarete--${item.rarete.toLowerCase()} ${
                          perso.itemId === id ? 'est-selectionne' : ''
                        }`}
                        onClick={() => equiperObjet(id)}
                        disabled={occupe}
                      >
                        <span>{item.emoji}</span>
                        <div>
                          <strong>
                            {item.nom} <Rarete rarete={item.rarete} />
                          </strong>
                          <small>{item.texte}</small>
                          <em>
                            {Object.entries(item.bonus)
                              .map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`)
                              .join(' · ')}
                          </em>
                        </div>
                        {restant > 1 && <b className="carte-objet__stock">×{restant}</b>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {ongletDroite === 'genes' && (
              <>
                <p className="panneau__aide">
                  Les gènes (0 à {IV_MAX}) sont tirés à l’obtention du personnage et pèsent lourd à
                  haut niveau. Tu peux tout retirer au hasard, ou perfectionner une stat à la fois.
                </p>
                <div className="genes">
                  {TOUTES_STATS.map((k) => {
                    const iv = perso.ivs[k] ?? 0;
                    return (
                      <div key={k} className="gene">
                        <span className="gene__nom">{k.toUpperCase()}</span>
                        <div className="gene__barre">
                          <i
                            style={{ width: `${(iv / IV_MAX) * 100}%` }}
                            className={iv === IV_MAX ? 'est-parfait' : ''}
                          />
                        </div>
                        <span className="gene__valeur">
                          {iv}/{IV_MAX}
                        </span>
                        <button
                          className="bouton-mini"
                          disabled={iv === IV_MAX || occupe || profil.compte.eclats < COUT_HYPER_ENTRAINEMENT}
                          onClick={() => hyper(k)}
                          title={`Perfectionner pour ${COUT_HYPER_ENTRAINEMENT} éclats`}
                        >
                          ✨{COUT_HYPER_ENTRAINEMENT}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="bouton bouton--large"
                  onClick={rerollGenes}
                  disabled={occupe || profil.compte.credits < COUT_REROLL_GENES}
                >
                  🎲 Retirer tous les gènes — {COUT_REROLL_GENES} 💰
                </button>
                <p className="panneau__aide">
                  Nature actuelle : <strong>{NATURES_PAR_ID[perso.natureId]?.nom}</strong> —{' '}
                  {NATURES_PAR_ID[perso.natureId]?.texte}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
