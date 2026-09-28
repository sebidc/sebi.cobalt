# Pin the API so the small compatibility patches fail visibly on upstream changes.
FROM ghcr.io/imputnet/cobalt:11@sha256:63186dd68afd57ce3bb1f62cc4c139f5fa95b9c3e87a3cf5c6e4c7a570523f62 AS provider-build
USER root
RUN apk add --no-cache git python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev
RUN git clone https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /provider \
    && cd /provider && git checkout 37169ee2656e08c5c2e5dc9df4c598c0cb4c88a8
WORKDIR /provider/server
RUN npm ci --no-audit --no-fund && npx tsc && npm prune --omit=dev --no-audit --no-fund

FROM ghcr.io/imputnet/cobalt:11@sha256:63186dd68afd57ce3bb1f62cc4c139f5fa95b9c3e87a3cf5c6e4c7a570523f62
USER root
RUN apk add --no-cache cairo pango libjpeg-turbo giflib pixman
COPY --from=provider-build --chown=node:node /provider/server/build /app/session-provider/build
COPY --from=provider-build --chown=node:node /provider/server/node_modules /app/session-provider/node_modules
COPY --from=provider-build --chown=node:node /provider/server/package.json /app/session-provider/package.json
COPY --from=provider-build --chown=node:node /provider/LICENSE /app/session-provider/LICENSE
COPY --chown=node:node backend/patch-cobalt.mjs /app/patch-cobalt.mjs
RUN node /app/patch-cobalt.mjs
COPY --chown=node:node backend/supervisor.mjs /app/supervisor.mjs
COPY --chown=node:node --chmod=755 backend/start.sh /app/sebi-start.sh
USER node
CMD ["/app/sebi-start.sh"]
