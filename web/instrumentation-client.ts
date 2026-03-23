//-- POSTHOG ANALYTICS SETUP --

import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://t.vibes.mk',
    defaults: '2026-01-30'
});