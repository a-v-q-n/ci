# Vendoring des skills superpowers

Les skills de méthodo générique embarqués ici sont **vendorisés** (copiés en dur) depuis le projet
**superpowers** de Jesse Vincent (« obra »). La copie locale **fait foi** : aucune synchronisation
automatique, aucune version amont épinglée. Mettre à jour = **diff manuel** contre l'upstream (voir
la règle en bas).

Points d'entrée maison (NON vendorisés, source de vérité du cycle AVQN) : `dev`, `brainstorm-issue`,
`apercu`. Ils orchestrent les skills ci-dessous.

## Origine amont

- Plugin : `obra/superpowers` — https://github.com/obra/superpowers
- Skills communautaires : `obra/superpowers-skills` — https://github.com/obra/superpowers-skills
- Marketplace : `obra/superpowers-marketplace` — https://github.com/obra/superpowers-marketplace

L'upstream exact (repo + commit) de chaque fichier n'est **pas épinglé** : les noms et le contenu
correspondent aux skills superpowers, mais rien ne garantit qu'ils sont identiques bit à bit à un
état amont daté. En cas de divergence, **la copie locale fait foi**.

## Skills vendorisés

Tous figés le **2026-06-30** (commit `9c8a791`, « plugin: layout avqn-dev »), qui a introduit
l'arborescence `skills/` en un seul geste.

| Skill | Rôle |
|---|---|
| `brainstorming` | Transformer une idée en design/spec par dialogue, avant tout code. |
| `writing-plans` | Découper une spec en plan de tâches courtes et vérifiables. |
| `executing-plans` | Exécuter un plan écrit dans une session dédiée avec checkpoints. |
| `subagent-driven-development` | Dérouler un plan via un sous-agent implémenteur par tâche + revues. |
| `dispatching-parallel-agents` | Répartir 2+ tâches indépendantes sur des agents parallèles. |
| `test-driven-development` | TDD : test qui échoue d'abord, avant l'implémentation. |
| `systematic-debugging` | Diagnostic méthodique avant toute correction. |
| `verification-before-completion` | Prouver par exécution avant de dire « fait ». |
| `requesting-code-review` | Dispatcher un sous-agent reviewer sur le produit du travail. |
| `receiving-code-review` | Traiter un retour de review avec rigueur, sans acquiescement. |
| `finishing-a-development-branch` | Clore une branche : options merge / PR / cleanup. |
| `using-git-worktrees` | Isoler le travail dans un worktree dédié. |
| `writing-skills` | Créer/éditer/tester des skills. |

## Règle de mise à jour

1. Récupérer l'état amont voulu (`obra/superpowers` / `obra/superpowers-skills`, branche `main`).
2. **Diff manuel** dossier par dossier (`skills/<nom>/` local ↔ amont).
3. Reporter à la main les changements souhaités — en conservant les adaptations AVQN éventuelles
   (formulations, renvois au cycle `dev`).
4. Committer en signalant l'origine et la date de reprise dans le message.

Pas de script de sync : la reprise reste un geste conscient, pour ne jamais écraser une adaptation.
