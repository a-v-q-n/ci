#!/usr/bin/env node
// Rend le squelette d'un nouveau repo à partir des templates de la skill new-project.
// DÉTERMINISTE et IDEMPOTENT : n'écrase JAMAIS un fichier existant (il le saute et le signale),
// pour que /new-project soit rejouable sans danger. Calcule les tokens des 4 combinaisons
// palier(mono|double) × mode(service|application) à partir d'un seul fichier de config JSON.
//
// Usage : node scaffold.mjs <config.json> <target-dir>
// La config attend :
//   { repo, desc, owner?, prodDomain, previewDomain?, palier, mode, gateCmd?, ui?, services?,
//     prodUuid, previewUuid? }
//   - palier "mono"   : prodUuid + prodDomain requis.
//   - palier "double" : + previewUuid + previewDomain requis.
//   - services : tableau optionnel [{ name, image }] → compose.yaml local + ligne contrat.
//   - ui : chaîne décrivant l'UI (routes/breakpoints) ou absent/"no" si pas de front.
// Sort en JSON sur stdout : { created:[...], skipped:[...] }.
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const templatesDir = resolve(here, "..", "templates");

const [, , configPath, targetDir] = process.argv;
if (!configPath || !targetDir) {
  console.error("usage: node scaffold.mjs <config.json> <target-dir>");
  process.exit(2);
}

const cfg = JSON.parse(readFileSync(configPath, "utf8"));
const owner = cfg.owner || "a-v-q-n";
const gateCmd = cfg.gateCmd || "npm test";
const palier = cfg.palier;
const mode = cfg.mode;
const services = Array.isArray(cfg.services) ? cfg.services : [];

function need(cond, msg) {
  if (!cond) {
    console.error(`config invalide : ${msg}`);
    process.exit(2);
  }
}
need(cfg.repo, "champ `repo` requis");
need(cfg.desc, "champ `desc` requis");
need(cfg.prodDomain, "champ `prodDomain` requis");
need(palier === "mono" || palier === "double", "`palier` doit être mono|double");
need(mode === "service" || mode === "application", "`mode` doit être service|application");
need(cfg.prodUuid, "champ `prodUuid` requis (UUID Coolify de la prod)");
if (palier === "double") {
  need(cfg.previewUuid, "double-palier : `previewUuid` requis");
  need(cfg.previewDomain, "double-palier : `previewDomain` requis");
}

const healthz = (d) => `https://${d}/healthz`;

const palierLine =
  palier === "mono"
    ? `ATTENTION mono-palier : pas de preview — le FF merge sur \\\`main\\\` déploie DIRECTEMENT la PROD (\\\`https://${cfg.prodDomain}\\\`). Surveille le run CI post-merge (job \\\`deploy\\\`) jusqu'au vert.`
    : `Double-palier : le FF merge sur \\\`main\\\` déploie la PREVIEW (\\\`https://${cfg.previewDomain}\\\`) ; la PROD se promeut à part (promote.yml, geste humain). Surveille le run CI post-merge (job \\\`deploy\\\`) jusqu'au vert.`;

const palierDesc =
  palier === "mono"
    ? "push `main` déploie directement la prod ; pas de `promote.yml`."
    : "push `main` déploie la preview ; `promote.yml` (dispatch manuel) reporte le sha validé en prod.";

const modeDesc =
  mode === "application"
    ? "ressource Coolify de type application (image docker ; deploy PATCH `docker_registry_image_tag`)."
    : "ressource Coolify de type service (compose ; deploy PATCH la variable `IMAGE_TAG`).";

const uiLine = !cfg.ui || cfg.ui === "no" ? "non — pas de boucle `apercu`." : cfg.ui;
const servicesLine = services.length ? services.map((s) => s.name).join(", ") : "aucun.";

const coordsBlock =
  palier === "mono"
    ? `    - prod : \`${cfg.prodUuid}\` — ${healthz(cfg.prodDomain)} (mode ${mode})`
    : `    - preview (cible du push) : \`${cfg.previewUuid}\` — ${healthz(cfg.previewDomain)}\n    - prod (promote) : \`${cfg.prodUuid}\` — ${healthz(cfg.prodDomain)} (mode ${mode})`;

const composeServices = services
  .map((s) => `  ${s.name}:\n    image: ${s.image}`)
  .join("\n");

const tokens = {
  REPO: cfg.repo,
  DESC: cfg.desc,
  DOMAIN: cfg.prodDomain,
  GATE_CMD: gateCmd,
  MODE: mode,
  PALIER: palier,
  DEPLOY_UUID: palier === "mono" ? cfg.prodUuid : cfg.previewUuid,
  DEPLOY_HEALTH_URL: palier === "mono" ? healthz(cfg.prodDomain) : healthz(cfg.previewDomain),
  PREVIEW_UUID: cfg.previewUuid || "",
  PROD_UUID: cfg.prodUuid,
  PROMOTE_HEALTH_URL: healthz(cfg.prodDomain),
  PALIER_LINE: palierLine,
  PALIER_DESC: palierDesc,
  MODE_DESC: modeDesc,
  UI_LINE: uiLine,
  SERVICES_LINE: servicesLine,
  COORDS_BLOCK: coordsBlock,
  COMPOSE_SERVICES: composeServices,
};

function render(text) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) =>
    key in tokens ? tokens[key] : m,
  );
}

// template relatif → chemin de destination relatif au repo cible. Certains sont conditionnels.
const plan = [
  ["server.mjs", "server.mjs"],
  ["server.test.mjs", "server.test.mjs"],
  ["package.json", "package.json"],
  ["Dockerfile", "Dockerfile"],
  ["dockerignore", ".dockerignore"],
  ["gitignore", ".gitignore"],
  ["ci.yml", ".github/workflows/ci.yml"],
  ["claude-settings.json", ".claude/settings.json"],
  ["session-start.sh", ".claude/hooks/session-start.sh", { exec: true }],
  ["CLAUDE.md", "CLAUDE.md"],
  ["README.md", "README.md"],
];
if (palier === "double") plan.push(["promote.yml", ".github/workflows/promote.yml"]);
if (services.length) plan.push(["compose.yaml", "compose.yaml"]);

const created = [];
const skipped = [];
for (const [tpl, dest, opts = {}] of plan) {
  const outPath = join(targetDir, dest);
  if (existsSync(outPath)) {
    skipped.push(dest);
    continue;
  }
  const raw = readFileSync(join(templatesDir, tpl), "utf8");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, render(raw));
  if (opts.exec) chmodSync(outPath, 0o755);
  created.push(dest);
}

console.log(JSON.stringify({ created, skipped }, null, 2));
