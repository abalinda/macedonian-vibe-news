import type { SVGProps } from "react";

/**
 * Vibes signature mark — an abstract ray-burst (a "vibe": a spark of rays around
 * a solid core). Drawn in `currentColor`, so it inherits the accent yellow
 * (`text-accent`) or ink wherever it sits, and flips correctly in dark mode.
 *
 * Deliberately NOT the 16-ray Vergina sun (a politically contested symbol):
 * eight even rays around a filled core, in the brand's hard, geometric register.
 * This is THE one identity mark — keep its use intentional (hero, section ticks,
 * loading/empty states). See DESIGN_SYSTEM.md §6.
 */
export function RayBurst({ className = "h-4 w-4", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <g stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
        <path d="M12 1.6v3.4" />
        <path d="M12 19v3.4" />
        <path d="M1.6 12h3.4" />
        <path d="M19 12h3.4" />
        <path d="M4.7 4.7l2.4 2.4" />
        <path d="M16.9 16.9l2.4 2.4" />
        <path d="M19.3 4.7l-2.4 2.4" />
        <path d="M7.1 16.9l-2.4 2.4" />
      </g>
    </svg>
  );
}
