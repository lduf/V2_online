# Arène V2 — note de conception

Document de travail. Ce qui va bien, ce qui ne va pas, et ce qu'on ajoute.

---

## 1. Diagnostic sans complaisance

Le jeu tourne, il est équilibré, il est jouable en ligne. Mais si je le pose
devant quelqu'un aujourd'hui, voilà ce qui cloche.

**Rien ne s'ouvre.** L'invocation affiche une grille de cartes instantanément.
C'est le geste le plus addictif du genre — l'ouverture de booster — et il est
raté : aucune montée de tension, aucun suspense, aucune récompense
émotionnelle. On clique, on lit, on passe.

**La rareté ne se voit pas.** Une légendaire et une commune se ressemblent à
99 %. Un liseré de couleur et un mot en petit. Rien ne provoque le réflexe de
capture d'écran.

**Aucune raison de revenir demain.** La boutique tourne toutes les 24 h mais
rien ne le signale, rien ne récompense l'assiduité, aucun objectif court terme.
Une session se termine sans rendez-vous.

**Les coups ne pèsent pas.** Les dégâts s'appliquent proprement mais sans
impact : pas d'arrêt sur image, pas de flash, pas de ralenti sur le coup fatal.
C'est lisible et c'est plat.

**Un seul mode a de la profondeur.** Le solo, c'est du PvP contre un bot. Aucune
variation de règles, aucune montée d'enjeu à l'intérieur d'une session, rien à
raconter après.

**Les doublons ne servent à rien.** On accumule trois « Limousin » identiques
sans aucun usage.

**Le niveau 50 est un mur.** Une fois atteint, plus aucune décision de build.

---

## 2. Les mécaniques

Cinq piliers : **Ouvrir**, **Posséder**, **Frapper**, **Revenir**, **Creuser**.

### Pilier 1 — Ouvrir

> Le geste doit durer dix secondes et faire monter la tension.

**Boosters à révélation.** Un booster contient 5 cartes révélées une par une.
Dos de carte → retournement 3D → la lueur monte → révélation. La carte la plus
rare passe en dernier, toujours.

**Le pré-tell.** Avant même le retournement, le dos de la carte s'illumine de
la couleur de la rareté qui va sortir. C'est le cœur du système : on sait
qu'une épique arrive une seconde avant de la voir, et cette seconde vaut tout
le reste.

**L'aura de paquet.** Si le booster contient une légendaire, l'enveloppe entière
est dorée avant l'ouverture. On le sait en le recevant. L'attente devient un
plaisir au lieu d'une friction.

**Respect du temps.** Bouton « tout révéler » permanent. Un joueur qui ouvre son
dixième booster de la journée ne doit pas subir la cérémonie.

**Trois familles de boosters :**

| Booster | Coût | Contenu |
| --- | --- | --- |
| Pochette du Campus | crédits | 5 cartes, taux standard |
| Coffret des Anciens | éclats | 5 cartes, aucun commun, gènes déjà affûtés |
| Booster thématique | crédits | 5 cartes d'un élément, tourne chaque semaine |

### Pilier 2 — Posséder

> Une carte rare doit se regarder.

**Le composant Carte.** Un vrai objet visuel réutilisé partout : collection,
révélation, boutique, atelier. Cadre selon la rareté, panneau d'art teinté par
l'élément, bandeau de stats.

**Le foil.** À partir de rare, un voile holographique réagit au pointeur. La
carte s'incline en 3D, la lumière balaie la surface. C'est ce détail qui fait
qu'on bouge la souris sur une carte sans raison.

**Les Chromatiques (shiny).** 1 sur 128 à l'obtention. Palette alternative,
particules scintillantes, ✨ devant le nom. **Strictement cosmétique** — aucun
bonus de stat. Un jeu où le prestige donne de la puissance devient un jeu où
la chance décide des classements ; ici la chance décide seulement de qui a la
plus belle collection.

**Les Prismes.** L'équivalent pour les sorts : cadre alternatif, foil animé.

**Le Sceau Parfait.** Un personnage dont les sept gènes sortent à 31 reçoit un
sceau. C'est arithmétiquement quasi impossible au tirage naturel, donc le sceau
raconte surtout une histoire de hasard ou d'acharnement au perfectionnement.

### Pilier 3 — Frapper

> Un coup critique doit se sentir dans les mains.

**L'arrêt sur image.** Le monde se fige 80 ms à l'impact. C'est la technique la
plus rentable du jeu vidéo : trois lignes de code, et chaque coup devient lourd.

**Le flash.** Coup critique → l'écran blanchit une image. Super efficace →
flash coloré de l'élément.

**Le ralenti fatal.** Le coup qui met K.O. passe en vitesse réduite, avec un
zoom sur la cible.

**La dislocation.** Un personnage K.O. ne bascule plus : il se fissure et se
disperse.

**Le bandeau d'efficacité.** « SUPER EFFICACE » traverse l'écran sur les coups à
×1,5, comme dans les jeux dont ça vient.

**L'aberration chromatique** sur les critiques, brève, à la limite du
subliminal.

### Pilier 4 — Revenir

> Il faut un rendez-vous, et une raison de ne pas sauter un jour.

**Contrats journaliers.** Trois objectifs tirés chaque jour, orientés vers la
variété de jeu plutôt que vers le volume : gagner avec un personnage Nature,
réussir trois dés parfaits, gagner sans changer de combattant, infliger un coup
à plus de 200. Ça pousse à sortir de son équipe habituelle.

**Récompense de connexion.** Sept jours en cycle, le septième vaut nettement
plus. Casser la série coûte, mais ne remet pas à zéro les acquis.

**Jamais d'énergie.** Aucun système ne limitera le nombre de parties. Un jeu
gratuit qui empêche de jouer est un jeu qu'on désinstalle.

### Pilier 5 — Creuser

> Il faut un mode où une session raconte quelque chose.

**La Tour des Rattrapages.** Un roguelike en dix étages.

- Les points de vie **ne se régénèrent pas** entre les étages.
- Après chaque étage, choix entre **trois bonus** : soin, statistique permanente
  pour la run, sort temporaire, objet.
- La difficulté monte étage par étage ; le dixième est un boss avec une règle
  propre.
- Une défaite termine la run. Les récompenses sont proportionnelles à l'étage
  atteint.
- Une tentative gratuite par jour, les suivantes coûtent des crédits.

C'est le mode qui donne envie de lancer le jeu sans raison : chaque run est une
histoire courte, avec des décisions qui comptent et une fin nette.

**L'essence.** Les doublons se dissolvent en essence. L'essence sert à
perfectionner les gènes et à fabriquer un sort précis plutôt que de l'espérer.
Ça transforme la déception du doublon en progression.

**Les talents.** Aux niveaux 25 et 50, chaque personnage choisit entre deux
talents. Deux Maxence de niveau 50 peuvent enfin être différents.

*Implémenté ainsi :* les talents sont attachés au **rôle**, pas à l'espèce —
vingt-quatre définitions au lieu de deux cents, et le rôle gagne une identité
lisible au-delà de la répartition des stats. Les deux options d'un palier
tirent volontairement dans des directions opposées (survivre ou frapper plus
fort, un plancher sur le dé ou du critique). Chaque paire a été passée au
miroir sur 120 combats simulés et retouchée jusqu'à tenir dans 43–63 % : trois
paires ont dû être rééquilibrées, la survie du bruiser étant partie à 71 % et
les épines du tank à 32 %. Le premier choix de chaque palier est gratuit ; se
raviser coûte 150 d'essence, ce qui donne à l'essence une seconde destination.

---

## 3. Priorités

L'ordre est choisi pour que chaque bloc soit utile même si le suivant n'arrive
jamais.

| # | Bloc | Pourquoi maintenant |
| --- | --- | --- |
| 1 | Le composant Carte + foil | Colonne vertébrale visuelle, réutilisé par tout le reste |
| 2 | Chromatiques, Prismes, Sceau | Donne un objet de désir aux boosters |
| 3 | Ouverture de booster | Le geste central, inutile sans 1 et 2 |
| 4 | Sensation de combat | Meilleur rapport effort/effet du document |
| 5 | Tour des Rattrapages | La profondeur, et la raison de revenir |
| 6 | Contrats et connexion | Le rendez-vous quotidien |
| 7 | Essence et talents | Profondeur de progression, moins urgent |

---

## 4. La question de l'art

Deux voies possibles pour les personnages.

**Rester en SVG procédural, mais beaucoup plus travaillé.** Les avantages sont
réels et pas seulement pratiques : les Chromatiques ne sont qu'une permutation
de palette, les cartes restent nettes à toutes les tailles, les poses de combat
s'animent, le dépôt ne pèse rien et le jeu fonctionne hors ligne. Le coût :
ça ne ressemblera jamais à de l'illustration.

**Passer par de la génération d'images.** On gagne en beauté brute et on perd
les Chromatiques automatiques (il faudrait générer chaque variante), la netteté
à toutes les tailles, et on ajoute quelques mégaoctets au dépôt.

**Recommandation : SVG, poussé loin.** Dans un jeu de collection, ce qui fait
l'objet désirable, c'est **le cadre, le foil et la mise en scène** — pas le
réalisme du portrait. Une illustration magnifique dans un cadre plat fait moins
d'effet qu'un dessin simple dans une carte qui brille et qui s'incline.

Si le rendu ne convainc pas une fois les cartes en place, on bascule : le
composant Carte accepte n'importe quelle source d'art, donc le choix reste
réversible.
