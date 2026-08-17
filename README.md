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
- partie privée à deux par code court ou par lien, sans compte ni serveur à configurer ;
- connexion WebRTC chiffrée directement entre les deux joueurs, avec l’hôte responsable des règles ;
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

Yazzy utilise WebRTC via Trystero. Le code de partie sert aussi de secret partagé pour établir une connexion chiffrée. Les actions de l’invité sont validées par l’hôte avant d’être appliquées. La partie est conservée localement chez l’hôte pour permettre une reconnexion, mais elle n’est pas synchronisée dans une base de données : si l’hôte ferme définitivement son navigateur ou efface ses données, la partie ne peut pas continuer.

## Vérifier le projet

```bash
pnpm run check
```

Cette commande contrôle le code, les types, les tests et le build de production.

## Documents

- [Plan produit et technique](./PLAN_DEVELOPPEMENT_YAZZY.md)
- [Système visuel](./design-system/yazzy/MASTER.md)
