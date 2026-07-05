"use client";

import { useCallback, useEffect, useState } from "react";
import { SignUpButton, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

const STORAGE_KEY = "vibes_tvoi_vesti_promo_seen";
const WELCOME_KEY = "vibes_welcome_seen";
const WELCOME_SESSION_KEY = "vibes_welcome_shown_session";
const PROMO_SESSION_KEY = "vibes_tvoi_vesti_promo_shown_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Presence check across cookie OR localStorage (mirror of welcome-modal).
const readFlag = (key: string) => {
  if (typeof document === "undefined") return false;
  const fromCookie = document.cookie
    .split(";")
    .some((entry) => entry.trim().startsWith(`${key}=`));
  const fromStorage = (() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(key);
    } catch {
      return null;
    }
  })();
  return Boolean(fromCookie || fromStorage);
};

const rememberPromo = () => {
  if (typeof document !== "undefined") {
    document.cookie = `${STORAGE_KEY}=1; path=/; max-age=${COOKIE_MAX_AGE}`;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  } catch {
    // Non-blocking: storage could be disabled
  }
};

const welcomeShownThisSession = () => {
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(WELCOME_SESSION_KEY) === "1"
    );
  } catch {
    return false;
  }
};

const promoShownThisSession = () => {
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(PROMO_SESSION_KEY) === "1"
    );
  } catch {
    return false;
  }
};

const markPromoShownThisSession = () => {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(PROMO_SESSION_KEY, "1");
    }
  } catch {
    // Non-blocking: storage could be disabled
  }
};

const capture = (event: string) => {
  try {
    posthog.capture(event);
  } catch {
    // Analytics must never break the UI.
  }
};

export const TvoiVestiPromoModal = () => {
  const { isLoaded, user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const dismiss = useCallback(() => {
    rememberPromo();
    capture("tvoi_vesti_promo_dismiss");
    setIsOpen(false);
  }, []);

  const onSignupClick = useCallback(() => {
    rememberPromo();
    capture("tvoi_vesti_promo_signup_click");
    setIsOpen(false);
  }, []);

  // Return-visit, signed-out gate — evaluated once Clerk has loaded.
  useEffect(() => {
    if (!isLoaded) return; // wait for Clerk
    if (user) return; // signed-in users never get an account pitch
    if (readFlag(STORAGE_KEY)) return; // already saw the promo
    if (!readFlag(WELCOME_KEY)) return; // first visit: welcome owns the moment
    if (welcomeShownThisSession()) return; // don't stack in the same session
    if (promoShownThisSession()) return; // don't re-show within one session
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(true);
    markPromoShownThisSession();
    capture("tvoi_vesti_promo_shown");
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 md:px-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      <div className="relative max-w-[580px] w-full bg-paper border border-line rounded-2xl shadow-[14px_14px_0_var(--shadow)] overflow-hidden">
        <div className="absolute -left-10 -top-10 h-28 w-28 bg-accent rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -right-12 bottom-0 h-28 w-28 bg-neutral-200 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative p-6 md:p-8 space-y-5">
          <div className="space-y-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-600">
              Твои Вести
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-black leading-[1.05] text-ink">
              Вести избрани спрема тебе.
            </h2>
            <p className="text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans max-w-xl mx-auto">
              Направи бесплатен профил и добивај вести избрани според тоа што те
              интересира — сè на едно место.
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 items-center justify-center text-center">
            <SignUpButton mode="modal">
              <button
                onClick={onSignupClick}
                className="w-full md:w-auto px-5 py-3 bg-ink text-paper font-bold text-xs uppercase tracking-[0.25em] rounded-xl border border-line transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[10px_12px_0_var(--shadow)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]"
              >
                Направи профил
              </button>
            </SignUpButton>
            <button
              onClick={dismiss}
              className="w-full md:w-auto px-5 py-3 bg-surface text-ink font-bold text-xs uppercase tracking-[0.25em] rounded-xl border border-line/50 transition-all duration-200 ease-out hover:border-line hover:bg-accent hover:text-black hover:-translate-y-0.5 hover:shadow-[8px_10px_0_var(--shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]"
            >
              Можеби подоцна
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
