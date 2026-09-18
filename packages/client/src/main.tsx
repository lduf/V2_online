import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Vitrine } from './ecrans/Vitrine';
import './styles.css';

/**
 * La vitrine du composant Carte vit à côté de l'App, pas dedans : elle doit
 * s'ouvrir sans compte, sans serveur et sans partie en cours, sinon elle ne
 * sert plus à juger une direction artistique. Un fragment d'URL plutôt qu'un
 * chemin, pour qu'elle marche aussi sur un `vite preview` ou un dossier
 * statique, sans réécriture côté hébergeur.
 */
const vitrine = window.location.hash.replace(/^#\/?/, '') === 'vitrine';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{vitrine ? <Vitrine /> : <App />}</StrictMode>,
);
