import { useEffect, useState } from 'react';
import { DIVISIONS, divisionPourElo } from '@arene/engine';
import { api, type LigneClassement } from '../api';
import { useApp } from '../store';
import { Chargement, Vide } from '../composants';

export function Classement() {
  const profil = useApp((s) => s.profil)!;
  const [donnees, setDonnees] = useState<{
    saison: { numero: number; debut: number };
    lignes: LigneClassement[];
    monRang: number | null;
  } | null>(null);

  useEffect(() => {
    api.classement().then(setDonnees).catch(() => undefined);
  }, []);

  if (!donnees) return <Chargement texte="Calcul du classement…" />;

  return (
    <div className="classement">
      <div className="panneau">
        <div className="atelier__entete">
          <h3>Classement · Saison {donnees.saison.numero}</h3>
          {donnees.monRang && <span className="etiquette">Ton rang : #{donnees.monRang}</span>}
        </div>

        <div className="divisions">
          {DIVISIONS.map((d) => (
            <div
              key={d.id}
              className={`division ${divisionPourElo(profil.compte.elo).id === d.id ? 'est-actif' : ''}`}
              style={{ '--c': d.couleur } as React.CSSProperties}
              title={`${d.seuil} points`}
            >
              <span>{d.emoji}</span>
              <strong>{d.nom}</strong>
              <small>{d.seuil}</small>
            </div>
          ))}
        </div>

        {donnees.lignes.length === 0 ? (
          <Vide texte="Personne n’a encore joué de match classé. Sois le premier." emoji="🏆" />
        ) : (
          <table className="table-classement">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueur</th>
                <th>Division</th>
                <th>Points</th>
                <th>V / D</th>
                <th>Série</th>
              </tr>
            </thead>
            <tbody>
              {donnees.lignes.map((l) => {
                const d = divisionPourElo(l.elo);
                return (
                  <tr key={l.id} className={l.id === profil.compte.id ? 'est-moi' : ''}>
                    <td>{l.rang}</td>
                    <td>{l.pseudo}</td>
                    <td style={{ color: d.couleur }}>
                      {d.emoji} {d.nom}
                    </td>
                    <td>
                      <strong>{l.elo}</strong>
                    </td>
                    <td>
                      <span className="est-positif">{l.victoires}</span> /{' '}
                      <span className="est-negatif">{l.defaites}</span>
                    </td>
                    <td>{l.serie > 1 ? `🔥 ${l.serie}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
