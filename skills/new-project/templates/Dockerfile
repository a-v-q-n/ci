# syntax=docker/dockerfile:1
# Image immuable de l'app « hello ». Coolify ne build jamais : cette image est construite+testée par
# la CI, taguée sha-<commit>, poussée sur GHCR, et Coolify la pull par sha. App sans dépendance →
# une seule étape. Quand la vraie stack arrive (deps, build), passer en multi-étage (deps → build →
# runtime), en gardant ARG GIT_SHA + HEALTHCHECK + PORT dynamique.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Sha du commit buildé (passé par la CI en build-arg) — exposé par /healthz pour vérifier le déploiement.
ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA
COPY package.json server.mjs ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
