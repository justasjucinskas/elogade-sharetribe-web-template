# Staging: staging.elogade.com

A second copy of the app on the same Hetzner VM as Live, for testing branches with other people
before they reach Live. It talks to the Sharetribe **Test** environment (`checkme-test`), so all
users, listings and payments there are test data (Stripe test mode).

```
Mac: deploy/staging/build-and-deploy.sh ──docker save | ssh──▶ VM: elogade-web:staging
VM:  Caddy staging.elogade.com ──▶ 127.0.0.1:3002 ──▶ container elogade-web-staging
     (Live: www.elogade.com ──▶ 127.0.0.1:3000 ──▶ elogade-web, unchanged)
```

- Files on the VM: `~/web-template-staging/` (`docker-compose.yml` = the copy in this folder,
  `staging.env` = from `staging.env.example`, chmod 600).
- The image is never pushed to GHCR. CI and Watchtower only touch Live (`:latest`); the staging
  container is labelled so Watchtower ignores it.
- Sharetribe's own hosted site for `checkme-test` keeps running Sharetribe's standard UI. Features
  that only exist in this code (e.g. price offers) are only visible on staging.elogade.com. Emails
  from `checkme-test` link to the marketplace URL set in Console, not here.

## Deploy a branch

From the repository root, with the `checkme-test` client id in `.env`:

```sh
STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_... deploy/staging/build-and-deploy.sh
```

The build runs on the Mac (x86 emulation), so the VM serving Live isn't loaded by it.

## Caddy block (in /etc/caddy/Caddyfile, reload with `caddy reload --config /etc/caddy/Caddyfile`)

```
staging.elogade.com {
	encode zstd gzip
	header X-Robots-Tag "noindex, nofollow"
	reverse_proxy localhost:3002 {
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
	}
}
```

Needs the DNS record `staging.elogade.com A 167.233.69.226` first, so Caddy can get the certificate.

## Remove

```sh
ssh elogade 'cd ~/web-template-staging && docker compose down && docker image rm elogade-web:staging'
```

then delete the Caddy block and reload Caddy.
