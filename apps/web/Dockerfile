# syntax=docker/dockerfile:1

# Built from the repo root:
#   docker build -f apps/web/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --filter @task-manager/web...

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Baked into the client bundle at build time; empty means "call my own origin",
# which the rewrite in next.config.ts then proxies to the API service.
ENV NEXT_PUBLIC_API_URL=""

# Next resolves rewrites() at BUILD time into the routes manifest, so this has
# to be set here — setting it only at runtime leaves the proxy pointing at
# localhost. `api` is the compose service name.
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL

RUN pnpm --filter @task-manager/web build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `output: 'standalone'` traces exactly the files the server needs, so the
# runtime image carries no build tooling.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
