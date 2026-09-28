# Patrick's public meowing.de fork, pinned to the commit reported by his API.
# Source and credits: https://github.com/zImPatrick/cobalt/tree/52943246af06ffcd6cc2af9aefbde959e4fc131a
FROM node:24-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache git python3 alpine-sdk
WORKDIR /source
RUN git init && git remote add origin https://github.com/zImPatrick/cobalt.git \
    && git fetch --depth=1 origin 52943246af06ffcd6cc2af9aefbde959e4fc131a \
    && git checkout FETCH_HEAD
RUN corepack enable && pnpm install --frozen-lockfile \
    && pnpm deploy --filter=@imput/cobalt-api --prod /prod/api

FROM node:24-alpine
WORKDIR /app
COPY --from=build --chown=node:node /prod/api /app
COPY --from=build --chown=node:node /source/.git /app/.git
COPY --chown=node:node --chmod=755 backend/start.sh /app/sebi-start.sh
USER node
CMD ["/app/sebi-start.sh"]
