# Deploying to the Hetzner VM (Docker + GHCR + Watchtower + Caddy)

The app is a single **stateless** Node SSR process (`node server/index.js`) with
**no database** — all marketplace state lives in Sharetribe's cloud. Deployment is
therefore just: build an image in CI → push to GHCR → Watchtower pulls it on the
VM → Caddy reverse-proxies to it over HTTPS.

```
GitHub push to main ──▶ .github/workflows/docker-publish.yml
                          builds image, pushes ghcr.io/<owner>/<repo>:latest
                                            │
VM:  Watchtower polls GHCR ──pull──▶ recreates `web-template` (127.0.0.1:3000)
     Caddy ──reverse_proxy──▶ 127.0.0.1:3000   (TLS via Let's Encrypt)
```

## One-time setup

### 1. GitHub repository config
Add under **Settings → Secrets and variables → Actions** (see the header of
`.github/workflows/docker-publish.yml` for the exact list):
- **Secrets**: `REACT_APP_SHARETRIBE_SDK_CLIENT_ID`, `REACT_APP_STRIPE_PUBLISHABLE_KEY`, `REACT_APP_MAPBOX_ACCESS_TOKEN`
- **Variables**: `REACT_APP_MARKETPLACE_ROOT_URL`, `REACT_APP_MARKETPLACE_NAME`, `REACT_APP_CSP`, and optionally the Facebook/Google client IDs

Push to `main` (or run the workflow manually) to publish the first image. Make the
GHCR package **public**, or give the VM a read token (below).

### 2. VM: pull access to GHCR
If the package is private, log Docker in once on the VM with a GitHub PAT that has
`read:packages`:
```sh
echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin
```
Watchtower reuses this stored credential.

### 3. VM: app files
```sh
sudo mkdir -p /opt/web-template && cd /opt/web-template
# copy deploy/docker-compose.yml here, then:
cp /path/to/web-template.env.example web-template.env   # fill in real values
sudo chmod 600 web-template.env
docker compose up -d
```

### 4. VM: Caddy
Add the block from `Caddyfile.snippet` to your Caddyfile (swap in your domain) and
reload Caddy. It auto-provisions the TLS cert. Because Caddy terminates TLS and the
container has `SERVER_SHARETRIBE_TRUST_PROXY=true` + `SERVER_SHARETRIBE_REDIRECT_SSL=true`,
the app correctly sees HTTPS and redirects bare HTTP.

## Releasing a new version
Just push to `main`. CI rebuilds `:latest`, Watchtower notices the new digest and
recreates the container. No manual step on the VM.

To deploy by hand instead:
```sh
docker compose pull && docker compose up -d
```

## Notes / gotchas
- **`REACT_APP_*` are build-time.** They're inlined into the browser bundle by CI.
  Changing one means a **rebuild**, not just an env-file edit. The subset the server
  also reads at runtime (`REACT_APP_SHARETRIBE_SDK_CLIENT_ID`,
  `REACT_APP_MARKETPLACE_ROOT_URL`) must match in both places.
- **Secrets never enter the image** — `SHARETRIBE_SDK_CLIENT_SECRET`,
  `FACEBOOK_APP_SECRET`, `GOOGLE_CLIENT_SECRET` are supplied only via
  `web-template.env` at runtime.
- **No persistent volumes needed.** Nothing is written to disk that must survive a
  redeploy.
- **Healthcheck** is a raw TCP check on `PORT`; `docker ps` shows health status.
