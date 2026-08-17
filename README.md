# Yazzy

Yazzy est une application web de Yatzy nordique qui explique les probabilités et compare les décisions du joueur.

## État actuel

- accueil explicite, choix du bot puis partie sur `/`, `/bot` et `/game` ;
- trois niveaux de bot séparés : Découverte, Calculateur et Stratège ;
- même générateur de dés équitables pour tous les niveaux ;
- scores des 14 cases nordiques et bonus supérieur ;
- probabilités exactes affichées uniquement dans le panneau de décision de la case sélectionnée ;
- sauvegarde locale versionnée `yazzy.game.v3`, sans suppression automatique de l’ancienne sauvegarde ;
- feuille de score lisible, sans grille noire ni colonne de probabilités répétée ;
- dés avec état textuel Gardé / À relancer / Résultat final ;
- animation courte des faces finales, dés gardés immobiles et mouvement réduit respecté ;
- partie privée à deux par code court ou par lien, sans compte, avec serveur PartyKit autoritaire ;
- pause et reprise automatiques si un joueur se déconnecte ;
- revanche lancée uniquement après l’accord des deux joueurs.

Le mode entre amis conserve exactement les 14 cases et les trois lancers maximum du mode solo. Le niveau Stratège reste une heuristique documentée et ne doit pas être présenté comme optimal.

## Lancer le projet

Prérequis : Node.js 22 ou plus récent et pnpm.

```bash
pnpm install
pnpm party
```

Dans un second terminal :

```bash
pnpm dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000). Le serveur multijoueur local utilise le port `1999`.

## Activer le mode en ligne

PartyKit convient à ce petit jeu : son offre individuelle est gratuite, avec un stockage effacé toutes les 24 heures, et ses salons temporaires évitent d’ajouter une base de données ou des comptes.

1. Déployer le serveur avec `pnpm party:deploy`.
2. Copier l’hôte renvoyé dans `NEXT_PUBLIC_PARTYKIT_HOST`, comme dans `.env.example`.
3. Ajouter la même variable à l’hébergement Next.js, puis reconstruire l’application.

Le déploiement PartyKit et la configuration de l’hébergement sont des opérations externes distinctes du code de cette branche.

## Vérifier le projet

```bash
pnpm run check
```

Cette commande contrôle le code, les types, les tests et le build de production.

## Documents

- [Plan produit et technique](./PLAN_DEVELOPPEMENT_YAZZY.md)
- [Système visuel](./design-system/yazzy/MASTER.md)
