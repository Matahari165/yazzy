# Yazzy

Yazzy est une application web de Yatzy nordique qui explique les probabilités et compare les décisions du joueur.

## État actuel

- partie solo jouable ;
- scores des 15 cases nordiques ;
- probabilités et espérances exactes pour le tour ;
- retour du coach après chaque relance ou inscription de score ;
- sauvegarde locale ;
- interface arcade responsive, conçue pour téléphone, tablette et Mac ;
- lancer animé, reconnaissance des combinaisons et recommandation visuelle ;
- feuille de score toujours visible, avec probabilités exactes dans la grille ;
- détail mathématique de chaque case avec stratégie de conservation.
- pupitre mobile fixe avec dés, lancer, score et dernier conseil toujours accessibles ;
- confirmation de nouvelle partie intégrée au style du jeu.

La stratégie complète de la feuille, les bots et le mode entre amis ne sont pas encore développés.

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
