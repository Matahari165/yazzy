# Yazzy — audit qualité senior

> Audit réalisé le 21 août 2026 sur la branche locale `codex/senior-mobile-game-audit`, créée depuis `origin/main` au commit `f1800bc`. Aucun push, déploiement ou changement de service externe.

## Conclusion

Les défauts P0, P1 et P2 relevés pendant l’audit sont corrigés. Les règles du Yatzy nordique, les 14 catégories, les trois lancers, le calcul des scores, le stockage local, les codes courts, l’appairage permanent et le protocole des salons restent inchangés.

La seule validation restante est un passage sur iPhone physique. Les contrôles navigateur couvrent les dimensions demandées, y compris une hauteur de 500 px représentant un clavier ouvert.

## Référence verrouillée

- fond crème et surfaces blanc chaud ;
- corail réservé aux actions principales ;
- bleu pour le joueur local ;
- rouge pour l’adversaire ;
- vert pour les dés gardés et les confirmations ;
- feuille de score au centre de l’expérience ;
- aucune nouvelle dépendance, police distante, image ou direction décorative.

## Constats et corrections

| Priorité | Surface | Fait vérifié avant correction | Correction | Statut |
|---|---|---|---|---|
| P1 | Jeu 320 × 568 | Les noms longs des catégories étaient tronqués. | `shortLabel` est affiché à 430 px et moins, ainsi qu’en paysage compact. Les noms complets restent dans les libellés des boutons. | Corrigé et vérifié |
| P1 | Accessibilité | Le lien du logo et le retour du choix du bot mesuraient moins de 44 px de haut. Les six premières lignes de score restaient sous 44 px sur Mac. | Toutes les cibles visibles mesurent au moins 44 × 44 px dans les formats contrôlés. | Corrigé et vérifié |
| P1 | Multijoueur | Chaque synchronisation remplaçait l’objet de partie, même à version serveur identique. | La partie canonique n’est remplacée que si la version augmente ; une réaction identique conserve aussi sa référence. | Corrigé et testé |
| P1 | Multijoueur | La cadence restait à 800 ms dans un onglet masqué et après les erreurs. | 800 ms au premier plan, 4 s en arrière-plan, puis 1,6 s, 3,2 s et 4 s après erreurs successives. Le retour au premier plan relance immédiatement la synchronisation. | Corrigé et testé |
| P1 | Mac | L’en-tête et le plateau n’avaient pas le même axe sur grand écran. | L’en-tête et le message de connexion partagent la largeur de 984 px du plateau à partir de 1100 px. | Corrigé et vérifié |
| P1 | Multijoueur | Les noms étaient visibles en tête, mais les totaux restaient seulement en bas de la feuille. | Les deux totaux sont maintenant permanents dans l’en-tête, sans nouveau texte. | Corrigé et vérifié |
| P2 | Contraste | Le corail foncé atteignait environ 3,47:1 sur crème et le vert environ 4,38:1 sur vert clair. | Les petits textes utilisent `--coral-ink` (`#A94735`) et `--green-ink` (`#176346`), tous deux au-dessus de 4,5:1 sur leurs surfaces. | Corrigé et calculé |
| P2 | Animation | Les durées et accélérations étaient définies au cas par cas. | Trois durées et trois accélérations sémantiques pilotent actions, lancer, dé gardé, score, tour, réactions et panneaux. | Corrigé |
| P2 | Mouvement réduit | La base existait mais ne couvrait pas les nouveaux panneaux et repères. | Les panneaux, le repère de dé gardé et les impulsions sont supprimés ; le lancer devient un fondu de 80 ms. | Corrigé |
| P2 | Maintenabilité | `globals.css` regroupait 1168 lignes et toutes les surfaces. | Séparation en `base.css`, `lobby.css` et `game.css`, importés explicitement à la racine. | Corrigé |
| P2 | Formulaires mobiles | La disposition courte devait être contrôlée avec le clavier visible. | À 390 × 500, la page reste sans débordement horizontal, défile verticalement et place le champ focalisé entièrement dans la zone visible. | Vérifié |

## Parcours fonctionnels vérifiés

### Solo

- accueil et reprise locale ;
- choix des trois niveaux de bot ;
- lancer et relancer ;
- maintien d’un dé ;
- score direct ;
- ouverture, fermeture et focus de la fiche d’aide ;
- tour du bot et action « Passer » ;
- conservation des dés et de l’action sans défilement de page.

### Multijoueur

- création d’un salon et attente ;
- entrée du second siège par code ;
- noms, couleurs, totaux et autorité du tour ;
- lancer, dé gardé et score vus par l’autre siège ;
- réaction et annonce temporaire ;
- déconnexion détectée, action bloquée puis reconnexion ;
- état et score conservés après reconnexion ;
- remplissage des 28 feuilles, résultat des deux côtés ;
- proposition de revanche, attente et nouvelle partie partagée à 0–0.

## Matrice responsive vérifiée

| Format | Débordement horizontal | Défilement de page pendant le jeu | Dés et action visibles | Cibles < 44 px |
|---|---:|---:|---:|---:|
| 320 × 568 | Non | Non | Oui | 0 |
| 375 × 667 | Non | Non | Oui | 0 |
| 390 × 844 | Non | Non | Oui | 0 |
| 430 × 932 | Non | Non | Oui | 0 |
| 390 × 500 | Non | Non pendant le jeu | Oui | 0 |
| 844 × 390 | Non | Non | Oui | 0 |
| 1440 × 900 | Non | Non | Oui | 0 |

La feuille défile dans son propre panneau lorsque sa hauteur ne permet pas d’afficher les 14 catégories avec des cibles de 44 px. Le document lui-même reste fixe pendant le jeu.

## Accessibilité et robustesse

### Faits vérifiés

- focus clavier visible : contour de 3 px et décalage de 3 px ;
- libellés complets des catégories et états de score annoncés ;
- dés annoncés avec numéro, valeur et état gardé/à relancer ;
- états actifs accompagnés d’une bordure, d’un relief ou d’un déplacement ;
- aucune erreur ou alerte console sur solo, hôte et invité ;
- manifeste PWA présent avec `display: standalone`, icônes 192, 512 et maskable.

### Causes écartées

- aucun changement de règle ou de calcul de score ;
- aucun changement du schéma de stockage local ;
- aucun changement du protocole de salon ou de l’autorité serveur ;
- aucune dépendance ajoutée ;
- aucune erreur de build ou de type liée au découpage CSS.

### Inconnues et vérifications manuelles restantes

- rendu exact des zones sûres, du clavier et du moteur WebKit sur un iPhone physique ;
- perception subjective des mouvements réduits avec le réglage système activé sur un appareil réel ;
- comportement réseau sous perte de paquets réelle, au-delà du délai progressif testé comme fonction pure et de la reconnexion locale.

## Contrôles techniques

- ESLint : réussi ;
- TypeScript : réussi ;
- build Next 16.3.0 : réussi ;
- `git diff --check` : réussi ;
- tests ciblés des libellés, de la conservation d’état et de la cadence : réussis ;
- suite Vitest : 68 tests réussis sur 68. Un premier passage avait dépassé la limite de 5 s dans le test exhaustif de probabilités pendant une forte contention système ; le passage final à charge normale réussit sans modifier cette limite.

## Décisions

- pas de nouvelle direction visuelle : le système existant devient la référence verrouillée ;
- pas de texte explicatif supplémentaire dans le jeu ;
- libellé court uniquement comme représentation visuelle compacte ;
- aucune optimisation multijoueur ne contourne l’état serveur ;
- priorité à la stabilité de la feuille et des contrôles plutôt qu’à un effet animé décoratif.
