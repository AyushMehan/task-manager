# syntax=docker/dockerfile:1

# Built from the repo root so the pnpm workspace (and packages/shared) is visible:
#   docker build -f apps/api/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /repo

FROM base AS build
# Manifests first, so a source-only change reuses the cached install layer.
# Every workspace manifest must be present or --frozen-lockfile rejects the
# workspace as inconsistent with the lockfile.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# `--filter <pkg>...` restricts the install to this app and its workspace
# dependencies, so the API image never downloads Next.js.
# --frozen-lockfile so a mis-tagged "latest" upstream can never change versions.
RUN pnpm install --frozen-lockfile --filter @task-manager/api...

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# `prisma generate` only reads the schema, but prisma.config.ts resolves
# DATABASE_URL strictly and would fail the build. A placeholder satisfies it;
# the real URL is injected by compose at runtime.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"     pnpm --filter @task-manager/api exec prisma generate
RUN pnpm --filter @task-manager/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api

EXPOSE 4000
# Migrations are applied on every boot: `migrate deploy` is idempotent, so the
# schema self-heals after a pull without a manual step.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
