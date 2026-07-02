#!/usr/bin/env node
// Filet de cohérence du plugin avqn-dev : JSON des manifestes valides + frontmatter
// name/description parseable dans chaque skills/*/SKILL.md. Sort en échec (code 1) au
// moindre manifeste illisible ou SKILL.md sans frontmatter exploitable.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function checkJson(relPath) {
  const abs = join(repoRoot, relPath);
  try {
    JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    errors.push(`${relPath} : JSON invalide — ${err.message}`);
  }
}

// Extrait le frontmatter YAML minimal (bloc entre les deux `---` de tête) et rend
// les clés de premier niveau. Volontairement simple : les frontmatters de skills
// sont des paires `clé: valeur` sur une ligne.
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return null;
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[m[1]] = value;
  }
  return fields;
}

function checkSkills() {
  const skillsDir = join(repoRoot, "skills");
  const entries = readdirSync(skillsDir).filter((name) =>
    statSync(join(skillsDir, name)).isDirectory(),
  );
  for (const name of entries) {
    const rel = join("skills", name, "SKILL.md");
    const abs = join(repoRoot, rel);
    let raw;
    try {
      raw = readFileSync(abs, "utf8");
    } catch {
      errors.push(`${rel} : illisible ou absent`);
      continue;
    }
    const fm = parseFrontmatter(raw);
    if (!fm) {
      errors.push(`${rel} : frontmatter absent ou non délimité par \`---\``);
      continue;
    }
    if (!fm.name) errors.push(`${rel} : frontmatter sans champ \`name\``);
    if (!fm.description) errors.push(`${rel} : frontmatter sans champ \`description\``);
  }
}

checkJson(".claude-plugin/plugin.json");
checkJson(".claude-plugin/marketplace.json");
checkSkills();

if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} problème(s) de cohérence plugin.`);
  process.exit(1);
}
console.log("✓ cohérence plugin OK (manifestes + frontmatters skills)");
