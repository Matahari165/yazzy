# Règles du projet Yazzy

## Produit et périmètre

- Yazzy est une application personnelle. Préserve son identité ludique, son périmètre et les décisions déjà présentes.
- Utilise la solution la plus simple, l’existant et les dépendances justifiées. N’invente aucune décision produit.

## Autonomie, délégation et coordination

- L’agent principal reste responsable du périmètre, des décisions finales, de la cohérence, de la vérification et de la synthèse.
- Pour chaque tâche non triviale, évalue les sous-tâches qui bénéficient réellement d’une analyse, recherche, implémentation ou vérification séparée. Si une délégation apporte une valeur claire, utilise au moins un sous-agent **GPT-5.6 Luna `high`**.
- Utilise **Luna `xhigh`** pour une difficulté élevée, un diagnostic ambigu, une revue critique ou une vérification indépendante. Utilise deux, trois ou quatre sous-agents lorsque plusieurs lots sont réellement indépendants et que cela accélère le travail ou améliore la preuve.
- Ne délègue pas une tâche triviale, strictement séquentielle ou trop petite pour justifier le coût de coordination. Chaque sous-agent reçoit un périmètre de fichiers et une preuve attendue.
- Les agents coordonnent eux-mêmes dépendances, fichiers réservés, conflits, sauvegardes et reprise après blocage. Ils ne demandent pas à l’utilisateur d’organiser leur travail.

## Git et sauvegardes

- Avant toute modification, inspecte la branche, l’état Git et les changements existants. Préserve tout changement hors périmètre.
- Les agents gèrent eux-mêmes les sauvegardes récupérables, les commits locaux cohérents et l’intégration des lots vérifiés. Utilise une branche ou un worktree séparé si des tâches parallèles peuvent se chevaucher.
- Ne réinitialise pas, n’écrase pas et ne supprime pas le travail existant. Relis le diff final.
- Push, publication, déploiement, dépense, contact d’un tiers et modification d’un service externe exigent une autorisation explicite.

## Interface et microcopy

- Construis une direction visuelle propre à Yazzy : ludique, lisible et intentionnelle. Évite l’AI slop : gradients gratuits, cartes identiques, gros titres décoratifs, interfaces copiées ou styles mélangés sans raison.
- Avant une création ou refonte importante, choisis une direction claire et vérifie-la avec des références pertinentes.
- Purge les textes visibles inutiles : sous-titres redondants, phrases évidentes, labels répétés, aide décorative et confirmations bavardes. Garde uniquement ce qui aide à comprendre, décider, agir, attendre, corriger une erreur ou utiliser l’accessibilité.
- Vérifie en priorité iPhone `390 × 844`, puis MacBook Air `1440 × 900` et les largeurs intermédiaires utiles. Contrôle contraste, lisibilité, clavier, focus, zones tactiles et information indépendante de la couleur.

## Développement et définition de terminé

- Après une modification, vérifie les états normal, chargement, vide, erreur, responsive, accessibilité, types, lint, tests et build pertinents.
- Une tâche n’est terminée qu’après implémentation, inspection du résultat, correction des échecs liés à la tâche, vérifications adaptées, relecture du diff et rapport des limites restantes.
- Une demande d’audit, de conseil ou de lecture seule n’autorise aucune modification.

## Communication

- Réponds en français, simplement et directement. Commence par la conclusion utile.
- Pour un audit ou un diagnostic, sépare faits vérifiés, hypothèses, causes écartées et inconnues.
- Ne t’arrête pas après le premier patch si l’objectif inclut l’exécution, l’inspection et la correction.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
