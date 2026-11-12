#!/usr/bin/env bash
# Build this checkout as the staging image and run it on the Hetzner VM (staging.elogade.com).
#
# Staging talks to the Sharetribe Test environment (checkme-test), never Live. The image is built
# locally for linux/amd64 and copied over SSH (`docker load`); it is not pushed to GHCR, so CI and
# Watchtower (which update Live) are not involved.
#
# Usage, from the repository root:
#   STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_... deploy/staging/build-and-deploy.sh
#
# Public build-time values (they end up in the browser bundle) are read from the local .env, which
# must hold the checkme-test client id. Runtime secrets live only in ~/web-template-staging/staging.env
# on the VM (see staging.env.example).
set -euo pipefail

SSH_HOST="${SSH_HOST:-elogade}"
IMAGE=elogade-web:staging

envval() { grep -E "^$1=" .env | head -1 | cut -d= -f2- ; }

# Without these the build succeeds but checkout says the Stripe key is not configured (or the app
# can't reach Sharetribe), so stop here instead.
if [ ! -f .env ] || [ -z "$(envval REACT_APP_SHARETRIBE_SDK_CLIENT_ID)" ]; then
  echo "Missing .env or REACT_APP_SHARETRIBE_SDK_CLIENT_ID in it (run from the repository root)." >&2
  exit 1
fi
case "${STAGING_STRIPE_PUBLISHABLE_KEY:-}" in
  pk_test_*) ;;
  *)
    echo "Set STAGING_STRIPE_PUBLISHABLE_KEY to the checkme-test Stripe key (pk_test_...)." >&2
    exit 1
    ;;
esac

docker buildx build --platform linux/amd64 --load -t "$IMAGE" \
  --build-arg REACT_APP_SHARETRIBE_SDK_CLIENT_ID="$(envval REACT_APP_SHARETRIBE_SDK_CLIENT_ID)" \
  --build-arg REACT_APP_STRIPE_PUBLISHABLE_KEY="${STAGING_STRIPE_PUBLISHABLE_KEY:-}" \
  --build-arg REACT_APP_MAPBOX_ACCESS_TOKEN="$(envval REACT_APP_MAPBOX_ACCESS_TOKEN)" \
  --build-arg REACT_APP_MARKETPLACE_ROOT_URL="https://staging.elogade.com" \
  --build-arg REACT_APP_MARKETPLACE_NAME="$(envval REACT_APP_MARKETPLACE_NAME)" \
  --build-arg REACT_APP_CSP=report \
  --build-arg REACT_APP_ENV=production \
  --build-arg REACT_APP_SHARETRIBE_USING_SSL=true \
  --build-arg REACT_APP_PRICE_OFFERS_ENABLED=true \
  --build-arg REACT_APP_WALLET_PAYMENTS_ENABLED=true \
  .

docker save "$IMAGE" | gzip -1 | ssh "$SSH_HOST" 'gunzip | docker load'
ssh "$SSH_HOST" 'cd ~/web-template-staging && docker compose up -d --force-recreate && docker image prune -f >/dev/null'
