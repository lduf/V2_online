# Mise en ligne

## Vercel — offre gratuite (Hobby)

Le dépôt est prêt : `vercel.json` sert le client en statique et route `/api/*`
vers une fonction serverless unique.

Deux choses ne survivent pas au serverless, et sont déjà prises en compte :

- **le disque est en lecture seule** — d'où une base Postgres au lieu de SQLite ;
- **rien ne tourne entre deux requêtes** — d'où l'absence de WebSocket, de
  minuteur de fond et de file d'attente en mémoire : les combats, la file
  classée et les salons vivent en base.

### 1. Importer le projet

Sur [vercel.com/new](https://vercel.com/new), choisis le dépôt
`lduf/v2_online`. Vercel lit `vercel.json`, il n'y a **rien à configurer** dans
l'écran de build :

| Réglage | Valeur (déjà dans `vercel.json`) |
| --- | --- |
| Build Command | `npm run vercel-build` |
| Output Directory | `packages/client/dist` |
| Install Command | `npm install` |

### 2. Brancher une base Postgres

Dans le projet Vercel : **Storage → Create Database → Neon** (ou n'importe quel
fournisseur Postgres). L'offre gratuite suffit largement.

L'intégration injecte automatiquement `DATABASE_URL` et `POSTGRES_URL` dans les
variables d'environnement. Le serveur détecte l'une ou l'autre et bascule sur
Postgres ; les tables sont créées au premier démarrage.

> Sans base Postgres, le déploiement démarre mais toute écriture échoue :
> le disque d'une fonction serverless est jetable.

### 3. Définir le secret de session

**Settings → Environment Variables**, pour les trois environnements :

| Nom | Valeur |
| --- | --- |
| `ARENE_SECRET` | une chaîne aléatoire longue |

Génère-la avec :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

C'est la seule variable réellement obligatoire : sans elle, un secret éphémère
est tiré à chaque démarrage à froid et **les joueurs sont déconnectés en
permanence**.

Optionnel : `ARENE_ORIGINE` avec l'URL du site pour restreindre le CORS
(le client et l'API partagent la même origine, donc `*` n'est pas gênant), et
`ARENE_DEBUT_SAISON` pour décaler le calendrier des saisons.

### 4. Déployer

Un `git push` sur la branche de production déclenche le déploiement. Vérifie
ensuite :

```bash
curl https://<ton-projet>.vercel.app/api/sante
# {"ok":true,"base":"postgres","version":"2.0.0",...}
```

Si `base` vaut `sqlite`, la variable Postgres n'est pas visible par la fonction.

### Ce que ça donne sur l'offre gratuite

- Fonction limitée à 10 s par requête : une action de combat en prend moins de
  100 ms, IA comprise.
- Les combats en ligne interrogent le serveur toutes les 1,6 s **seulement
  quand c'est à l'adversaire de jouer**. Un combat solo ne fait aucune
  interrogation : le bot joue dans la même réponse HTTP.
- Aucun asset à servir : le bundle fait moins de 100 ko compressé.

---

## Auto-hébergement

N'importe quelle machine avec Node 20+ :

```bash
git clone <dépôt> && cd v2_online
npm install
npm run build
ARENE_SECRET=<chaîne aléatoire> PORT=8080 node packages/server/dist/index.js
```

Le même processus sert l'API et le client, et crée une base SQLite dans
`donnees/`. Pense à sauvegarder ce dossier.

Pour passer sur Postgres, il suffit de définir `DATABASE_URL`.
