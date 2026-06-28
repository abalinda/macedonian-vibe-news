# posthog-proxy

A standalone Cloudflare Worker that reverse-proxies PostHog (EU cloud) behind
**`t.vibes.mk`**, so analytics requests are first-party and survive ad/tracking
blockers (which match on PostHog's own domains like `eu.i.posthog.com`).

This is **separate** from the Next.js app Worker (`web/`, name
`macedonian-vibe-news`). It has its own name (`posthog-proxy`) and deploys
independently — deploying one never touches the other.

## How it works

```
browser ──▶ https://t.vibes.mk/*  ──▶  this Worker ──▶ eu-proxy-direct.i.posthog.com  (ingestion)
                                                  └──▶ eu-assets.i.posthog.com         (/static/* SDK assets)
```

The app points PostHog at this subdomain in `web/instrumentation-client.ts`:

```ts
api_host: 'https://t.vibes.mk',   // ingestion + assets via this Worker
ui_host:  'https://eu.posthog.com' // PostHog app links stay on the real host
```

## Prerequisites

- The `vibes.mk` DNS zone is on the Cloudflare account you deploy from.
- Wrangler is authenticated to that account: `npx wrangler login`
  (or `CLOUDFLARE_API_TOKEN` set with Workers + DNS edit permissions).

## Deploy

```bash
cd posthog-proxy
npx wrangler deploy
```

`routes[].custom_domain: true` makes Wrangler create the `t.vibes.mk` DNS record
and provision its TLS certificate automatically. First deploy may take a few
minutes for the cert to go live.

> If your Cloudflare account proxies DNS (orange cloud) for other records, the
> custom-domain binding handles routing itself — you do **not** need a manual
> CNAME. If you instead create DNS by hand, point `t.vibes.mk` at the Worker and
> keep the subdomain neutral (done — `t` avoids blocker keywords like
> `analytics`/`tracking`).

## Verify

After deploy and DNS propagation:

```bash
# Should return PostHog's ingestion response (not a 5xx / parked page)
curl -sS "https://t.vibes.mk/static/array.js" -o /dev/null -w "%{http_code}\n"
```

Then load vibes.mk in a browser with an ad-blocker enabled and confirm
`$pageview` events still arrive in PostHog. Cross-check the volume against
Google Analytics — the gap that was previously missing is the blocked traffic
this proxy recovers.

## Geolocation note

`API_HOST` is `eu-proxy-direct.i.posthog.com` (not `eu.i.posthog.com`) so PostHog
reads the visitor's real IP from `x-forwarded-for` rather than the Cloudflare
edge IP. Without it, every visitor would be geolocated to a Cloudflare
datacenter. Change it in `index.js` only if geolocation accuracy doesn't matter.
