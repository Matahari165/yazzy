# Yazzy — système visuel

> Source de vérité pour l’interface mobile et Mac. La direction arcade précédente est abandonnée.

## Intention

Yazzy est un jeu de plateau moderne, léger et accueillant. Le score reste le centre du jeu ; les probabilités apparaissent seulement quand le joueur sélectionne une case. Chaque écran propose une action principale identifiable.

## Palette

| Rôle | Couleur | Variable |
|---|---|---|
| Fond de page | `#F7F1E8` | `--page` |
| Surface | `#FFFDF8` | `--surface` |
| Texte anthracite | `#25292B` | `--ink` |
| Texte secondaire | `#5C6261` | `--ink-soft` |
| Accent de marque | `#ED896E` | `--coral` |
| Accent accentué | `#C96350` | `--coral-deep` |
| Dé gardé / confirmation | `#237A58` | `--green` |
| Surface gardée | `#DCEFE5` | `--green-soft` |
| Ligne | `#DDD6CC` | `--line` |

La couleur n’est jamais le seul signal : une variation de position ou de forme accompagne l’état visible, et un libellé accessible décrit précisément l’état aux lecteurs d’écran.

## Formes et relief

- très peu de cartes : une surface par grande zone fonctionnelle au maximum ;
- éléments espacés par paliers de 8 px ;
- bordure uniforme de 1 px ou absence de bordure ;
- rayons cohérents : `10px`, `16px`, `24px` ;
- ombres très légères, sans effet de borne ni grille noire ;
- pas de dégradé décoratif, de flou ou de relief dur ;
- dés en SVG sans carte individuelle ; un dé gardé devient vert, se soulève légèrement et affiche un petit repère de forme.

## Typographie

- pile système arrondie sans police distante ;
- texte fonctionnel à `12px` minimum, corps courant à `16px` ;
- catégories de la feuille à `15px` minimum ;
- poids 600–800, sans graisse extrême ;
- nombres de score avec chiffres tabulaires.

## Structure responsive

### Téléphone

L’accueil et le choix du bot sont centrés sur une action principale. Pendant la partie, l’en-tête regroupe le mode, les scores et le joueur actif sur une seule ligne. La feuille n’a pas de titre redondant et utilise deux colonnes. Les dés et l’action restent dans la zone basse visible ; la feuille ne défile que lorsque la hauteur est trop courte pour préserver des cibles tactiles d’au moins 44 × 44 px.

### Paysage compact

La feuille adopte deux colonnes lisibles lorsque la hauteur est courte et peut défiler dans son propre panneau. Les dés, l’action et le statut restent dans le second panneau. Aucun défilement horizontal n’est autorisé.

### Mac

La feuille dense et le pupitre sont présentés dans deux colonnes équilibrées. Les quinze catégories doivent être visibles sans lignes surdimensionnées sur un écran Mac courant. Le panneau de lancer reste visible pendant le défilement de la page si nécessaire.

## Interaction et accessibilité

- une seule action principale par étape ;
- boutons natifs et liens Next sémantiques ;
- zones tactiles d’au moins 44 px ;
- états des dés visibles en couleur, position et forme, avec libellés accessibles invisibles ;
- raccourcis `⌥1` à `⌥5`, `⌥R` et `⌥S` actifs mais non affichés pendant la partie ;
- trois points compacts indiquent les lancers disponibles et consommés ;
- animation des dés de 220 à 300 ms, résultat généré au clic, dés gardés immobiles ;
- `prefers-reduced-motion` réduit l’animation à un fondu court ;
- contraste AA et focus visible ;
- aucune icône emoji.
