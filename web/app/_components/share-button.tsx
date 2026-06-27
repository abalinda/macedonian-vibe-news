'use client';

import { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { buildShareChannels, toAbsoluteUrl } from '@/lib/share';

const ShareIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path strokeLinecap="round" d="M8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9" />
  </svg>
);

type ShareButtonProps = {
  /** Path ("/blog/12") or absolute source URL to share. */
  url: string;
  title: string;
  /** "icon" = compact circle (cards/hero); "pill" = icon + label (article header). */
  variant?: 'icon' | 'pill';
  label?: string;
  /** Which edge the fallback menu aligns to. */
  align?: 'left' | 'right';
  className?: string;
  /** Where the share happened, for analytics. */
  context?: string;
};

export function ShareButton({
  url,
  title,
  variant = 'icon',
  label = 'Сподели',
  align = 'right',
  className = '',
  context = 'unknown',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const absoluteUrl = toAbsoluteUrl(url);
  const channels = buildShareChannels({ url: absoluteUrl, title });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const capture = (method: string) => {
    try {
      posthog.capture('share_clicked', { method, context, url: absoluteUrl });
    } catch {
      // best-effort
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    // Hosts wrap stories in <a>; never let a share click navigate the card.
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: absoluteUrl });
        capture('native');
        return;
      } catch {
        // user cancelled or it failed — fall back to the menu
      }
    }
    setOpen((v) => !v);
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      capture('copy');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — leave the menu open so the user can long-press a channel
    }
  };

  const triggerClass =
    variant === 'pill'
      ? 'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-ink transition-all hover:bg-accent hover:text-black hover:shadow-[4px_4px_0_var(--shadow)]'
      : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink transition-all hover:bg-accent hover:text-black hover:shadow-[4px_4px_0_var(--shadow)]';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className={triggerClass}
      >
        <ShareIcon className={variant === 'pill' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
        {variant === 'pill' && <span>{label}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-[70] mt-2 w-[min(80vw,240px)] overflow-hidden rounded-md border border-line bg-surface shadow-[10px_10px_0_var(--shadow)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center justify-between gap-3 border-b border-line-soft px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-surface-2"
          >
            <span>{copied ? 'Копирано!' : 'Копирај линк'}</span>
            <span aria-hidden className="font-mono text-muted">{copied ? '✓' : '⧉'}</span>
          </button>

          {channels.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                capture(c.key);
                setOpen(false);
              }}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-surface-2"
              role="menuitem"
            >
              <span>{c.label}</span>
              <span aria-hidden className="font-mono text-muted transition-transform">→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
