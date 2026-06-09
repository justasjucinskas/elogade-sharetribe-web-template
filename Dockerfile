# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
#
# The check above is intentionally skipped: the only sensitively-named ARG/ENV
# here are REACT_APP_* public client config (e.g. the Stripe *publishable* key and
# Mapbox access token), which are inlined into the browser bundle by design and
# are not secret. Real secrets (SHARETRIBE_SDK_CLIENT_SECRET etc.) are runtime-only
# and never appear as build args/ENV.
#
# Multi-stage build for the Sharetribe web template (React 18 + Express SSR).
#
# The app is a single stateless Node process: `node server/index.js` serves SSR
# pages + the privileged /api endpoints. There is no database — all marketplace
# state lives in Sharetribe's cloud.
#
# IMPORTANT — two classes of env vars:
#   * REACT_APP_*  are inlined into the CLIENT bundle at BUILD time, so they are
#     passed as --build-arg below. They are NOT secret (they ship in the browser
#     bundle regardless). Some of them (CLIENT_ID, MARKETPLACE_ROOT_URL) are ALSO
#     read server-side at runtime, so they must additionally be in the runtime
#     env file (see deploy/web-template.env.example).
#   * Real secrets (SHARETRIBE_SDK_CLIENT_SECRET, FACEBOOK_APP_SECRET,
#     GOOGLE_CLIENT_SECRET) are RUNTIME-only and are never baked into the image.

##############################
# Stage 1 — build the bundles
##############################
FROM node:22-bookworm AS builder
WORKDIR /app

# Install deps first for better layer caching. patches/ must be present because
# `postinstall` runs patch-package (patches final-form + @testing-library).
COPY package.json yarn.lock ./
COPY patches ./patches
RUN yarn install --frozen-lockfile

# App source (node_modules and build/ are excluded via .dockerignore, so the
# freshly installed deps and a clean build survive the copy).
COPY . .

# Public, build-time configuration baked into the client bundle.
ARG REACT_APP_SHARETRIBE_SDK_CLIENT_ID
ARG REACT_APP_STRIPE_PUBLISHABLE_KEY
ARG REACT_APP_MAPBOX_ACCESS_TOKEN
ARG REACT_APP_MARKETPLACE_ROOT_URL
ARG REACT_APP_MARKETPLACE_NAME
ARG REACT_APP_FACEBOOK_APP_ID
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_CSP=report
ARG REACT_APP_ENV=production
ARG REACT_APP_SHARETRIBE_USING_SSL=true

ENV REACT_APP_SHARETRIBE_SDK_CLIENT_ID=$REACT_APP_SHARETRIBE_SDK_CLIENT_ID \
    REACT_APP_STRIPE_PUBLISHABLE_KEY=$REACT_APP_STRIPE_PUBLISHABLE_KEY \
    REACT_APP_MAPBOX_ACCESS_TOKEN=$REACT_APP_MAPBOX_ACCESS_TOKEN \
    REACT_APP_MARKETPLACE_ROOT_URL=$REACT_APP_MARKETPLACE_ROOT_URL \
    REACT_APP_MARKETPLACE_NAME=$REACT_APP_MARKETPLACE_NAME \
    REACT_APP_FACEBOOK_APP_ID=$REACT_APP_FACEBOOK_APP_ID \
    REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID \
    REACT_APP_CSP=$REACT_APP_CSP \
    REACT_APP_ENV=$REACT_APP_ENV \
    REACT_APP_SHARETRIBE_USING_SSL=$REACT_APP_SHARETRIBE_USING_SSL \
    NODE_ENV=production \
    GENERATE_SOURCEMAP=false

# Builds build/ (web bundle) + build/node (server bundle imported by the server).
RUN yarn build

# Drop dev dependencies. This keeps the already-patched production deps (e.g.
# final-form) and does NOT re-run patch-package, so the dev-only patch
# (@testing-library/user-event) is not re-evaluated against a now-absent package.
# The runtime requires src/util/locale.js + src/config/configLocale.js, which are
# intentionally framework-free CommonJS — no Babel transpilation at runtime.
# Also drop the webpack build cache so it doesn't bloat the runtime image.
RUN npm prune --omit=dev && rm -rf node_modules/.cache

##############################
# Stage 2 — slim runtime
##############################
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Bring over the built app + pruned production node_modules.
COPY --from=builder /app ./

# Run as the non-root user that ships with the node image.
USER node

EXPOSE 3000

# Liveness: confirm the Node process is accepting TCP connections on PORT.
# Deliberately a raw socket check (not an HTTP GET to /) so the probe does not
# trigger SSR + Sharetribe asset-delivery calls on every interval.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "const s=require('net').connect(process.env.PORT||3000,'127.0.0.1');s.on('connect',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));"

CMD ["node", "server/index.js"]
