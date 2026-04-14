// instrumentation-client.ts  
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {  
  // api_host: 'https://t.vibes.mk',  
  api_host: 'https://eu.posthog.com',  
  ui_host: 'https://eu.posthog.com',  
  defaults: '2026-01-30',  
  opt_in_site_apps: true,  
  person_profiles: 'always',  
})  
