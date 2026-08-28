## Règles du projet Yazzy

### Communication et cadrage

- Réponds en français, simplement et sans phrases inutiles. Commence par la conclusion utile.
- Avant toute modification, donne un plan court, les hypothèses importantes et les critères de réussite.
- Si une ambiguïté peut changer significativement le résultat, pose une seule question et attends la réponse avant de coder.
- Une demande de conseil, d'explication, d'audit ou de lecture seule n'autorise aucune modification.

### Interface et expérience utilisateur

- Conserve une identité visuelle cohérente, ludique et intentionnelle. Évite l'apparence générique des applications générées par IA, les cartes répétitives et les grands espaces vides sans fonction.
- Chaque texte visible doit aider à comprendre, décider ou agir. Le titre de l'onglet reste `Yazzy`.
- Garde les actions et informations prioritaires visibles sans défilement inutile.
- Conçois et optimise en priorité pour l'iPhone `390x844` : ce format représente environ 90 % de la priorité responsive. Contrôle ensuite le rendu sur MacBook Air `1440x900` et, si utile, sur les largeurs intermédiaires.
- Vérifie contraste, lisibilité, navigation au clavier, focus visible, zones tactiles et information indépendante de la couleur.
- Utilise le navigateur intégré pour toute modification visuelle ou interactive significative. Une petite correction évidente peut recevoir une vérification proportionnée.

### Développement, qualité et Git

- Inspecte les conventions et l'état Git avant de modifier. Préserve les changements existants et reste strictement dans le périmètre demandé.
- Utilise la solution la plus simple qui répond au besoin, réutilise l'existant et n'ajoute pas de dépendance sans bénéfice clair.
- Utilise une branche par modification cohérente et livrable. Ne mélange pas deux sujets indépendants.
- Après une modification, vérifie selon le risque : cas normal, chargement, absence de données, erreur, responsive, accessibilité, types, lint, tests et build pertinents.
- Relis le diff final. Un commit local, un push, un déploiement et une vérification en production sont des preuves distinctes : ne présente jamais l'une comme la preuve d'une autre.
- Ne publie, ne déploie, n'envoie de message et ne modifie aucun service externe sans autorisation explicite.

### Délégation et revue

- L'agent principal reste responsable du plan, de l'architecture, des décisions finales, de l'intégration, des conflits, des vérifications et de la synthèse.
- Utilise au moins un sous-agent dès qu'une étape peut utilement être analysée, recherchée, exécutée ou vérifiée séparément, même si cette étape est relativement petite.
- N'utilise pas de sous-agent uniquement lorsque la tâche est réellement triviale et que la délégation n'apporterait aucune valeur pratique.
- Lorsque le choix du modèle est disponible, utilise exclusivement GPT-5.6 Luna `high` ou GPT-5.6 Luna `xhigh` pour les sous-agents. N'utilise aucun autre modèle comme sous-agent.
- Utilise Luna `high` par défaut. Réserve Luna `xhigh` aux analyses difficiles, diagnostics ambigus, recherches de bugs, revues critiques et vérifications indépendantes exigeantes.
- Confie aux sous-agents des tâches bornées et utiles. Évite les délégations redondantes ou plusieurs agents faisant essentiellement le même travail sans justification.
- Lorsque plusieurs agents peuvent modifier des fichiers ou dépendances communs, ils se coordonnent directement, conviennent de l'ordre des interventions et se transmettent l'état utile. Aucun agent ne doit écraser ou annuler silencieusement le travail d'un autre.

### Restitution

- Après une étape technique importante, explique brièvement ce qui fonctionne, comment et pourquoi, avec un exemple concret si cela aide.
- Pour un audit ou un diagnostic, sépare clairement les faits vérifiés, les hypothèses, les causes écartées et les inconnues.
- Termine toute modification par : ce qui a changé, les vérifications effectuées, puis les limites ou risques restants.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
