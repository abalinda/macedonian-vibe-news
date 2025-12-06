'use client'
import posthog from 'posthog-js'
import { PostHogProvider} from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2025-05-24',
      opt_in_site_apps: true,
      person_profiles: 'identified_only',
    })
  }, []);

  return <PostHogProvider client={posthog}>
    {children}
    </PostHogProvider>
}