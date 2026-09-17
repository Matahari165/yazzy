# Yazzy — audit qualité

Audit de présentation réalisé le 17 septembre 2026 sur la branche `codex/repo-presentability-cleanup`. Aucun push, déploiement ou service externe n’a été modifié.

## Conclusion

Le dépôt est prêt à être présenté comme projet technique : la documentation explique le produit et l’architecture, les contrôles de validation sont automatisés, les données entrantes sont mieux bornées et les principaux défauts d’interface repérés ont été corrigés.

La vérification visuelle dans un navigateur réel reste à faire dans un environnement disposant d’un navigateur pilotable.

## Corrections réalisées

| Surface | Correction | Preuve |
|---|---|---|
| Métier | Les scores sauvegardés sont validés selon le maximum de chaque catégorie ; les états de dés et les scores Duo sont bornés plus strictement. | Tests unitaires ciblés |
| Probabilités | Les conservations possibles sont réutilisées et les caches du solveur restent bornés pour éviter une croissance non maîtrisée. | Suite Vitest complète |
| API | Les corps de requête des salons sont limités à 16 Ko, y compris pour les requêtes sans longueur annoncée. | Code de route relu ; test HTTP E2E à ajouter |
| Accessibilité | La modale Duo place le focus, le conserve dans la boîte de dialogue, le restaure à la fermeture et expose `aria-controls`. | Inspection statique ; navigateur réel non disponible |
| Mobile | Le sélecteur de thème, la fermeture de modale et l’espace autour des dés respectent les tailles et marges prévues. | CSS relu ; navigateur réel non disponible |
| Quiz | Suppression du fond décoratif animé et des gradients non fonctionnels ; libellés et chiffres sont plus directs et lisibles. | CSS/JS relus |
| Cohérence visuelle | Le mode Boss conserve les mêmes surfaces claires que l’identité Céramique au lieu d’introduire un thème sombre isolé. | CSS relu |
| PWA | Le manifeste, le viewport et les tests utilisent le même fond clair Céramique. | Tests du manifeste |
| Documentation | README portfolio, architecture, limites, audit actuel et CI ajoutés ; doublon de design remplacé par un raccourci canonique. | Relecture des fichiers |

## Contrôles exécutés

- ESLint : réussi.
- TypeScript strict sans incrémentalité : réussi.
- Vitest : 18 fichiers, 101 tests réussis.
- Build Next.js 16.3.0 : réussi avec téléchargement des polices autorisé.
- `git diff --check` : réussi sur le diff final.

## Limites connues

- Le parcours E2E et le rendu exact à `390 × 844` et `1440 × 900` n’ont pas été observés dans cette session, car aucun navigateur pilotable n’était disponible.
- Le stockage du jeton Duo dans le navigateur est conservé pour permettre la reconnexion ; une migration vers des cookies HttpOnly changerait le modèle d’architecture.
- La cohérence distribuée complète des écritures Duo et la limitation de débit restent des évolutions serveur, non improvisées dans ce nettoyage.
- Les assets audio du mode Boss sont historiques ; leur provenance et leurs droits doivent être confirmés ou les fichiers remplacés avant une distribution publique ou commerciale.

## Avant une publication publique

1. Remplacer ou documenter juridiquement les assets audio du mode Boss.
2. Ajouter un test HTTP de dépassement de taille de requête.
3. Exécuter une passe E2E navigateur sur desktop, mobile, clavier et mouvement réduit.
4. Décider explicitement si le dépôt doit recevoir une licence open source.
