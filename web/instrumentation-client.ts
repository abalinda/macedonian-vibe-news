// instrumentation-client.ts  
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  // Ingestion goes through the first-party subdomain `t.vibes.mk` (see
  // /posthog-proxy) so events aren't dropped by ad/tracking blockers that match
  // on PostHog's own domains. `ui_host` stays on the real host so in-app links
  // (toolbar, "view in PostHog") resolve correctly.
  api_host: 'https://t.vibes.mk',
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-01-30',  
  opt_in_site_apps: true,  
  person_profiles: 'always',  
})  
