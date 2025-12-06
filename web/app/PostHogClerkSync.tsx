'use client'
import posthog from 'posthog-js'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function PostHogClerkSync() {
  const { isLoaded, user } = useUser()

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // User is signed in - identify them
        const email = user.emailAddresses[0]?.emailAddress
        
        posthog.identify(email, {
            name: user.fullName
        })
        
      } else {
        // User is signed out - reset PostHog
        posthog.reset()
      }
    }
  }, [isLoaded, user])

  return null
}
