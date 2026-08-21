# ci — plomberie de déploiement AVQN

Repo **jamais cloné en dev** : la mécanique Coolify partagée, consommée par chaque repo d'app via
`uses: a-v-q-n/ci/.github/workflows/<workflow>.yml@main` (résolu au CI, jamais cloné).

- `deploy.yml` — repointe la cible **du push** (prod en mono-palier, preview en double-palier) sur
  un sha immuable déjà construit+testé, déclenche Coolify, health-check (200 **et** sha attendu
  quand le endpoint l'expose).
- `promote.yml` — reporte le sha **preview → prod** (double-palier seulement). La promotion est le
  seul geste humain de release.
- `ci.yml` — le filet du repo lui-même : actionlint sur les workflows. Ne livre rien.

La méthode de dev (triage, cycle issue → PR → merge, review, démarrage) vit dans le plugin
`avqn-dev` de la marketplace [`a-v-q-n/skills`](https://github.com/a-v-q-n/skills) ; chaque repo
d'app porte son contrat dans son `CLAUDE.md`.
