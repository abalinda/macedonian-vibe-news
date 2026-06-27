/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

const STORAGE_KEY = 'vibes-theme';

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <circle cx="12" cy="12" r="4" />
    <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

const applyTheme = (dark: boolean) => {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  const color = dark ? '#141210' : '#FDFBF7';
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', color));
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // storage may be unavailable (private mode); the class still applies for the session
  }
};

type ThemeToggleProps = {
  /** "icon" = compact circular button (nav bar); "row" = full-width labeled row (drawer). */
  variant?: 'icon' | 'row';
  className?: string;
};

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // The no-flash script already set the class before paint; read it on mount.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    try {
      posthog.capture('theme_toggled', { theme: next ? 'dark' : 'light' });
    } catch {
      // analytics is best-effort
    }
  };

  const label = isDark ? 'Светла тема' : 'Темна тема';

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isDark}
        aria-label={label}
        className={`group flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5 ${className}`}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-ink" suppressHydrationWarning>
            {mounted && isDark ? <MoonIcon /> : <SunIcon />}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink" suppressHydrationWarning>
            {mounted ? label : 'Тема'}
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted" suppressHydrationWarning>
          {mounted ? (isDark ? 'Dark' : 'Light') : ''}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-all hover:bg-accent hover:text-black hover:shadow-[4px_4px_0_var(--shadow)] ${className}`}
    >
      <span suppressHydrationWarning>{mounted && isDark ? <MoonIcon /> : <SunIcon />}</span>
    </button>
  );
}
