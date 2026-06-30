#!/usr/bin/env bash
# Script de configuration de l'environnement cloud AVQN.
# Deux jobs : (1) installer le plugin avqn-dev en scope user (skills méthodo) ;
# (2) enregistrer le MCP Playwright au scope user.
#
# POURQUOI un tarball curl et pas `claude plugin marketplace add manu-bernard/avqn-dev` :
# dans le sandbox cloud, git est PROXIFIÉ aux sources (tout `git clone` est réécrit vers
# 127.0.0.1:<port> et renvoie 403 pour un repo hors-source, public OU privé). Le proxy ne
# touche QUE git : curl/HTTP sort librement (réseau « Complet »). Donc on récupère le repo
# PUBLIC `manu-bernard/avqn-dev` via tarball HTTP (curl), puis on installe depuis le dossier
# local. Marche sans qu'avqn-dev soit déclaré en source — d'où « un seul repo ouvert ».
# Le repo DOIT être public (curl sans auth).
#
# NB : ces lignes sont la copie de référence. Dans le champ « Script de configuration » de
# l'env (UI), colle la version SANS commentaires (le champ casse les `#` repliés) — voir
# le fichier de bureau généré au moment du chantier, ou recopie les 8 lignes utiles.
set -uo pipefail
exec >>/tmp/avqn-env-setup.log 2>&1
echo "== setup avqn-dev @ $(date -u +%FT%TZ) =="

# Plugin méthodo AVQN : tarball du repo public → marketplace par dossier local → install scope user.
URL=https://github.com/manu-bernard/avqn-dev/archive/refs/heads/main.tar.gz
rm -rf /root/.avqn
mkdir -p /root/.avqn
curl -fsSL -o /root/.avqn/src.tar.gz "$URL"
tar xzf /root/.avqn/src.tar.gz -C /root/.avqn
claude plugin marketplace add /root/.avqn/avqn-dev-main \
  && claude plugin install avqn-dev@avqn-dev --scope user \
  && echo "plugin avqn-dev OK" || echo "plugin avqn-dev KO"

# Chromium est déjà fourni par l'image (PLAYWRIGHT_BROWSERS_PATH). --no-sandbox (root),
# --executable-path (sinon le MCP veut télécharger chrome-for-testing).
claude mcp add playwright --scope user -- \
  npx -y @playwright/mcp@latest --headless --isolated --no-sandbox \
  --browser chromium --executable-path /opt/pw-browsers/chromium \
  && echo "mcp add OK" || echo "mcp add KO"
claude mcp list || true

echo "== fin setup avqn-dev =="
