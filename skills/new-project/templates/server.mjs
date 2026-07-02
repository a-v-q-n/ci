// App « hello » minimale d'onboarding — serveur HTTP sans dépendance (Node natif). Sert deux routes :
//   GET /healthz → { ok: true, sha }  (sonde de déploiement ; sha = commit de l'image, cache no-store)
//   GET /*       → une page « hello » qui affiche le sha servi.
// C'est le squelette déployable posé par /new-project ; la vraie stack est amenée ensuite par /dev.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT) || 3000;
const SHA = process.env.GIT_SHA || null;

export function handler(req, res) {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: true, sha: SHA }));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(
    `<!doctype html><meta charset="utf-8"><title>{{REPO}}</title>` +
      `<h1>{{REPO}} — hello</h1><p>sha : ${SHA ?? "dev"}</p>`,
  );
}

// N'écoute que lancé directement (`node server.mjs`) — pas quand les tests importent `handler`.
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handler).listen(PORT, () => {
    console.log(`{{REPO}} à l'écoute sur :${PORT}`);
  });
}
