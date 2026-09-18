# ⚔️ Arène V2

Un projet de première année en Java, réécrit dix ans plus tard en jeu de combat
au tour par tour jouable dans un navigateur : solo contre l'IA, classé en ligne,
matchs privés entre amis, construction d'équipe et progression.

Les sources d'origine sont conservées telles quelles dans [`legacy/`](legacy/) —
c'est de là que viennent les dés, les sorts et l'humour de vie étudiante.

---

## Le jeu en deux minutes

Tu diriges une **équipe de 3 personnages**. Un seul combat à la fois sur le
terrain, comme dans un Pokémon : tu peux changer de combattant, mais ça coûte
un tour.

**Un personnage n'a pas de type.** Ni élément, ni faiblesse écrite d'avance :
ce sont les cartes qu'on lui équipe qui décident de ce qu'il encaisse et de ce
qu'il fait passer. La teinte d'un sort ne sert qu'à choisir sa couleur et son
animation.

**Le dé, hérité de la V1, est le cœur du système.** Chaque sort a un nombre de
faces. Peu de faces = résultat fiable ; beaucoup de faces = loterie. Le jet
module les dégâts entre 55 % et 100 %… et **tomber sur la face maximale
déclenche un coup critique**. Le « Balayage de l'Enfer » a un dé à 66 faces :
quand il passe, il efface.

À cela s'ajoutent :

- **trois oppositions défensives**, toutes lisibles sur les cartes et aucune
  écrite d'avance sur un personnage : l'**armure** retire un montant fixe à
  chaque coup et lamine les sorts à coups multiples ; l'**amorti** plafonne ce
  qu'un seul coup peut retirer et désamorce les bombes ; l'**immunité** annule
  les statuts. Il n'y a pas de table des types dans ce jeu ;
- **l'énergie** : 22 points par tour, chaque sort a un coût, l'attaque de base
  et la garde en régénèrent — impossible de spammer son meilleur sort ;
- **les statuts** : brûlure, poison, gel, étourdissement, régénération, rage,
  malédiction, saignement, confusion, concentration ;
- **les paliers de stats** façon Pokémon (−6 à +6) ;
- **un passif unique par personnage** et **un objet tenu** ;
- **une escalade** à partir du round 18 : les dégâts montent, les soins
  faiblissent. Aucun combat ne s'enlise.

### Les gènes (IV)

Chaque personnage **et chaque sort** possède ses propres gènes tirés à
l'obtention, de 0 à 31 par caractéristique. Deux « Boule de Feu » ne se valent
pas. S'ajoutent les **natures** (+10 % sur une stat, −10 % sur une autre) et
les niveaux (1 à 50).

On peut retirer tous les gènes d'un personnage contre des crédits, ou en
perfectionner un seul contre de l'essence.

### Les talents

Aux **niveaux 25 et 50**, chaque personnage ouvre un choix entre deux talents.
Ils dépendent du rôle — un tank arbitre entre renvoyer les dégâts et entrer
avec un bouclier, un mage entre le critique et un plancher sur son dé — et les
deux options d'un palier tirent dans des directions opposées. Vingt-quatre
talents en tout, calibrés par simulation : aucune paire ne dépasse 63 / 37.

### L'essence

Un doublon dont on ne fera rien se **dissout en essence**. L'essence perfectionne
un gène, change un talent déjà choisi, et alimente la **Forge** : le sort qu'on
désigne, sans passer par le hasard. Ses gènes sortent avec un plancher de 14/31
— corrects, jamais parfaits, pour qu'un exemplaire forgé ne remplace pas un coup
de chance en booster.

### Ce qu'un personnage peut apprendre

Chaque espèce a sa **liste thématique** de sorts, et tout sort **ouvert à son
rôle** s'y ajoute. La liste garde l'identité du personnage, le rôle garantit
qu'aucune carte tirée en booster ne reste inutilisable par personne.

### La boucle

Combattre → gagner des **crédits**, des **éclats** et de l'**XP** → acheter des
personnages, des sorts et des objets à la boutique du jour ou les invoquer →
dissoudre les doublons en **essence** → affiner son équipe dans l'Atelier →
remonter le classement de la saison.

La défaite rapporte aussi : environ 40 % des gains. Une partie n'est jamais
perdue pour rien.

### Le classement

ELO avec facteur K dégressif, huit divisions (Bois → Légende), saisons de quatre
semaines. Quand personne n'est en file après 18 secondes, tu affrontes
**l'équipe réelle d'un autre joueur, pilotée par l'IA** : le ladder reste
jouable même à trois joueurs connectés, et les points comptent.

---

## Architecture

```
packages/
  engine/   moteur de jeu en TypeScript, déterministe, sans dépendance
  server/   API REST (Express) + persistance SQL
  client/   interface React + Vite
legacy/     le projet Java de 2016, intact
api/        point d'entrée serverless (Vercel)
```

**Le moteur est partagé.** Le serveur l'utilise pour arbitrer les combats, le
client pour afficher les mêmes données (noms, puissances, table des éléments)
sans les dupliquer. Il est déterministe : à graine égale, un combat se rejoue à
l'identique, ce qui rend l'IA simulable et les bugs reproductibles.

**Le serveur fait autorité.** Le client n'envoie que des intentions
(`{type:'SORT', index:2}`) ; toute la résolution a lieu côté serveur, qui
renvoie un flux d'événements horodatés. Le client se contente de rejouer ce
flux en animations.

**Aucun WebSocket.** Le jeu est au tour par tour : les combats en ligne
fonctionnent par interrogation périodique (1,6 s). C'est suffisant, et ça permet
un hébergement serverless gratuit.

**Deux pilotes SQL interchangeables** derrière la même interface : SQLite en
local, Postgres en déploiement. Le SQL est écrit une seule fois.

**Presque aucun asset.** Les bruitages sont synthétisés par la Web Audio API,
et chaque personnage possède un avatar SVG généré depuis sa fiche d'art
(couleurs, silhouette, accessoire). Les cartes peuvent afficher à la place une
illustration peinte, quand elle existe : `outils/art/generer.mjs` les produit
hors ligne via un endpoint compatible OpenAI, les ramène en WebP 512² — la
plus grande carte fait 268 px de large — et les recense dans un manifeste. Un
personnage sans illustration retombe sur son avatar SVG, donc le jeu reste
complet avec zéro image commitée et la direction artistique reste réversible.

La génération lit `ARENE_IMAGE_URL`, `ARENE_IMAGE_KEY` et `ARENE_IMAGE_MODEL`.
La production, elle, ne connaît ni clé ni latence : elle ne sert que le
résultat.

---

## Démarrer en local

```bash
npm install
npm run build        # construit le moteur, le client et le serveur
npm start            # http://localhost:3000
```

En développement, avec rechargement à chaud :

```bash
npm run dev          # client sur :5173, API sur :3000
```

La base SQLite est créée automatiquement dans `donnees/`. Crée un compte : tu
reçois 4 personnages, 16 sorts, 2 500 crédits et 60 éclats.

### Autres commandes

| Commande | Effet |
| --- | --- |
| `npm run typecheck` | vérifie les trois paquets |
| `npm run build:engine` | reconstruit uniquement le moteur |

### Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3000` | port d'écoute |
| `ARENE_SECRET` | généré et gardé dans `donnees/.secret` | signature des jetons de session |
| `DATABASE_URL` / `POSTGRES_URL` | — | bascule sur Postgres si défini |
| `ARENE_DATA_DIR` | `./donnees` | emplacement de la base SQLite |
| `ARENE_ORIGINE` | `*` | origine autorisée (CORS) |
| `ARENE_DEBUT_SAISON` | 5 janvier 2026 | date de référence des saisons |

---

## Déploiement

Voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md) pour la mise en ligne sur Vercel
(offre gratuite) et pour l'auto-hébergement.

---

## Licence

MIT — voir [`LICENSE`](LICENSE).
