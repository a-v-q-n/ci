# {{REPO}} — {{DESC}}

{{REPO}} suit le cycle de dev continu AVQN. La méthodologie (skills `/dev`, `/apercu`, `/brainstorm-issue`)
et la mécanique de déploiement (reusable workflows) vivent dans le backbone `avqn-dev` — ce repo ne
porte que **son contrat** (ci-dessous), son build et son code.

## Contrat (au sens conception §5)

- **Commande de gate** : `{{GATE_CMD}}` — exactement ce que la CI rejoue avant de livrer l'image.
- **UI ?** : {{UI_LINE}}
- **Services requis en local** : {{SERVICES_LINE}}
- **Versioning** : pas de bump (version figée `0.1.0` tant que le repo n'a pas de consommateurs).
- **Palier** : `{{PALIER}}` — {{PALIER_DESC}}
- **Mode Coolify** : `{{MODE}}` — {{MODE_DESC}}
- **Coordonnées Coolify** :
{{COORDS_BLOCK}}

## Déploiement

Image immuable `sha-<commit>` construite+testée par `.github/workflows/ci.yml`, poussée sur GHCR
(`ghcr.io/a-v-q-n/{{REPO}}`), puis Coolify la pull par sha (Coolify ne build jamais). Le secret
`COOLIFY_TOKEN` est hérité du secret d'organisation — rien à poser par repo. La route `/healthz`
répond `{ ok, sha }` : le health-check du deploy exige un 200 **et** le sha attendu.

## App

Squelette « hello » minimal (serveur HTTP Node sans dépendance, `server.mjs`). La vraie stack est
amenée par le dev normal (`/dev`) : remplacer l'app, ajuster la gate et le `test` job du `ci.yml`, et
si un build apparaît passer le `Dockerfile` en multi-étage (garder `ARG GIT_SHA` + `HEALTHCHECK` +
PORT dynamique + la route `/healthz`).
