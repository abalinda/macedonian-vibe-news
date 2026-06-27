'use client'

import posthog from 'posthog-js'
import Link from 'next/link'

export function ContactLink() {
  return (
    <Link
      href="mailto:contact@vibes.mk"
      onClick={() => posthog.capture('contact_email_clicked')}
      className="group flex items-center gap-2 font-sans text-lg font-bold border-2 border-line rounded-full px-12 py-4 hover:bg-ink hover:text-paper transition-all"
    >
      contact@vibes.mk
      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
    </Link>
  )
}
