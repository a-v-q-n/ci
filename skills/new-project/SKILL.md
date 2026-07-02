---
name: new-project
description: Onboarde un NOUVEAU repo dans l'écosystème de dev continu AVQN en un geste — recueille les décisions humaines (nom, description, UI, palier mono/double, mode Coolify service/application, services requis), puis déroule tout le reste automatiquement : repo privé dans l'org, squelette conforme au contrat (CLAUDE.md, ci.yml + promote.yml si double, Dockerfile + HEALTHCHECK, route /healthz {ok,sha}, .claude/ + hook, app « hello » déployable), ressources Coolify (UUID récupérés seuls), DNS, ligne projects.txt, et récap des gestes humains restants. Rejouable sans danger (détecte l'existant, n'écrase rien). Zéro secret posé à la main (secret d'org COOLIFY_TOKEN hérité).
---

# New Project — onboarder un repo en un geste

Absorbe les ~14 gestes manuels d'onboarding en **une invocation + les décisions humaines**. Toutes les
briques existent (secret d'org `COOLIFY_TOKEN` visibilité ALL, reusable workflows `a-v-q-n/avqn-dev@main`,
MCP `avqn-infra` pour repo/Coolify/DNS, conventions image `sha-<commit>` + sonde `/healthz` `{ok,sha}`).
Cette skill les enchaîne dans le bon ordre, avec une **vérification après chaque étape**.

**Interactif par nature** (c'est une amorce du cycle, pas de la routine). Tu poses les questions, tu
exécutes, tu vérifies, tu rends le récap.

## Ce qui rend la skill sûre à rejouer

Chaque ressource est **détectée avant d'être créée** ; rien n'est écrasé. Relancer `/new-project` sur un
repo à moitié créé complète ce qui manque sans casser l'existant. Concrètement : `github_repos` avant
`github_repo_create`, `coolify_applications`/`coolify_services` avant de créer, `dns_records` avant
`dns_record_create`, et `scaffold.mjs` **saute tout fichier déjà présent** (il les liste dans `skipped`).

## 1. Recueillir les décisions humaines

Pose-les une par une (les défauts entre crochets) :

- **`repo`** — nom du dépôt (kebab-case, ex. `product-foo`). Devient `a-v-q-n/<repo>` et l'image `ghcr.io/a-v-q-n/<repo>`.
- **`desc`** — une phrase de description.
- **UI ?** — le repo a-t-il un front (pour `apercu`) ? Si oui : routes à screenshoter + breakpoints [390/768/1440]. Sinon `no`.
- **`palier`** — `mono` (push `main` → prod direct, pas de preview) ou `double` (push → preview, promote → prod). [mono pour un projet jeune sans clients]
- **`mode`** — `application` (image docker, cible native `docker_registry_image_tag`) ou `service` (compose, variable `IMAGE_TAG`). [application]
- **Services requis** — Postgres/Redis… pour tourner en local ? [aucun]
- **Domaine(s)** — prod `<repo>.avqn.ch` ; en double-palier, preview `<repo>.preview.avqn.ch` aussi. [dérivés du nom]

Récapitule les choix et **fais valider** avant d'agir (c'est le seul aval ; ensuite tout s'enchaîne).

## 2. Le dépôt GitHub

1. **Détecter** : `mcp__claude_ai_infra__github_repos` → le repo existe déjà ? Si oui, saute la création (note-le).
2. **Créer** : `mcp__claude_ai_infra__github_repo_create` avec `name=<repo>`, `org="a-v-q-n"`, `private=true`, **`auto_init=false`** (on pousse le squelette nous-mêmes ; un README auto bloquerait le template).
3. **Vérifier** : `github_repo_get` renvoie le repo. Rien à faire pour `COOLIFY_TOKEN` — c'est un **secret d'organisation** (visibilité ALL), hérité par tout repo de l'org. Zéro secret par repo.

## 3. Les ressources Coolify (récupère les UUID)

Le serveur cible par défaut est **`Prod`** (`coolify_servers` → uuid `hswow4kwookocgg8c88sos8k`, ip `46.62.162.135`) ;
il porte l'auth GHCR (`/root/.docker/config.json`) donc il **pull les images privées de l'org sans credential par repo**.
Choisis un **projet** existant via `coolify_projects` (ex. `04-Applications`, `05-Websites`, `01-Core`) et son
environnement via `coolify_environments` (nom `production`).

Crée **une** ressource en mono-palier (la prod), **deux** en double-palier (preview + prod). Pour chacune,
selon le **mode** :

### mode `application`
`mcp__claude_ai_infra__coolify_application_create` :
- `type="dockerimage"`, `docker_registry_image_name="ghcr.io/a-v-q-n/<repo>"`, `docker_registry_image_tag="latest"` (placeholder — le premier push CI le repointera sur le vrai sha),
- `project_uuid`, `server_uuid`, `environment_name="production"`,
- `domains="https://<domaine>"`, `ports_exposes="3000"`,
- **sans `instant_deploy`** (aucune image n'existe encore),
- `extra={ "health_check_path": "/healthz", "health_check_port": "3000" }` (chemin de santé configuré ; **`health_check_port` doit être une string** ; la vérification 200+sha vit dans le deploy).

Récupère l'**UUID** dans la réponse (sinon `coolify_applications` par nom).

### mode `service`
`mcp__claude_ai_infra__coolify_service_create` avec `docker_compose_raw` (custom stack), `project_uuid`,
`environment_name="production"`, `server_uuid`. Le compose déclare le web sur l'image GHCR paramétrée par
`${IMAGE_TAG}` + les labels Traefik du domaine (grammaire éprouvée, cf. `product-site-avqn`) :

```yaml
services:
  web:
    image: 'ghcr.io/a-v-q-n/<repo>:${IMAGE_TAG}'
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    labels:
      - traefik.enable=true
      - traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https
      - traefik.http.routers.<repo>-http.entryPoints=http
      - 'traefik.http.routers.<repo>-http.rule=Host(`<domaine>`)'
      - traefik.http.routers.<repo>-http.middlewares=redirect-to-https
      - traefik.http.routers.<repo>-https.entryPoints=https
      - 'traefik.http.routers.<repo>-https.rule=Host(`<domaine>`)'
      - traefik.http.routers.<repo>-https.tls=true
      - traefik.http.routers.<repo>-https.tls.certresolver=letsencrypt
      - traefik.http.routers.<repo>-https.service=<repo>-web
      - traefik.http.services.<repo>-web.loadbalancer.server.port=3000
```

Puis pose la variable que le compose interpole, sinon `${IMAGE_TAG}` ne résout pas :
`mcp__claude_ai_infra__coolify_service_env_create` avec `key="IMAGE_TAG"`, `value="latest"` (placeholder ;
le premier push la repointera). Récupère l'**UUID** du service.

> **Nommage** : en double-palier, suffixe les ressources (`<repo>-preview`, `<repo>-prod`) et donne à chacune
> son domaine. La preview est la **cible du push** ; la prod est la cible du **promote**.

## 4. Le DNS

D'abord **détecter** : `mcp__claude_ai_infra__dns_records` (zone `avqn.ch`). Un enregistrement **wildcard
`*.avqn.ch → 46.62.162.135`** (serveur Prod) existe : il couvre déjà tout **sous-domaine à un seul label**
sur Prod (`<repo>.avqn.ch`). Dans ce cas — le plus courant — **aucun enregistrement à créer**, Traefik route
par le domaine posé sur la ressource Coolify. Vérifie la résolution (`dig +short <domaine>` → `46.62.162.135`).

Crée un enregistrement dédié seulement si le domaine **n'est pas couvert** par le wildcard : cible sur un
autre serveur, ou sous-domaine **multi-labels** (ex. `<repo>.preview.avqn.ch`, non capté par `*`). Alors
`mcp__claude_ai_infra__dns_record_create` : `zone="avqn.ch"`, `type="A"`, `source="<sous-domaine>"` (ex.
`<repo>.preview`), `target="46.62.162.135"`. Puis vérifie la résolution.

## 5. Générer le squelette (scaffold)

Écris un `config.json` avec les décisions + les UUID/domaines récupérés, puis lance le script d'aide de la
skill (il rend les templates, gère les conditionnels des 4 combinaisons, et **saute les fichiers existants**) :

```
node <chemin-de-cette-skill>/scripts/scaffold.mjs <config.json> <dir-du-repo-cloné>
```

`config.json` (clés) :
```json
{
  "repo": "<repo>", "desc": "<desc>", "prodDomain": "<repo>.avqn.ch",
  "previewDomain": "<repo>.preview.avqn.ch",        // double-palier seulement
  "palier": "mono|double", "mode": "application|service",
  "gateCmd": "npm test", "ui": "no | description des routes/breakpoints",
  "services": [{ "name": "db", "image": "postgres:16" }],   // optionnel
  "prodUuid": "<uuid prod>", "previewUuid": "<uuid preview>" // preview en double
}
```

Le script écrit : `server.mjs` (app hello + `/healthz`), `server.test.mjs`, `package.json`, `Dockerfile`
(`ARG GIT_SHA` + `HEALTHCHECK` PORT dynamique), `.dockerignore`, `.gitignore`, `.github/workflows/ci.yml`
(+ `promote.yml` si double), `.claude/settings.json` + `.claude/hooks/session-start.sh`, `CLAUDE.md`
(contrat complet), `README.md`, et `compose.yaml` si services. Lis son JSON `{created, skipped}` pour le récap.

## 6. Gate locale + premier push

Dans le repo cloné (`git clone` du repo créé, ou `git init` si auto_init=false) :
1. `npm install` (génère `package-lock.json`, requis par le `npm ci` du Docker/CI).
2. **Gate** : la commande du contrat (`npm test` par défaut) — doit être verte avant de pousser.
3. Commit + push sur `main` : `git add -A && git commit -m "🤖 chore: bootstrap <repo> (squelette /new-project)"` puis `git branch -M main && git remote add origin https://github.com/a-v-q-n/<repo>.git && git push -u origin main`.

Le push `main` déclenche `ci.yml` : build de l'image `sha-<commit>` sur GHCR, puis le job `deploy` repointe
la cible du push (prod en mono, preview en double) sur ce sha et déclenche Coolify.

## 7. Vérifier le déploiement (le vrai critère)

Suis le run CI jusqu'au bout (`gh run watch` ou `github_*` via MCP). Puis **prouve** que la cible sert le bon sha
(pas juste un 200) :

```
curl -fsS https://<domaine-cible>/healthz
# → {"ok":true,"sha":"<les 12 hex du commit poussé>"}
```

Le job `deploy` fait déjà cette vérification (200 **et** sha attendu, ~7 min de retries) ; refais-la à la main
pour confirmer. Sha servi ≠ sha poussé → conteneur périmé, ne déclare pas « fait ».

## 8. Registres + récap

1. **`projects.txt`** (dans `avqn-dev`) : ajoute la ligne `a-v-q-n/<repo>` — via une petite PR sur `avqn-dev`
   (toute modif d'`avqn-dev` passe par PR + CI + FF merge). C'est le registre des repos du dev continu.
2. **Registre du cockpit infra** : enregistre le projet en mémoire sémantique (tool `avqn_memory_set` du
   connecteur avqn-os), clé `infra:project:<slug>`, tags `infra,registre`. C'est ce registre que lit la
   surface Projets d'`infra.avqn.ch` (shas preview/prod, diff, bouton promote). Valeur JSON :

   ```json
   {
     "name": "<slug>",
     "repo": "a-v-q-n/<repo>",
     "tier": "double | mono",
     "mode": "application | service",
     "promoteWorkflow": "promote.yml",
     "preview": { "uuid": "<uuid Coolify preview>", "healthUrl": "https://<preview>/healthz" },
     "prod":    { "uuid": "<uuid Coolify prod>",    "healthUrl": "https://<domaine>/healthz" }
   }
   ```

   `promoteWorkflow` : omissible quand c'est `promote.yml` (le défaut) ; obligatoire pour une app de
   monorepo (ex. contentos → `promote-contentos.yml`). En mono-palier : pas de bloc `preview`.
   La `healthUrl` doit être l'endpoint qui expose le `sha`.
3. **Récapitule les gestes humains restants** :
   - **+1 source dans la routine cloud** (clone de travail) — config invisible depuis les repos, à ajouter à la main pour que la routine autonome prenne ce repo.
   - En double-palier : le **promote** prod (`promote.yml`, dispatch manuel) reste le geste 2.
   - Si services : créer la **base logique** dans l'instance Postgres centrale (hors périmètre auto) et poser les env vars applicatives dans Coolify.
   - Poser `ready` sur les futures issues pour alimenter la routine.

## Les 4 combinaisons

| palier × mode | ressource(s) Coolify | cible du push (`ci.yml`) | promote.yml | deploy `mode` |
|---|---|---|---|---|
| mono × application | 1 application (prod) | prod | non | application |
| mono × service | 1 service (prod) | prod | non | service |
| double × application | 2 applications (preview, prod) | preview | oui | application |
| double × service | 2 services (preview, prod) | preview | oui | service |

Dans tous les cas : image `sha-<commit>` unique, Coolify ne build jamais, `/healthz` sert `{ok,sha}`,
`COOLIFY_TOKEN` hérité de l'org. Seuls varient le **nombre** de ressources (palier) et **comment** le sha est
repointé (mode : `docker_registry_image_tag` vs variable `IMAGE_TAG`).

## Garde-fous

- **Zéro secret à la main** : `COOLIFY_TOKEN` est un secret d'org (visibilité ALL) ; `GITHUB_TOKEN` de la CI suffit pour GHCR. Ne pose aucun secret par repo.
- **Ordre** : ressources Coolify + DNS **avant** le push (le job `deploy` a besoin des UUID réels). Le scaffold porte les coordonnées ; ne pousse pas avant.
- **Ne touche jamais** aux repos d'app existants ni à leurs ressources Coolify. Un `/new-project` ne concerne que le repo neuf.
- **Idempotent** : détecte l'existant à chaque étape, n'écrase rien ; un replay complète les trous.
- **« Fait » = health vérifié** : la cible répond 200 **et** sert le sha poussé. Pas de raccourci sur cette preuve.
