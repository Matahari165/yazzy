# Yazzy

Yazzy est une application web de Yatzy nordique qui explique les probabilités et compare les décisions du joueur.

## État actuel

- accueil explicite, choix du bot puis partie sur `/`, `/bot` et `/game` ;
- deux niveaux de bot séparés : Stratège et Expert ;
- même générateur de dés équitables pour tous les niveaux ;
- scores des 14 cases nordiques, sans bonus supérieur ;
- probabilités exactes affichées uniquement dans le panneau de décision de la case sélectionnée ;
- sauvegarde locale versionnée `yazzy.game.v3`, sans suppression automatique de l’ancienne sauvegarde ;
- feuille de score lisible, sans grille noire ni colonne de probabilités répétée ;
- dés sélectionnés par un changement visuel, sans libellé sous chaque dé ;
- animation courte des faces finales, dés gardés immobiles et mouvement réduit respecté ;
- partie privée à deux par code court ou par lien, sans compte ni serveur à configurer ;
- salon temporaire synchronisé par Vercel, afin de fonctionner même sur les réseaux qui bloquent WebRTC ;
- pause et reprise automatiques si un joueur se déconnecte ;
- revanche lancée uniquement après l’accord des deux joueurs.

Le mode entre amis conserve exactement les 14 cases et les trois lancers maximum du mode solo. Le niveau Stratège reste une heuristique documentée et ne doit pas être présenté comme optimal.

## Lancer le projet

Prérequis : Node.js 22 ou plus récent et pnpm.

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

## Jouer avec un ami

1. Cliquer sur « Jouer avec un ami ».
2. Envoyer le code ou le lien affiché.
3. Garder l’onglet de l’hôte ouvert pendant la partie.

Les actions des deux joueurs sont validées par le moteur de jeu côté serveur. Le salon est conservé temporairement dans le cache régional Vercel jusqu’à six heures après sa dernière évolution. Les navigateurs interrogent le salon à intervalle court : aucun compte, aucune clé et aucune connexion directe entre les appareils ne sont nécessaires.

## Vérifier le projet

```bash
pnpm run check
```

Cette commande contrôle le code, les types, les tests et le build de production.

## Documents

- [Système visuel](./design-system/yazzy/MASTER.md)
