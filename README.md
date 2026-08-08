# Yazzy

Yazzy est une application web de Yatzy nordique qui explique les probabilités et compare les décisions du joueur.

## État actuel

- accueil explicite, choix du bot puis partie sur `/`, `/bot` et `/game` ;
- trois niveaux de bot séparés : Découverte, Calculateur et Stratège ;
- même générateur de dés équitables pour tous les niveaux ;
- scores des 15 cases nordiques et bonus supérieur ;
- probabilités exactes affichées uniquement dans le panneau de décision de la case sélectionnée ;
- sauvegarde locale versionnée `yazzy.game.v2`, sans suppression automatique de l’ancienne sauvegarde ;
- feuille de score lisible, sans grille noire ni colonne de probabilités répétée ;
- dés avec état textuel Gardé / À relancer / Résultat final ;
- animation courte des faces finales, dés gardés immobiles et mouvement réduit respecté ;
- bouton entre amis visible mais désactivé avec le libellé Bientôt.

Le mode entre amis n’est pas développé. Le niveau Stratège est une heuristique documentée et ne doit pas être présenté comme optimal.

## Lancer le projet

Prérequis : Node.js 22 ou plus récent et pnpm.

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

## Vérifier le projet

```bash
pnpm check
```

Cette commande contrôle le code, les types, les tests et le build de production.

## Documents

- [Plan produit et technique](./PLAN_DEVELOPPEMENT_YAZZY.md)
- [Système visuel](./design-system/yazzy/MASTER.md)
