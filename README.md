# Yazzy

Yazzy est une application web de Yatzy nordique qui transforme chaque choix de score en décision compréhensible. Le projet combine un jeu complet, un bot Expert explicable, un mode Duo temporaire et un quiz de probabilités.

## Ce que le projet démontre

- Une implémentation métier stricte : 14 catégories, trois lancers maximum, scores et probabilités calculés par le même domaine TypeScript.
- Un seul bot Expert : il compare ensemble les dés à garder et les cases libres, estime les scores restants et ajuste ses risques selon la fin de partie.
- Un historique solo sur chaque appareil : victoires, défaites, égalités, scores et dates. L’export et l’import JSON réunissent les résultats de deux appareils sans compte.
- Un mode Duo privé par code ou lien, synchronisé par un cache Vercel temporaire, sans compte ni serveur à configurer.
- Une interface responsive et accessible : mode clair Céramique par défaut, quatre identités visuelles optionnelles, clavier, focus visible, mouvement réduit et PWA.
- Une séparation lisible entre interface, hooks, domaine métier, serveur et données de quiz.

Le bot Expert reste une heuristique, pas un joueur optimal. Le thème Démon ne change que la présentation. Les historiques ne se synchronisent pas automatiquement : chacun exporte son fichier depuis « Statistiques solo » et l’autre l’importe pour obtenir le total commun.

## Choix techniques

- Next.js 16 avec App Router et React 19
- TypeScript en mode strict
- Vitest pour les règles métier, le protocole de salon, les bots et les composants critiques
- CSS organisé par surface (`base`, `lobby`, `game`, `quiz`, `themes`)
- Cache Vercel temporaire pour les salons Duo
- Web Audio API pour les effets et la musique procédurale

### Organisation du code

```text
src/
├── app/          routes Next.js, API, styles et manifeste PWA
├── components/   écrans, plateaux, formulaires et layouts visuels
├── domain/       règles Yatzy, score, probabilités, bots et protocole
├── hooks/        orchestration des parties côté interface
├── server/       service et stockage temporaire des salons
├── data/         questions et données de quiz
├── lib/          audio, stockage local et utilitaires
└── workers/      calculs isolés côté navigateur
```

## Lancer le projet

Prérequis : Node.js 22 ou plus récent et pnpm.

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

## Vérifier le projet

```bash
pnpm lint       # qualité et règles React
pnpm typecheck  # contrat TypeScript strict
pnpm test       # suite Vitest
pnpm build      # build de production Next.js
pnpm run check  # les quatre contrôles ci-dessus
```

Le solveur de probabilités explore exactement les conservations possibles ; la suite prévoit donc un délai plus généreux pour ses tests exhaustifs.

## Documentation

- [Système visuel Yazzy](./design-system/yazzy/MASTER.md)
- [Audit qualité actuel](./design-system/yazzy/QUALITY-AUDIT.md)

## Limites connues et transparence

- Les salons Duo sont temporaires et sans compte utilisateur ; ils dépendent du cache régional Vercel.
- Le protocole protège les commandes et les scores, mais la cohérence distribuée complète et la limitation de débit restent des évolutions d’architecture.
- Le jeton de salon est conservé côté navigateur pour permettre la reconnexion ; il ne s’agit pas d’un secret serveur.
- Les fichiers audio du mode Boss sont conservés comme assets historiques ; leur provenance et leurs droits doivent être confirmés ou remplacés avant une distribution publique ou commerciale.
- La couverture automatisée est principalement unitaire et domaine ; un parcours E2E sur navigateur réel complète les contrôles locaux.

## Licence

Aucune licence de réutilisation n’est accordée dans ce dépôt. Les droits des assets audio doivent être clarifiés avant toute publication au-delà d’un portfolio privé.
