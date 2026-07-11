# ci — contrat du repo

Ce repo est la **plomberie de déploiement** de l'écosystème AVQN, rien d'autre. Il n'est jamais
cloné en dev : les repos d'app le consomment en `uses: a-v-q-n/ci/.github/workflows/…@main`.

## Ce qui vit ici

- `.github/workflows/deploy.yml` + `promote.yml` — grammaire Coolify partagée, **fine** : seulement
  des coordonnées (`uuid`, `health_url`, `image_tag`, `mode`), zéro logique de typologie de projet.
  Le health-check exige un **200 ET le sha attendu** quand le endpoint expose un champ `sha`
  (sinon 200 seul, avec avertissement) : un conteneur périmé qui répond 200 ne fait pas passer le
  déploiement.
- `.github/workflows/ci.yml` — le filet : actionlint sur les workflows. Ne livre rien (ni image,
  ni deploy).

La méthode de dev (skills, cycle) vit dans l'atelier (`a-v-q-n/atelier`) ; le registre des repos
d'app est son `repos.txt`.

## Règles d'édition

- **Toute modification passe par branche + PR + CI verte + FF merge `main`.** Ce repo est consommé
  en `@main` par les repos d'app : un `deploy.yml`/`promote.yml` cassé se propage à tout
  l'écosystème au premier appel. La CI (`ci.yml`) ne protège qu'exécutée **avant** le merge — donc
  jamais de FF direct sur `main` sans PR.
- Les reusable workflows préservent la **compatibilité des inputs** (`uuid`, `health_url`,
  `image_tag`, `mode`, `secrets.coolify_token`, `preview_uuid`/`prod_uuid`) : les repos
  consommateurs les appellent en `@main`, un changement cassant les casse tous d'un coup.
- Les reusable workflows restent **fins** : si tu es tenté d'y ajouter un `if` de typologie projet,
  c'est que ça doit vivre dans le `ci.yml` du repo concerné, pas ici.
- **`ci` reste isolé de l'atelier** : un bug du cockpit ne doit jamais pouvoir casser la prod.
