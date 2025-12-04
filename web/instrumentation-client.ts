//-- POSTHOG ANALYTICS SETUP --

import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    // api_host: 'https://eu.i.posthog.com',
    api_host: '/relay-Z6aO/',
    // api_host: 'https://webhook.site/f63a1af5-2df8-4d86-aac1-36bb3b2b244f',
    ui_host: 'https://eu.posthog.com',
    defaults: '2025-11-30',
});
            