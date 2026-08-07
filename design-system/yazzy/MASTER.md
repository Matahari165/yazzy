# Yazzy — système visuel

> Source de vérité pour l'interface. Direction validée à partir de la référence visuelle fournie le 7 août 2026.

## Intention

Yazzy ressemble à une petite borne de jeu colorée, pas à un tableau de bord. La feuille de score est le décor principal. Les mathématiques sont visibles sans rendre le jeu froid.

## Palette

| Rôle | Couleur | Variable |
|---|---|---|
| Fond corail | `#F49A7A` | `--coral` |
| Boîtier anthracite | `#303537` | `--charcoal` |
| Bord sombre | `#25292B` | `--charcoal-deep` |
| Papier crème | `#FFF0D3` | `--cream` |
| Case catégorie | `#F8D591` | `--yellow` |
| Case probabilité | `#B7E2CE` | `--mint` |
| Texte principal | `#2D3234` | `--ink` |

Le corail identifie le joueur et l'action. Le menthe identifie les probabilités et le coach. Le sens reste toujours écrit : la couleur seule ne suffit pas.

## Formes et relief

- boîtier : rayon de 25 à 34 px, bord sombre de 3 à 4 px ;
- grille : traits anthracite de 2 à 3 px ;
- boutons : ombre courte et dure donnant un effet physique ;
- dés : crème, carrés arrondis, points anthracite ;
- cartes pédagogiques : aplats crème, menthe ou jaune avec bord sombre ;
- pas de verre, de dégradé décoratif, de flou ni de carte blanche de SaaS.

## Typographie

- titres et nombres : pile système arrondie et très épaisse ;
- texte : Avenir Next ou police système ;
- nombres de score : chiffres tabulaires ;
- libellés courts et directs ;
- aucune dépendance à une police distante pour garder un chargement immédiat.

## Structure responsive

### Téléphone

Une borne verticale : en-tête et feuille complète. Un pupitre fixe conserve les cinq dés, l'action principale et le dernier conseil à portée du pouce. Les explications viennent ensuite dans le défilement. Largeur minimale : 375 px sans défilement horizontal.

### Mac

La borne reste à gauche et le labo pédagogique à droite. La feuille est répartie en deux colonnes pour que les dés et le bouton restent visibles dans une fenêtre de 900 px de haut.

### Paysage compact

Borne à gauche, coach à droite. La formule et le bonus peuvent passer sous la zone visible, mais aucune action n'est cachée par un élément fixe.

## Interaction et accessibilité

- action principale unique : lancer ou relancer ;
- zones tactiles de 44 px minimum sur téléphone ;
- état gardé indiqué par la couleur, le déplacement et le texte ;
- focus clavier blanc, très visible ;
- touches `1` à `5` pour garder les dés et `R` pour lancer ;
- animations de 150 à 320 ms, supprimées avec `prefers-reduced-motion` ;
- détails mathématiques ouverts avec un vrai bouton sémantique ;
- aucun emoji utilisé comme icône.
