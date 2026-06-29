'use client'
import { useEffect, useId, useRef, useState } from "react";
import { RayBurst } from "./ray-burst";

/**
 * AI-curation disclosure — the small "?" affordance that sits beside a curation
 * label (e.g. the hero's "Избор на денот" eyebrow) and, on tap, plainly explains
 * that Vibes selects and summarizes the news with AI. This makes the product's
 * core promise — *"everything is hand/AI-curated"* (DESIGN_SYSTEM.md §1) —
 * visible and honest instead of hidden in the backend.
 *
 * Research basis: leading outlets pair AI summaries with an explicit, one-tap
 * disclosure (e.g. the WSJ "What's this?" pattern). The ray-burst is reused here
 * as Vibes' AI-curation mark. See web/VIBES_V2_PLAN.md (Theme C).
 *
 * Renders as a sibling control (NOT nested inside the story link), so it is
 * independently interactive and keyboard-accessible.
 */
export function AiDisclosure({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Што е ова? Како Vibes ги курира вестите"
        onClick={() => setOpen((value) => !value)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-[9px] font-bold leading-none text-muted transition-colors hover:bg-ink hover:text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        ?
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Како Vibes ги курира вестите"
          className="absolute left-1/2 top-[160%] z-[70] w-[min(86vw,300px)] -translate-x-1/2 rounded-xl border border-line bg-surface p-4 text-left shadow-[10px_10px_0_var(--shadow)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <RayBurst className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Курирано со ВИ
            </span>
          </div>
          <p className="font-sans text-xs normal-case leading-relaxed text-ink">
            Vibes користи вештачка интелигенција за да избере и резимира вести од
            македонски извори. Изворот е секогаш означен — допри „Прочитај повеќе“
            за целата приказна.
          </p>
        </div>
      )}
    </span>
  );
}
