# Yazzy — Plan produit, mathématique et technique

> Document de référence du projet
> Version : 0.4 — 8 août 2026
> Statut : développement commencé

## État réel du projet au 8 août 2026

Implémenté et vérifié :

- dépôt Git initialisé et relié à `Matahari165/yazzy` ;
- socle Next.js, React et TypeScript ;
- moteur de score du Yatzy nordique ;
- moteur exact de probabilité et d'espérance par case, exécuté hors du fil principal ;
- 27 tests automatisés sur les règles, les probabilités, les politiques de bot et les transitions de partie ;
- accueil explicite, choix du niveau puis partie contre bot sur `/`, `/bot` et `/game` ;
- état v3 à deux joueurs : joueur actif, dés, scores, tour et état du tour bot ;
- sauvegarde locale versionnée `yazzy.game.v3`, sans suppression de l’ancienne clé ;
- probabilités exactes affichées uniquement dans le panneau de décision de la case sélectionnée ;
- dés sélectionnés par un changement visuel, sans libellé sous chaque dé ;
- animation courte des faces finales, dés gardés immobiles et mouvement réduit ;
- interface de plateau claire vérifiée à 320, 375, 390 et 430 px, en paysage et sur une largeur Mac ;
- raccourcis clavier `⌥1` à `⌥5`, `⌥R` et `⌥S` ;
- confirmation avant d’écraser une partie v3 existante ;
- bouton ami visible, désactivé et marqué Bientôt.

Non implémenté :

- stratégie optimale de la feuille complète ; le Stratège actuel reste une heuristique ;
- explication détaillée des décisions du bot ;
- bilan pédagogique de fin de partie ;
- PWA hors ligne ;
- comptes et mode entre amis ;
- validation spécifique dans Safari sur un vrai Mac ;
- déploiement public.

## 1. Vision

Yazzy est un jeu web de Yatzy qui apprend au joueur à mieux décider.

La promesse tient en trois points :

1. jouer une vraie partie, rapide et agréable ;
2. voir des probabilités exactes, accompagnées d'une explication simple puis d'une démonstration mathématique ;
3. recevoir un retour utile lorsqu'une décision était moins bonne qu'une autre.

Yazzy ne doit pas ressembler à un tableau de statistiques auquel on aurait ajouté des dés. Le jeu reste au premier plan. Les mathématiques apparaissent progressivement, au bon moment.

## 2. Définition du succès

La première version publique est réussie si une personne peut :

- ouvrir Yazzy sur téléphone ou ordinateur sans installer de logiciel ;
- lancer immédiatement une partie solo ou contre un bot ;
- comprendre les règles sans quitter la partie ;
- sélectionner les dés à garder, relancer et remplir une case ;
- consulter, pour chaque case encore libre, sa probabilité de réussite et son score moyen attendu ;
- comprendre comment ces valeurs sont calculées ;
- savoir après chaque décision si un meilleur choix existait, de combien, et pourquoi ;
- terminer une partie sans erreur de score ni incohérence mathématique ;
- constater que tous les bots utilisent des dés équitables.

Objectifs de qualité :

- aucune probabilité inventée ou modifiée selon le niveau ;
- résultat identique pour un même état de jeu et une même version du moteur ;
- interface utilisable à partir de 375 px de largeur ;
- interface confortable sur Mac avec souris, trackpad, clavier et Safari ;
- navigation clavier, contrastes WCAG AA et animations désactivables ;
- calcul d'un conseil courant en moins de 100 ms sur un appareil récent, ou affichage immédiat d'un état de calcul ;
- aucune obligation de créer un compte pour le mode solo.

## 3. Décisions proposées et points à valider

### Décisions proposées pour la V1

- Règles : Yatzy nordique classique, ordre libre.
- Langue initiale : français.
- Plateforme : application web responsive et installable comme PWA.
- Mode principal : solo pédagogique.
- Second mode : joueur contre bot.
- Stockage initial : local dans le navigateur.
- Compte utilisateur : facultatif et reporté.
- Objectif stratégique par défaut : maximiser le score final moyen attendu.
- Explications : trois profondeurs — résumé, intuition, formule.
- Technologie recommandée : Next.js, React et TypeScript.
- Expérience desktop : le Mac est une plateforme de premier rang, pas un simple agrandissement de la vue mobile.

### Points à valider avant l'implémentation

1. Confirmer la variante nordique ci-dessous.
2. Décider si le joueur peut désactiver totalement le coach pendant une partie.
3. Choisir si les retours apparaissent après chaque sélection de dés ou seulement après la relance, afin de ne pas casser le rythme.
4. Valider la direction visuelle avec une maquette mobile de l'écran de jeu.
5. Décider si la première version doit être jouable sans connexion après la première visite.

Ces questions ne bloquent pas la conception du moteur, mais elles doivent être tranchées avant les écrans définitifs.

## 4. Règles de référence proposées

Une partie comprend 14 tours. À chaque tour :

1. le joueur lance cinq dés ;
2. il peut garder n'importe quels dés et relancer les autres ;
3. il dispose au maximum de trois lancers au total ;
4. il inscrit ensuite un score, éventuellement zéro, dans une case encore vide.

### Grille de score

| Case | Condition | Score |
|---|---|---:|
| As à Six | dés de la valeur demandée | somme de ces dés |
| Une paire | au moins deux dés identiques | somme de la meilleure paire |
| Deux paires | deux paires de valeurs différentes | somme des quatre dés concernés |
| Brelan | au moins trois dés identiques | somme des trois dés concernés |
| Carré | au moins quatre dés identiques | somme des quatre dés concernés |
| Petite suite | 1, 2, 3, 4, 5 | 15 |
| Grande suite | 2, 3, 4, 5, 6 | 20 |
| Full | un brelan et une paire de valeurs différentes | somme des cinq dés |
| Yatzy | cinq dés identiques | 50 |

Le total est la somme directe des 14 cases : aucun bonus supérieur n'est appliqué.

Le moteur de règles doit néanmoins être configurable. Une future variante Yahtzee ne doit pas nécessiter de réécrire l'interface ou le moteur de jeu.

## 5. Le contrat pédagogique

### Ce que signifie chaque nombre

L'interface ne doit jamais afficher un pourcentage sans définir son sens.

Pour une case, Yazzy peut afficher :

- **Probabilité de réussite** : chance d'obtenir une combinaison qui marque plus de zéro dans cette case, en suivant la meilleure stratégie de conservation pour cette case.
- **Score attendu de la case** : moyenne des points que cette case rapporterait après les relances restantes.
- **Valeur attendue du coup** : effet moyen de la décision sur le score final de la partie.
- **Probabilité avec ton choix** : chance obtenue en gardant les dés réellement sélectionnés par le joueur.
- **Meilleure probabilité possible** : chance obtenue avec la meilleure sélection de dés si le seul objectif est cette case.

Exemple de formulation :

> Tu as gardé 2–2 pour viser le Yatzy. Garder 5–5 aurait donné la même probabilité : les deux choix sont équivalents pour cette case.

Ou :

> Avec 2–3–4–6–6, garder 2–3–4 donne environ 16,4 % de chances de compléter la petite suite avec deux relances.

Les nombres présentés dans l'application devront toujours être produits et vérifiés par le moteur.

Pour les cases à score fixe — suites et Yatzy — une probabilité de réussite suffit. Pour les cases à score variable — As à Six, paires, brelan, carré et full — le détail doit aussi montrer :

- la probabilité de chaque score possible ;
- la probabilité d'atteindre au moins un objectif choisi ;
- le score moyen attendu.

### Quand afficher un retour

Le coach compare les décisions suivantes :

- dés gardés avant une relance ;
- décision de relancer ou de s'arrêter ;
- case choisie à la fin du tour ;
- case sacrifiée avec un zéro.

Il ne doit pas interrompre le joueur pour une différence négligeable. Seuil initial proposé :

- aucune alerte si la perte attendue est inférieure à 0,10 point ;
- message discret entre 0,10 et 1 point ;
- explication visible au-delà de 1 point ou lorsqu'une règle importante est découverte.

Le seuil sera réglable. Une égalité doit être annoncée comme telle : plusieurs coups peuvent être optimaux.

### Structure d'une explication

Chaque retour suit le même ordre :

1. **Conclusion** — « Le meilleur choix était de garder les trois 4. »
2. **Écart** — « Ton choix vaut 2,3 points attendus de moins. »
3. **Intuition** — une phrase simple.
4. **Comparaison** — ton choix contre le meilleur choix.
5. **Calcul** — formule et cas comptés, ouvert à la demande.
6. **Contexte** — effet éventuel des cases déjà remplies.

Le ton reste factuel et encourageant. Éviter « erreur », « mauvais coup » et les messages répétitifs.

## 6. Fondations mathématiques

### Représentation des dés

L'ordre des dés n'a pas d'importance pour les probabilités. Un lancer est représenté par un vecteur de comptage :

```text
(n1, n2, n3, n4, n5, n6), avec n1 + ... + n6 = 5
```

Exemple : `2, 2, 5, 5, 5` devient `(0, 2, 0, 0, 3, 0)`.

Il n'existe que :

```text
C(5 + 6 - 1, 5) = C(10, 5) = 252
```

combinaisons non ordonnées de cinq dés. Cette réduction rend les calculs exacts et testables.

### Probabilité d'un résultat

Pour `n` dés relancés et un résultat décrit par `(x1, ..., x6)` :

```text
P(x1, ..., x6) = n! / (x1! × ... × x6!) × (1/6)^n
```

Le coefficient devant `(1/6)^n` compte le nombre d'ordres différents donnant la même combinaison.

Pour obtenir exactement `k` dés d'une valeur donnée parmi `n` dés :

```text
P(X = k) = C(n, k) × (1/6)^k × (5/6)^(n-k)
```

### Espérance

Si un choix peut produire les scores `s1 ... sm` avec les probabilités `p1 ... pm` :

```text
E[score] = Σ(si × pi)
```

Une espérance de 8 points ne promet pas 8 points. Elle signifie qu'en répétant très souvent la même situation, la moyenne se rapproche de 8.

### Meilleure stratégie pour une case

Pour une catégorie `C`, des dés `d` et `r` relances restantes :

```text
P_C(d, 0) = 1 si score_C(d) > 0, sinon 0

P_C(d, r) = max sur chaque choix de dés gardés h :
              Σ résultat x [P(x) × P_C(h + x, r - 1)]
```

Pour le score attendu, la base devient `score_C(d)` au lieu de 0 ou 1.

Cette récurrence énumère tous les résultats possibles et tous les choix légaux. Elle ne dépend pas d'une simulation aléatoire.

### Meilleure stratégie pour la partie

L'état stratégique contient au minimum :

```text
S = (cases remplies, sous-total supérieur, dés, relances restantes)
```

La valeur d'une action `a` est :

```text
Q(S, a) = Σ état suivant S' [P(S' | S, a) × V(S')]
V(S)    = max_a Q(S, a)
```

À la fin d'un tour, l'action est le choix d'une case. Entre deux lancers, l'action est le choix des dés gardés.

Le coût d'une décision sous-optimale, appelé ici **écart d'espérance**, est :

```text
écart = Q(S, meilleure_action) - Q(S, action_du_joueur)
```

### Exact, pré-calculé ou estimé

Le produit doit afficher la nature de chaque résultat :

- `Exact` : tous les résultats pertinents ont été énumérés ;
- `Exact, pré-calculé` : valeur issue d'une table générée et versionnée ;
- `Estimation` : simulation ou approximation, avec nombre d'itérations et marge d'erreur ;
- `Indisponible` : le moteur ne sait pas répondre proprement.

La probabilité de compléter une case pendant le tour peut être exacte. L'optimisation parfaite de toute une partie est beaucoup plus coûteuse : 14 cases créent déjà `2^14 = 16 384` configurations, auxquelles s'ajoutent les 252 combinaisons de dés et le numéro du lancer. La V1 ne devra pas qualifier une stratégie globale d'« exacte » tant que le calcul exhaustif et ses tests ne le prouvent pas.

## 7. Moteur de décision

### Trois objectifs distincts

Le moteur expose trois politiques, car elles peuvent conseiller des coups différents :

1. **Réussir une case** — maximise sa probabilité de marquer.
2. **Marquer ce tour** — maximise le score attendu immédiat.
3. **Gagner la partie** — maximise le score final attendu, puis plus tard la probabilité de battre un adversaire.

Le coach utilise par défaut le troisième objectif. Le panneau pédagogique permet de comparer les trois.

### API interne proposée

```ts
type Evaluation = {
  objective: "category-success" | "turn-score" | "game-score";
  value: number;
  precision: "exact" | "precomputed-exact" | "estimated";
  engineVersion: string;
};

scoreRoll(ruleSet, dice, category): number
listLegalHolds(dice): Hold[]
evaluateCategories(gameState): CategoryEvaluation[]
recommendHold(gameState, objective): Recommendation
recommendCategory(gameState, objective): Recommendation
explainDecision(beforeState, playerAction): Explanation
```

Le calcul mathématique et la génération du texte doivent être séparés. Une explication ne doit jamais recalculer ou modifier les nombres.

### Performance

- mémoriser les résultats par état canonique ;
- pré-calculer les transitions des lancers ;
- exécuter les calculs lourds dans un Web Worker pour ne pas figer l'écran ;
- générer hors ligne les grandes tables de stratégie ;
- compresser et charger les tables par morceaux ;
- inclure `ruleSetVersion` et `engineVersion` dans chaque cache.

## 8. Bots honnêtes

Tous les niveaux utilisent exactement le même générateur de dés et les mêmes règles. La difficulté ne modifie que la qualité des décisions.

### Niveau 1 — Découverte

- applique quelques règles simples et lisibles ;
- garde souvent les groupes identiques ;
- vise une suite lorsqu'elle est déjà bien engagée ;
- choisit parmi plusieurs coups raisonnables ;
- peut rater une conséquence future, mais ne triche jamais.

### Niveau 2 — Calculateur

- utilise les probabilités exactes du tour ;
- maximise surtout le score attendu immédiat ;
- comprend mal les sacrifices de fin de partie ;
- est donc cohérent mais stratégiquement myope.

### Niveau 3 — Stratège

- tient compte des cases restantes ;
- maximise le score final attendu avec le meilleur moteur validé disponible ;
- utilise une table exacte si elle existe, sinon une approximation explicitement documentée ;
- ne reçoit aucun avantage sur les lancers.

### Niveau expérimental — Expert

Ce niveau ne sera publié que si une stratégie globale exhaustive ou une approximation très fortement validée dépasse clairement le niveau Stratège. Le nom « optimal » est réservé à une politique prouvée exacte pour toutes les situations couvertes.

### Preuve d'équité

Pour le solo :

- lancers produits avec `crypto.getRandomValues()` ;
- aucun paramètre de difficulté transmis au générateur ;
- journal local des lancers et de la version du générateur ;
- tests statistiques automatisés sur de grands échantillons.

Pour le futur multijoueur :

- lancers décidés par le serveur ;
- protocole « engagement puis révélation » ou source vérifiable équivalente ;
- journal signé de la partie ;
- reconnexion sans nouveau tirage.

## 9. Expérience utilisateur

### Principes

- mobile d'abord ;
- une action principale visible à la fois ;
- le plateau reste compréhensible sans ouvrir les mathématiques ;
- les probabilités détaillées utilisent une divulgation progressive ;
- aucune information importante ne dépend uniquement d'une couleur ;
- zones tactiles d'au moins 44 × 44 px ;
- animations entre 150 et 300 ms, avec prise en charge de `prefers-reduced-motion`.

### Direction visuelle validée

- ambiance : jeu de plateau moderne, léger et accueillant ;
- fond crème clair et surfaces blanches, avec corail comme accent de marque ;
- feuille de score simple, sans grille noire ni répétition de probabilités ;
- dés SVG avec contour vert, pastille et libellé d’état ;
- action principale large avec une ombre très légère ;
- titres arrondis mais moins gras, texte fonctionnel à 12 px minimum ;
- cartes espacées, bordures uniformes et rayons de 10, 16 ou 24 px ;
- aucun emoji ni décor réaliste ;
- thème clair unique pour la V1 afin de préserver cette identité.

Palette validée :

| Rôle | Couleur |
|---|---|
| Fond principal | `#F7F1E8` |
| Surface | `#FFFDF8` |
| Texte | `#25292B` |
| Joueur / action | `#ED896E` |
| Dés gardés / confirmation | `#DCEFE5` |
| Accent de confirmation | `#237A58` |
| Traits | `#DDD6CC` |

### Écran de partie mobile

Ordre vertical validé :

1. marque, scores des deux joueurs, tour et joueur actif ;
2. feuille de score avec nom, score et état ;
3. panneau contextuel unique pour la case sélectionnée ;
4. cinq dés dont la sélection est indiquée visuellement, sans libellé sous les faces ;
5. une action principale « Lancer », « Relancer » ou « Inscrire ».

Sur Mac, la feuille et le pupitre sont présentés dans deux colonnes. Sur les téléphones très courts, seule la liste des scores défile ; les dés et l’action restent visibles.

### Écrans nécessaires

- accueil ;
- choix du mode ;
- partie solo ;
- partie contre bot et choix du niveau ;
- tutoriel interactif ;
- fin de partie et bilan pédagogique ;
- historique local ;
- glossaire des probabilités ;
- règles ;
- réglages d'accessibilité et du coach ;
- plus tard : salon d'amis, invitation et partie multijoueur.

### Bilan de fin de partie

Le bilan montre au maximum trois enseignements :

- décision la plus coûteuse ;
- meilleure décision de la partie ;
- notion mathématique à revoir.

Il peut aussi afficher le score réel, le score attendu au départ, l'écart cumulé d'espérance et la progression sur plusieurs parties. Il ne doit pas prétendre que le score réel mesure seul la qualité du jeu : un bon choix peut produire un mauvais lancer.

## 10. Périmètre fonctionnel par version

### Prototype mathématique

- règles nordiques pures ;
- calcul exact des scores ;
- énumération des 252 combinaisons ;
- probabilité et espérance par case ;
- comparaison exhaustive des dés à garder ;
- tests de référence.

### MVP jouable

- partie solo complète ;
- lancer, sélection, relance, arrêt anticipé et score ;
- grille de 14 cases sans bonus ;
- probabilités exactes du tour ;
- explication simple et formule ;
- sauvegarde locale et reprise ;
- tutoriel court ;
- déploiement web ;
- aucune authentification.

### V1 pédagogique

- coach après chaque décision ;
- comparaison avec le meilleur coup ;
- trois objectifs stratégiques ;
- bilan de partie ;
- historique local ;
- réglage de la fréquence des conseils ;
- accessibilité et responsive finalisés.

### V1.5 bots

- trois niveaux documentés ;
- tour du bot visible et accélérable ;
- explication de ses décisions ;
- tests d'équité ;
- comparaison de performance sur au moins 100 000 parties simulées par niveau.

### V2 amis

- comptes facultatifs ;
- création d'un salon et lien d'invitation ;
- jeu synchrone à deux ou plusieurs ;
- reconnexion ;
- serveur autoritaire pour les lancers et les scores ;
- journal de partie ;
- réactions prédéfinies avant un éventuel chat libre ;
- protection contre l'abandon et les doubles actions.

Hors périmètre initial : argent réel, classement mondial, chat libre, tournois, publicité et objets payants.

## 11. Architecture recommandée

### Choix général

Un monorepo TypeScript simple :

```text
yazzy/
├── apps/
│   └── web/                    # Next.js, interface et routes
├── packages/
│   ├── game-domain/            # règles, états, actions, scores
│   ├── probability-engine/     # probabilités et espérances exactes
│   ├── strategy-engine/        # politiques, tables et recommandations
│   ├── coach/                  # explications à partir des résultats
│   ├── bots/                   # niveaux et politiques de décision
│   └── ui/                     # composants visuels partagés
├── data/
│   └── strategies/             # tables générées et versionnées
├── scripts/                    # génération et vérification des tables
├── tests/
│   ├── exhaustive/
│   ├── integration/
│   └── e2e/
└── docs/
```

Le monorepo n'est pas obligatoire au premier commit. La séparation logique, elle, l'est.

### Frontend

- Next.js + React + TypeScript ;
- composants accessibles construits avec des primitives éprouvées ;
- CSS avec variables de design et Tailwind si cela accélère le travail ;
- état de partie sous forme de machine à états ou réducteur déterministe ;
- Web Worker pour le moteur mathématique ;
- IndexedDB pour les parties et préférences locales ;
- PWA pour installation et reprise rapide.

### Backend

Aucun backend métier n'est nécessaire au MVP. Le site peut être déployé statiquement ou avec un minimum de fonctions serveur.

Pour le multijoueur :

- API TypeScript ;
- PostgreSQL pour utilisateurs, parties et événements ;
- temps réel par WebSocket ou service Realtime ;
- serveur autoritaire ;
- authentification par lien magique ou fournisseur social ;
- système de présence et de reconnexion.

Supabase est une option cohérente pour PostgreSQL, Auth et Realtime. La décision doit être prise seulement au début de la V2, après un prototype de reconnexion et de concurrence. Vercel convient au déploiement web, sans rendre le moteur dépendant de la plateforme.

### Architecture de données

Entités principales :

```text
RuleSet
Game
Player
Turn
Roll
Decision
ScoreEntry
CoachEvaluation
EngineVersion
RandomnessReceipt
```

Chaque action est un événement immuable :

```ts
type GameEvent =
  | { type: "GAME_STARTED"; ruleSetVersion: string }
  | { type: "DICE_ROLLED"; dice: Dice; rollIndex: number }
  | { type: "DICE_HELD"; held: DiceIndexes }
  | { type: "CATEGORY_SCORED"; category: Category; points: number }
  | { type: "GAME_FINISHED"; total: number };
```

L'état visible est reconstruit à partir de ces événements. Cela facilite la reprise, les replays, les explications et la résolution des problèmes multijoueurs.

## 12. Fiabilité et tests

### Règles

- un test par exemple officiel de chaque case ;
- tests des cas ambigus : carré compté comme paire, deux paires différentes, full avec valeurs différentes, score zéro ;
- test que le total reste la somme directe des cases, notamment à 62, 63 et 64 ;
- test d'une partie complète et de l'impossibilité de remplir deux fois une case.

### Mathématiques

- la somme des probabilités de chaque distribution vaut 1 ;
- comparaison des résultats exacts avec une seconde implémentation simple ;
- énumération exhaustive des 252 états de dés et de tous les choix de conservation ;
- tests de symétrie entre les faces lorsque la catégorie ne donne pas de préférence ;
- fractions rationnelles conservées pendant les calculs de référence, arrondies seulement dans l'interface ;
- simulations Monte-Carlo uniquement comme contrôle, jamais comme preuve d'un résultat exact.

### Bots

- aucun accès à un futur lancer ;
- aucune dépendance du générateur au niveau ;
- distribution des faces proche de 1/6 sur un grand échantillon ;
- ordre moyen des performances : Stratège ≥ Calculateur ≥ Découverte, avec intervalles de confiance ;
- conservation de parties où le bot perd malgré de bonnes décisions.

### Interface

- tests unitaires des composants critiques ;
- tests navigateur d'une partie entière ;
- tests sur 375, 768, 1024 et 1440 px ;
- navigation complète au clavier ;
- lecteur d'écran sur les dés, les boutons et la grille ;
- absence de décalage de page pendant un lancer ;
- mode mouvement réduit ;
- tests dans les navigateurs mobiles principaux.

### Conditions de publication

Une phase n'est terminée que si :

- les critères de la phase sont démontrés ;
- les tests automatisés passent ;
- une partie réelle complète a été jouée dans un navigateur ;
- la version déployée a été vérifiée, pas seulement la version locale ;
- les limites connues sont inscrites dans le document du projet.

## 13. Sécurité, vie privée et exploitation

### MVP local

- pas de compte ni de donnée personnelle requise ;
- historique conservé sur l'appareil ;
- bouton clair pour effacer les données ;
- aucune télémétrie non essentielle sans consentement ;
- dépendances limitées et mises à jour contrôlées.

### Multijoueur

- validation de chaque action côté serveur ;
- contrôle d'accès par partie ;
- limitation de débit ;
- aucune confiance dans le score envoyé par le navigateur ;
- secrets uniquement côté serveur ;
- politique de conservation et de suppression des comptes ;
- sauvegarde et migration de la base testées.

### Marque

« Yazzy » est un nom de travail. Avant une publication publique importante : vérifier les noms de domaine, les marques dans les pays visés et le risque de confusion. Ne pas copier le logo, les textes ou l'habillage de Yahtzee/Hasbro.

## 14. Mesures produit

Mesurer peu de choses, mais les définir correctement :

- taux de parties commencées puis terminées ;
- temps jusqu'au premier lancer ;
- fréquence d'ouverture des explications ;
- proportion de conseils utiles selon le joueur ;
- évolution de l'écart moyen d'espérance sur plusieurs parties ;
- erreurs techniques et temps de calcul ;
- taux de désactivation du coach.

Le score brut ne mesure pas seul la progression, car la chance crée beaucoup de variance. L'indicateur pédagogique principal est la qualité des décisions comparée à la meilleure politique disponible, avec sa précision annoncée.

## 15. Feuille de route de développement

### Phase 0 — Cadrage et maquette

- valider la variante ;
- écrire les critères d'acceptation des 14 cases ;
- dessiner le parcours mobile ;
- produire une maquette cliquable de l'écran de jeu ;
- tester la compréhension de « probabilité » contre « espérance ».

Livrable : règles versionnées et maquette approuvée.

### Phase 1 — Domaine et moteur exact du tour

- implémenter les types et la machine de jeu ;
- implémenter le score ;
- générer les distributions de dés ;
- calculer probabilité et espérance par catégorie ;
- comparer tous les choix de conservation ;
- construire la suite de tests exhaustive.

Livrable : moteur TypeScript sans interface, documenté et vérifié.

### Phase 2 — Partie solo

- construire l'écran principal ;
- intégrer lancer, conservation et score ;
- ajouter sauvegarde locale et reprise ;
- afficher les probabilités sans coach ;
- intégrer règles et tutoriel ;
- déployer une version de test.

Livrable : partie solo complète sur téléphone et ordinateur.

### Phase 3 — Coach

- enregistrer les décisions ;
- calculer le meilleur contre-factuel ;
- générer les explications structurées ;
- ajouter seuils et réglages ;
- créer le bilan de partie ;
- faire relire les explications mathématiques.

Livrable : chaque conseil est relié à un calcul reproductible.

### Phase 4 — Stratégie globale et bots

- mesurer la taille réelle des états ;
- choisir calcul exhaustif, pré-calcul ou approximation ;
- versionner la politique ;
- implémenter les trois niveaux ;
- simuler et comparer les niveaux ;
- publier la méthode et ses limites dans l'application.

Livrable : bots honnêtes, différenciés par leurs décisions.

### Phase 5 — Finition et première publication

- audit accessibilité ;
- optimisation des chargements et calculs ;
- tests multi-navigateurs ;
- vérification juridique du nom et des textes ;
- page d'accueil, confidentialité et signalement de bug ;
- contrôle complet de la version en ligne.

Livrable : V1 publique stable.

### Phase 6 — Amis

- prototype serveur autoritaire ;
- modèle de données distant ;
- salons et invitations ;
- lancers vérifiables ;
- synchronisation, reconnexion et reprise ;
- tests de concurrence et de sécurité ;
- bêta privée avant ouverture.

Livrable : parties entre amis fiables.

## 16. Risques principaux

| Risque | Réponse |
|---|---|
| Confondre Yatzy et Yahtzee | versionner les règles et les afficher clairement |
| Appeler « optimal » un calcul partiel | afficher exact, pré-calculé ou estimé |
| Conseils envahissants | seuil, fréquence réglable, mode silencieux |
| Calcul global trop lourd | prototype de complexité avant promesse produit |
| Interface trop dense | divulgation progressive et tests mobiles |
| Bot perçu comme tricheur | RNG indépendant du niveau et journal d'équité |
| Mauvais lancer perçu comme mauvaise décision | séparer résultat et qualité du choix |
| Multijoueur fragile | serveur autoritaire, événements immuables, reconnexion |
| Dépendance à une plateforme | domaine et moteur en paquets TypeScript purs |

## 17. Règles de travail pour les prochains chats

Avant toute modification :

1. lire ce document et les fichiers déjà présents ;
2. annoncer la phase traitée et un plan court ;
3. distinguer faits vérifiés, hypothèses et décisions proposées ;
4. ne pas changer les règles ou la direction visuelle sans le signaler ;
5. préserver le travail local qui ne concerne pas la tâche ;
6. ne jamais écrire « exact » ou « optimal » sans test ou preuve adaptée ;
7. après une modification, tester le vrai parcours concerné ;
8. mettre à jour ce document lorsqu'une décision structurante est validée.

Ordre conseillé pour le prochain chat : **Phase 0, validation des règles et wireframe mobile de l'écran de jeu.** Aucun backend n'est nécessaire à ce stade.

## 18. Sources de référence initiales

- [Règles du Yatzy nordique reprises d'Alga, annexe A du rapport KTH](https://www.csc.kth.se/utbildning/kth/kurser/DD143X/dkand13/Group10Pawel/report/k.sederblad.j.tornebohm.finalreport.pdf)
- [Résumé des catégories et différences entre Yatzy et Yahtzee](https://en.wikipedia.org/wiki/Yatzy)
- [Règles officielles du Yahtzee par Hasbro, utiles uniquement pour contrôler les différences de variante](https://instructions.hasbro.com/en-us/instruction/yahtzee)

Le rapport KTH montre aussi pourquoi l'optimisation complète doit être traitée avec prudence : les auteurs décrivent les 32 768 configurations de cases et les 252 combinaisons non ordonnées de dés, mais leur tentative de calcul complet n'était pas assez efficace. Yazzy devra mesurer et prouver sa propre couverture au lieu de reprendre une promesse d'optimalité.
