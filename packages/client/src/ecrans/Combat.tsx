import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ESPECES_PAR_ID,
  INFO_ELEMENTS,
  ITEMS_PAR_ID,
  multiplicateurElement,
  type BattleAction,
  type Cote,
  type EvtCombat,
  type SortPret,
  type UnitePublique,
} from '@arene/engine';
import { api, ErreurApi, type EtatCombatClient } from '../api';
import { useApp } from '../store';
import { jouer } from '../son';
import { Avatar, type Pose } from '../art/Avatar';
import {
  BarreEnergie,
  BarreVie,
  CoucheVfx,
  De,
  NombresFlottants,
  PucesPalier,
  PucesStatut,
  type Flottant,
  type VfxActif,
} from '../art/Effets';
import { appliquer, depuisVue, duree, etatAvant, type Affichage } from './moteurAffichage';

const VITESSES = [1, 1.6, 2.6] as const;

export function Combat({ combatId }: { combatId: string }) {
  const quitterCombat = useApp((s) => s.quitterCombat);
  const notifier = useApp((s) => s.notifier);

  const [etat, setEtat] = useState<EtatCombatClient | null>(null);
  const [affichage, setAffichage] = useState<Affichage | null>(null);
  const [message, setMessage] = useState<{ texte: string; ton: string } | null>(null);
  const [vfx, setVfx] = useState<VfxActif | null>(null);
  const [flottants, setFlottants] = useState<Flottant[]>([]);
  const [de, setDe] = useState<{ faces: number; resultat: number; parfait: boolean; cle: number } | null>(
    null,
  );
  const [pose, setPose] = useState<Record<string, Pose>>({});
  const [secousse, setSecousse] = useState(0);
  /** Arrêt sur image : fige la scène quelques dizaines de millisecondes à l'impact. */
  const [gel, setGel] = useState(false);
  const [flash, setFlash] = useState<'critique' | 'super' | 'fatal' | null>(null);
  const [fatal, setFatal] = useState(false);
  const [banniere, setBanniere] = useState<{ texte: string; cle: number } | null>(null);
  const [enLecture, setEnLecture] = useState(false);
  const [vitesse, setVitesse] = useState<number>(
    Number(localStorage.getItem('arene.vitesse') ?? 1.6),
  );
  const [ouvrirSwitch, setOuvrirSwitch] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [finAffichee, setFinAffichee] = useState(false);

  const file = useRef<EvtCombat[]>([]);
  const curseur = useRef(0);
  const minuteur = useRef<number | null>(null);
  const cleFlottant = useRef(0);
  const monte = useRef(true);
  const pompeActive = useRef(false);
  /** Millisecondes d'arrêt sur image à ajouter avant le prochain événement. */
  const hitstop = useRef(0);
  const etatRef = useRef<EtatCombatClient | null>(null);
  const vitesseRef = useRef(vitesse);
  vitesseRef.current = vitesse;

  /** Lit l'état courant via une ref : les callbacks ne doivent jamais être périmés. */
  const coteMoi = (): Cote => etatRef.current?.vue.moi ?? 0;

  const uidActif = (cote: Cote): string => {
    const v = etatRef.current?.vue;
    if (!v) return '';
    return v.equipes[cote].unites[v.equipes[cote].actif]?.uid ?? '';
  };

  const pousserFlottant = (texte: string, ton: string): void => {
    const cle = ++cleFlottant.current;
    setFlottants((f) => [
      ...f.slice(-5),
      { cle, texte, ton: ton as Flottant['ton'], decalage: Math.round((Math.random() - 0.5) * 70) },
    ]);
    setTimeout(() => monte.current && setFlottants((f) => f.filter((x) => x.cle !== cle)), 1300);
  };

  // ─────────────────────── Lecture de la file d'événements ───────────────────────

  const jouerProchain = useCallback(() => {
    if (!monte.current) return;
    const e = file.current.shift();
    if (!e) {
      pompeActive.current = false;
      minuteur.current = null;
      setEnLecture(false);
      setVfx(null);
      setDe(null);
      return;
    }
    pompeActive.current = true;
    setEnLecture(true);
    setAffichage((a) => (a ? appliquer(a, e) : a));

    switch (e.t) {
      case 'ROUND':
        setMessage({ texte: `Round ${e.numero}`, ton: 'round' });
        break;
      case 'TOUR':
        setPose((p) => ({ ...p, [e.uniteUid]: 'repos' }));
        jouer('tour');
        break;
      case 'MESSAGE':
        setMessage({ texte: e.texte, ton: e.ton ?? 'info' });
        break;
      case 'PASSIF':
        setMessage({ texte: `✦ ${e.nom}`, ton: 'bien' });
        break;
      case 'ACTION': {
        setMessage({ texte: e.libelle, ton: 'action' });
        setPose((p) => ({ ...p, [uidActif(e.cote)]: 'attaque' }));
        if (e.vfx && e.element) {
          setVfx({
            cle: Date.now() + Math.random(),
            spec: e.vfx,
            element: e.element,
            origine: e.cote === coteMoi() ? 0 : 1,
            versSoi: e.vfx.forme === 'aura',
          });
        }
        break;
      }
      case 'DE':
        setDe({ faces: e.faces, resultat: e.resultat, parfait: e.parfait, cle: Date.now() });
        jouer(e.parfait ? 'deParfait' : 'de');
        break;
      case 'RATE':
        pousserFlottant('RATÉ', 'info');
        jouer('faible');
        break;
      case 'DEGATS': {
        setPose((p) => ({ ...p, [e.uniteUid]: 'touche' }));
        const suffixe =
          e.efficacite === 'SUPER' ? ' ⚡' : e.efficacite === 'FAIBLE' ? ' …' : '';
        pousserFlottant(
          `-${e.montant}${suffixe}`,
          e.critique
            ? 'critique'
            : e.efficacite === 'SUPER'
              ? 'super'
              : e.efficacite === 'FAIBLE'
                ? 'faible'
                : 'degat',
        );
        jouer(
          e.critique
            ? 'critique'
            : e.efficacite === 'SUPER'
              ? 'super'
              : e.efficacite === 'FAIBLE'
                ? 'faible'
                : 'impact',
        );
        setSecousse(e.critique ? 18 : e.efficacite === 'SUPER' ? 14 : 8);
        setTimeout(() => monte.current && setSecousse(0), 260);

        // Arrêt sur image proportionnel à la violence du coup : c'est lui qui
        // donne du poids, bien plus que la secousse.
        const arret = e.critique ? 150 : e.efficacite === 'SUPER' ? 115 : e.efficacite === 'FAIBLE' ? 35 : 75;
        setGel(true);
        setTimeout(() => monte.current && setGel(false), arret);
        hitstop.current = arret;

        if (e.critique) {
          setFlash('critique');
          setTimeout(() => monte.current && setFlash(null), 260);
        } else if (e.efficacite === 'SUPER') {
          setFlash('super');
          setTimeout(() => monte.current && setFlash(null), 220);
        }
        if (e.efficacite === 'SUPER') {
          setBanniere({ texte: 'SUPER EFFICACE', cle: Date.now() });
          setTimeout(() => monte.current && setBanniere(null), 900);
        }
        break;
      }
      case 'SOIN':
        pousserFlottant(`+${e.montant}`, 'soin');
        jouer('soin');
        break;
      case 'BOUCLIER':
        jouer('bouclier');
        break;
      case 'ENERGIE':
        if (e.valeur > 0) jouer('energie');
        break;
      case 'STATUT':
        if (e.ajoute) jouer('statut');
        break;
      case 'KO':
        setPose((p) => ({ ...p, [e.uniteUid]: 'ko' }));
        jouer('ko');
        setSecousse(22);
        setTimeout(() => monte.current && setSecousse(0), 400);
        // Le coup qui met K.O. passe au ralenti, avec un resserrage sur la cible.
        setFatal(true);
        setFlash('fatal');
        setTimeout(() => monte.current && setFlash(null), 320);
        setTimeout(() => monte.current && setFatal(false), 1100);
        break;
      case 'SWITCH':
        setAffichage((a) => {
          if (!a) return a;
          const actifs = [...a.actifs] as [number, number];
          const i = etatRef.current?.vue.equipes[e.cote].unites.findIndex(
            (u) => u.uid === e.versUid,
          );
          if (i !== undefined && i >= 0) actifs[e.cote] = i;
          return { ...a, actifs };
        });
        jouer('clic');
        break;
      case 'FIN':
        jouer(e.vainqueur === coteMoi() ? 'victoire' : e.vainqueur === null ? 'tour' : 'defaite');
        break;
      default:
        break;
    }

    const pause = duree(e) / vitesseRef.current + hitstop.current;
    hitstop.current = 0;
    minuteur.current = window.setTimeout(jouerProchain, pause);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monCote: Cote = etat?.vue.moi ?? 0;

  function absorber(nouveau: EtatCombatClient, premier: boolean): void {
    setEtat(nouveau);
    etatRef.current = nouveau;
    const evts = nouveau.evenements;
    if (premier) {
      setAffichage(evts.length > 0 ? etatAvant(nouveau.vue, evts) : depuisVue(nouveau.vue));
    }
    curseur.current = nouveau.curseur;
    if (evts.length > 0) {
      file.current.push(...evts);
      if (!pompeActive.current) jouerProchain();
    } else if (!premier) {
      setAffichage((a) => a ?? depuisVue(nouveau.vue));
    }
  }

  // ─────────────────────── Chargement & interrogation ───────────────────────

  useEffect(() => {
    etatRef.current = etat;
  }, [etat]);

  useEffect(() => {
    monte.current = true;
    let premier = true;
    api
      .lireCombat(combatId, 0)
      .then((c) => {
        if (!monte.current) return;
        absorber(c, premier);
        premier = false;
      })
      .catch((e) => notifier(e instanceof ErreurApi ? e.message : 'Combat introuvable.', 'mal'));
    return () => {
      monte.current = false;
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = null;
      file.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatId]);

  // Interrogation périodique quand c'est à l'adversaire humain de jouer.
  useEffect(() => {
    if (!etat || etat.termine || etat.adversaire.bot) return;
    const v = etat.vue;
    if (v.auTour === v.moi) return;
    const t = window.setInterval(async () => {
      try {
        const c = await api.lireCombat(combatId, curseur.current);
        if (!monte.current) return;
        if (c.evenements.length > 0 || c.termine !== etat.termine) absorber(c, false);
      } catch {
        /* on réessaiera au prochain tick */
      }
    }, 1600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat?.vue.auTour, etat?.termine, combatId]);

  // L'écran de fin n'apparaît qu'une fois toutes les animations jouées.
  useEffect(() => {
    if (etat?.termine && !enLecture && !pompeActive.current && file.current.length === 0) {
      const t = setTimeout(() => monte.current && setFinAffichee(true), 450);
      return () => clearTimeout(t);
    }
  }, [etat?.termine, enLecture]);

  // ─────────────────────── Actions ───────────────────────

  const agir = async (action: BattleAction) => {
    if (!etat || envoi) return;
    setEnvoi(true);
    setOuvrirSwitch(false);
    jouer('clic');
    try {
      const c = await api.agir(combatId, action, curseur.current);
      if (monte.current) absorber(c, false);
    } catch (e) {
      notifier(e instanceof ErreurApi ? e.message : 'Action impossible.', 'mal');
    } finally {
      if (monte.current) setEnvoi(false);
    }
  };

  const changerVitesse = () => {
    const i = VITESSES.indexOf(vitesse as (typeof VITESSES)[number]);
    const v = VITESSES[(i + 1) % VITESSES.length];
    setVitesse(v);
    localStorage.setItem('arene.vitesse', String(v));
  };

  if (!etat || !affichage) {
    return (
      <div className="combat combat--chargement">
        <div className="chargeur" />
        <p>Préparation de l’arène…</p>
      </div>
    );
  }

  const vue = etat.vue;
  const moi = vue.equipes[monCote];
  const adv = vue.equipes[monCote === 0 ? 1 : 0];
  const monActif = moi.unites[affichage.actifs[monCote]] ?? moi.unites[moi.actif];
  const sonActif = adv.unites[affichage.actifs[monCote === 0 ? 1 : 0]] ?? adv.unites[adv.actif];
  const aMoi = vue.auTour === monCote && !enLecture && !etat.termine;
  const doitRemplacer = vue.remplacement === monCote;

  return (
    <div
      className={[
        'combat',
        secousse > 0 ? 'combat--secoue' : '',
        gel ? 'combat--gel' : '',
        fatal ? 'combat--fatal' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--secousse': `${secousse}px` } as React.CSSProperties}
    >
      {flash && <div className={`flash flash--${flash}`} aria-hidden />}
      {banniere && (
        <div key={banniere.cle} className="banniere-efficacite" aria-hidden>
          {banniere.texte}
        </div>
      )}
      <ArenePlateau
        monActif={monActif}
        sonActif={sonActif}
        affichage={affichage}
        pose={pose}
        vfx={vfx}
        de={de}
        flottants={flottants}
        message={message}
        equipeMoi={moi.unites}
        equipeAdv={adv.unites}
        nomMoi={moi.nom}
        nomAdv={etat.adversaire.pseudo}
        eloAdv={etat.adversaire.elo}
        botAdv={etat.adversaire.bot}
        round={vue.round}
        limiteRounds={vue.limiteRounds}
        classe={etat.classe}
      />

      <div className="combat__barre">
        <button className="bouton bouton--fantome" onClick={changerVitesse} title="Vitesse d’animation">
          ⏩ ×{vitesse}
        </button>
        <span className="combat__tour-indic">
          {etat.termine
            ? 'Combat terminé'
            : aMoi
              ? doitRemplacer
                ? 'Choisis ton remplaçant'
                : 'À toi de jouer'
              : enLecture
                ? '…'
                : `Au tour de ${etat.adversaire.pseudo}`}
        </span>
        {!etat.termine && (
          <button
            className="bouton bouton--fantome bouton--danger"
            onClick={() => {
              if (confirm('Abandonner ce combat ? La défaite sera comptabilisée.')) {
                api
                  .abandonner(combatId, curseur.current)
                  .then((c) => monte.current && absorber(c, false))
                  .catch(() => notifier('Abandon impossible.', 'mal'));
              }
            }}
          >
            Abandonner
          </button>
        )}
      </div>

      {!etat.termine && (
        <PanneauActions
          unite={monActif}
          affichage={affichage}
          actif={aMoi}
          doitRemplacer={doitRemplacer}
          equipe={moi.unites}
          indexActif={affichage.actifs[monCote]}
          cibleElement={sonActif.element}
          ouvrirSwitch={ouvrirSwitch}
          setOuvrirSwitch={setOuvrirSwitch}
          onAction={agir}
          envoi={envoi}
        />
      )}

      {finAffichee && etat.termine && (
        <EcranFin etat={etat} monCote={monCote} onFermer={() => void quitterCombat()} />
      )}
    </div>
  );
}

// ───────────────────────────── Plateau ─────────────────────────────

function ArenePlateau(props: {
  monActif: UnitePublique;
  sonActif: UnitePublique;
  affichage: Affichage;
  pose: Record<string, Pose>;
  vfx: VfxActif | null;
  de: { faces: number; resultat: number; parfait: boolean; cle: number } | null;
  flottants: Flottant[];
  message: { texte: string; ton: string } | null;
  equipeMoi: UnitePublique[];
  equipeAdv: UnitePublique[];
  nomMoi: string;
  nomAdv: string;
  eloAdv: number;
  botAdv: boolean;
  round: number;
  limiteRounds: number;
  classe: boolean;
}) {
  const {
    monActif,
    sonActif,
    affichage,
    pose,
    vfx,
    de,
    flottants,
    message,
    equipeMoi,
    equipeAdv,
    nomAdv,
    eloAdv,
    botAdv,
    round,
  } = props;

  const dMoi = affichage.unites[monActif.uid];
  const dAdv = affichage.unites[sonActif.uid];

  return (
    <div className="arene">
      <div className="arene__ciel" />
      <div className="arene__sol" />

      <div className="arene__entete">
        <span className="arene__round">Round {round}</span>
        {props.classe && <span className="etiquette etiquette--classe">Classé</span>}
      </div>

      {/* Adversaire */}
      <div className="combattant combattant--adverse">
        <FicheCombattant
          unite={sonActif}
          d={dAdv}
          nomJoueur={nomAdv}
          info={botAdv ? 'IA' : `${eloAdv} pts`}
          equipe={equipeAdv}
          alignement="droite"
        />
        <div className="combattant__scene">
          <Avatar
            art={sonActif.art}
            element={sonActif.element}
            taille={152}
            pose={dAdv?.ko ? 'ko' : (pose[sonActif.uid] ?? 'repos')}
            miroir
            avecFond={false}
            className={`sprite ${dAdv?.ko ? 'sprite--ko' : ''}`}
          />
        </div>
      </div>

      {/* Zone centrale : dé + bandeau */}
      <div className="arene__centre">
        {de && <De faces={de.faces} resultat={de.resultat} parfait={de.parfait} cle={de.cle} />}
        {message && (
          <div key={message.texte + message.ton} className={`bandeau bandeau--${message.ton}`}>
            {message.texte}
          </div>
        )}
      </div>

      {/* Joueur */}
      <div className="combattant combattant--moi">
        <div className="combattant__scene">
          <Avatar
            art={monActif.art}
            element={monActif.element}
            taille={182}
            pose={dMoi?.ko ? 'ko' : (pose[monActif.uid] ?? 'repos')}
            avecFond={false}
            className={`sprite ${dMoi?.ko ? 'sprite--ko' : ''}`}
          />
        </div>
        <FicheCombattant
          unite={monActif}
          d={dMoi}
          nomJoueur="Toi"
          info={`Niv. ${monActif.niveau}`}
          equipe={equipeMoi}
          alignement="gauche"
          avecEnergie
        />
      </div>

      <CoucheVfx vfx={vfx} />
      <NombresFlottants liste={flottants} />
    </div>
  );
}

function FicheCombattant({
  unite,
  d,
  nomJoueur,
  info,
  equipe,
  alignement,
  avecEnergie,
}: {
  unite: UnitePublique;
  d?: { pv: number; pvMax: number; bouclier: number; energie: number; statuts: any[]; paliers: any; ko: boolean };
  nomJoueur: string;
  info: string;
  equipe: UnitePublique[];
  alignement: 'gauche' | 'droite';
  avecEnergie?: boolean;
}) {
  const espece = ESPECES_PAR_ID[unite.especeId];
  const el = INFO_ELEMENTS[unite.element];
  return (
    <div className={`fiche fiche--${alignement}`}>
      <div className="fiche__ligne1">
        <span className="fiche__nom">{unite.nom}</span>
        <span className="fiche__niveau">N.{unite.niveau}</span>
        <span className="fiche__element" style={{ background: el.couleur }} title={el.nom}>
          {el.emoji}
        </span>
      </div>
      <div className="fiche__joueur">
        {nomJoueur} · {info} · {espece?.titre}
      </div>
      <BarreVie pv={d?.pv ?? unite.pv} pvMax={unite.pvMax} bouclier={d?.bouclier ?? 0} />
      {avecEnergie && <BarreEnergie energie={d?.energie ?? unite.energie} max={unite.energieMax} />}
      <PucesStatut statuts={(d?.statuts ?? unite.statuts) as never} />
      <PucesPalier paliers={(d?.paliers ?? unite.paliers) as never} />
      <div className="fiche__equipe">
        {equipe.map((u) => (
          <span
            key={u.uid}
            className={`pastille ${u.uid === unite.uid ? 'est-actif' : ''} ${u.ko ? 'est-ko' : ''}`}
            title={`${u.nom}${u.ko ? ' — K.O.' : ''}`}
          >
            {ESPECES_PAR_ID[u.especeId]?.art.embleme ?? '•'}
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── Panneau d'actions ─────────────────────────────

function PanneauActions({
  unite,
  affichage,
  actif,
  doitRemplacer,
  equipe,
  indexActif,
  cibleElement,
  ouvrirSwitch,
  setOuvrirSwitch,
  onAction,
  envoi,
}: {
  unite: UnitePublique;
  affichage: Affichage;
  actif: boolean;
  doitRemplacer: boolean;
  equipe: UnitePublique[];
  indexActif: number;
  cibleElement: string;
  ouvrirSwitch: boolean;
  setOuvrirSwitch: (v: boolean) => void;
  onAction: (a: BattleAction) => void;
  envoi: boolean;
}) {
  const d = affichage.unites[unite.uid];
  const energie = d?.energie ?? unite.energie;
  const sorts = unite.sorts ?? [];
  const recharges = unite.recharges ?? [];

  if (doitRemplacer || ouvrirSwitch) {
    return (
      <div className="actions actions--switch">
        <div className="actions__titre">
          {doitRemplacer ? 'Ton combattant est K.O. — envoie le suivant' : 'Changer de combattant'}
        </div>
        <div className="actions__grille actions__grille--switch">
          {equipe.map((u, i) => (
            <button
              key={u.uid}
              className="carte-switch"
              disabled={u.ko || i === indexActif || !actif || envoi}
              onClick={() => onAction({ type: 'SWITCH', index: i })}
            >
              <Avatar art={u.art} element={u.element} taille={52} avecFond={false} pose="portrait" />
              <div className="carte-switch__info">
                <strong>{u.nom}</strong>
                <BarreVie
                  pv={affichage.unites[u.uid]?.pv ?? u.pv}
                  pvMax={u.pvMax}
                  compact
                />
                <small>
                  {INFO_ELEMENTS[u.element].emoji} N.{u.niveau}
                  {u.ko ? ' · K.O.' : i === indexActif ? ' · en jeu' : ''}
                </small>
              </div>
            </button>
          ))}
        </div>
        {!doitRemplacer && (
          <button className="bouton bouton--fantome" onClick={() => setOuvrirSwitch(false)}>
            Retour
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`actions ${actif ? '' : 'actions--inactives'}`}>
      <div className="actions__grille">
        {sorts.map((s, i) => (
          <CarteSort
            key={s.uid + i}
            sort={s}
            recharge={recharges[i] ?? 0}
            energie={energie}
            cibleElement={cibleElement}
            elementLanceur={unite.element}
            disponible={actif && !envoi}
            onClick={() => onAction({ type: 'SORT', index: i })}
          />
        ))}
        {sorts.length === 0 && (
          <div className="actions__vide">Aucun sort équipé — passe par l’Atelier.</div>
        )}
      </div>
      <div className="actions__secondaires">
        <button className="bouton bouton--action" disabled={!actif || envoi} onClick={() => onAction({ type: 'ATTAQUE' })}>
          👊 Attaque <small>+30 ⚡</small>
        </button>
        <button className="bouton bouton--action" disabled={!actif || envoi} onClick={() => onAction({ type: 'GARDE' })}>
          🛡 Garde <small>+34 ⚡, dégâts −40 %</small>
        </button>
        <button
          className="bouton bouton--action"
          disabled={!actif || envoi || equipe.filter((u, i) => !u.ko && i !== indexActif).length === 0}
          onClick={() => setOuvrirSwitch(true)}
        >
          🔄 Changer
        </button>
      </div>
    </div>
  );
}

function CarteSort({
  sort,
  recharge,
  energie,
  cibleElement,
  elementLanceur,
  disponible,
  onClick,
}: {
  sort: SortPret;
  recharge: number;
  energie: number;
  cibleElement: string;
  elementLanceur: string;
  disponible: boolean;
  onClick: () => void;
}) {
  const el = INFO_ELEMENTS[sort.def.element];
  const assezEnergie = energie >= sort.cout;
  const pret = recharge === 0 && assezEnergie && disponible;
  const mult = multiplicateurElement(sort.def.element, cibleElement as never);
  const stab = sort.def.element === elementLanceur;

  return (
    <button
      className={`carte-sort ${pret ? '' : 'est-bloque'} rarete--${sort.def.rarete.toLowerCase()}`}
      style={{ '--el': el.couleur, '--el-clair': el.couleurClaire } as React.CSSProperties}
      disabled={!pret}
      onClick={onClick}
      title={sort.def.texte}
    >
      <div className="carte-sort__entete">
        <span className="carte-sort__element">{el.emoji}</span>
        <span className="carte-sort__nom">{sort.def.nom}</span>
        <span className={`carte-sort__grade grade--${sort.grade}`}>{sort.grade}</span>
      </div>
      <div className="carte-sort__stats">
        {sort.puissance > 0 && <span title="Puissance">⚔ {sort.puissance}</span>}
        {sort.soin > 0 && <span title="Soin">✚ {sort.soin}</span>}
        {sort.soin < 0 && <span title="Contrecoup" className="est-negatif">✚ {sort.soin}</span>}
        <span title="Dé">🎲 d{sort.def.de}</span>
        <span className={assezEnergie ? '' : 'est-negatif'} title="Coût en énergie">
          ⚡ {sort.cout}
        </span>
      </div>
      <div className="carte-sort__bas">
        {mult > 1 && <em className="est-super">Super efficace</em>}
        {mult < 1 && <em className="est-faible">Peu efficace</em>}
        {stab && <em className="est-stab">Affinité</em>}
        {recharge > 0 && <em className="est-recharge">Recharge {recharge}</em>}
        {sort.def.recharge > 0 && recharge === 0 && <em className="est-info">CD {sort.def.recharge}</em>}
      </div>
    </button>
  );
}

// ───────────────────────────── Écran de fin ─────────────────────────────

function EcranFin({
  etat,
  monCote,
  onFermer,
}: {
  etat: EtatCombatClient;
  monCote: Cote;
  onFermer: () => void;
}) {
  const r = etat.resultats;
  const victoire = etat.vue.vainqueur === monCote;
  const nul = etat.vue.vainqueur === null;

  return (
    <div className="fin">
      <div className={`fin__carte ${victoire ? 'est-victoire' : nul ? 'est-nul' : 'est-defaite'}`}>
        {victoire && (
          <div className="confettis" aria-hidden>
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
        )}
        <h2>{victoire ? 'Victoire !' : nul ? 'Match nul' : 'Défaite'}</h2>
        <p className="fin__motif">{etat.vue.motifFin}</p>

        {r && (
          <div className="fin__recompenses">
            <div className="recompense">
              <span>💰</span>
              <strong>+{r.credits}</strong>
              <small>crédits</small>
            </div>
            <div className="recompense">
              <span>✨</span>
              <strong>+{r.eclats}</strong>
              <small>éclats</small>
            </div>
            <div className="recompense">
              <span>📈</span>
              <strong>+{r.xp}</strong>
              <small>XP</small>
            </div>
            {etat.classe && (
              <div className={`recompense ${r.deltaElo >= 0 ? 'est-positif' : 'est-negatif'}`}>
                <span>🏆</span>
                <strong>
                  {r.deltaElo >= 0 ? '+' : ''}
                  {r.deltaElo}
                </strong>
                <small>{r.nouveauElo} pts</small>
              </div>
            )}
          </div>
        )}

        {r && r.monteesNiveau.length > 0 && (
          <div className="fin__montees">
            {r.monteesNiveau.map((m) => (
              <div key={m.uid} className="montee">
                ⬆️ <strong>{ESPECES_PAR_ID[m.nom]?.nom ?? m.nom}</strong> passe niveau {m.niveau} !
              </div>
            ))}
          </div>
        )}

        <button className="bouton bouton--primaire bouton--large" onClick={onFermer}>
          Retour au hub
        </button>
      </div>
    </div>
  );
}
