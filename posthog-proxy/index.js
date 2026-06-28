// PostHog reverse proxy for vibes.mk
//
// Fronts PostHog (EU cloud) behind the first-party subdomain `t.vibes.mk` so
// that analytics requests are not dropped by ad/tracking blockers, which match
// on PostHog's own domains. The browser talks only to `t.vibes.mk`; this Worker
// forwards to PostHog.
//
// Host choice:
//   API_HOST  -> `eu-proxy-direct.i.posthog.com` is PostHog's ingestion endpoint
//                that reads the visitor's real IP from `x-forwarded-for` instead
//                of seeing Cloudflare's egress IP. Using the plain
//                `eu.i.posthog.com` here would make every visitor appear at a
//                Cloudflare datacenter location. Switch to `eu.i.posthog.com`
//                only if you do not care about geolocation.
//   ASSET_HOST -> static SDK assets (array.js, recorder, etc.) live on a
//                separate assets host and are cached at the edge.
//
// Region note: these are EU-region hosts. For US cloud use
// `us-proxy-direct.i.posthog.com` / `us-assets.i.posthog.com`.

const API_HOST = "eu-proxy-direct.i.posthog.com";
const ASSET_HOST = "eu-assets.i.posthog.com";

async function handleRequest(request, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;
  const pathWithParams = pathname + search;

  if (pathname.startsWith("/static/")) {
    return retrieveStatic(request, pathWithParams, ctx);
  }
  return forwardRequest(request, pathWithParams);
}

async function retrieveStatic(request, pathname, ctx) {
  let response = await caches.default.match(request);
  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathname}`);
    ctx.waitUntil(caches.default.put(request, response.clone()));
  }
  return response;
}

async function forwardRequest(request, pathWithSearch) {
  const originRequest = new Request(request);
  originRequest.headers.delete("cookie");
  return fetch(`https://${API_HOST}${pathWithSearch}`, originRequest);
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, ctx);
  },
};
