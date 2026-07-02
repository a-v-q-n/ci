# {{REPO}}

{{DESC}}

Repo du dev continu AVQN. Contrat, palier, mode et coordonnées Coolify : voir `CLAUDE.md`.

- **Local** : `npm ci && npm start` → http://localhost:3000 (santé : `/healthz`).
- **Gate** : `{{GATE_CMD}}`.
- **Prod** : https://{{DOMAIN}} — déployée par `.github/workflows/ci.yml` (image GHCR par sha).
