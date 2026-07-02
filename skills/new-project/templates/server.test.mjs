// Gate minimale (test runner natif : `node --test`). Vérifie le contrat des deux routes
// sans ouvrir de socket : on appelle `handler` avec un faux req/res.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handler } from "./server.mjs";

function call(url) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 0,
      headers: {},
      body: "",
      writeHead(code, headers) {
        this.statusCode = code;
        Object.assign(this.headers, headers);
      },
      end(body) {
        this.body = body ?? "";
        resolve(this);
      },
    };
    handler({ url }, res);
  });
}

test("/healthz répond 200 avec { ok, sha }", async () => {
  const res = await call("/healthz");
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /json/);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.ok("sha" in body);
});

test("la racine répond 200 en HTML", async () => {
  const res = await call("/");
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /html/);
});
