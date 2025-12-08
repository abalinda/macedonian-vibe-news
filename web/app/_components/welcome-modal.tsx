"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vibes_welcome_seen";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const hasSeenWelcome = () => {
  if (typeof document === "undefined") return false;

  const fromCookie = document.cookie.split(";").some((entry) => entry.trim().startsWith(`${STORAGE_KEY}=`));
  const fromStorage = (() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })();

  return Boolean(fromCookie || fromStorage);
};

const rememberWelcome = () => {
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

export const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    rememberWelcome();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!hasSeenWelcome()) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 md:px-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative max-w-[580px] w-full bg-[#FDFBF7] border border-black rounded-2xl shadow-[14px_14px_0_#00000010] overflow-hidden">
        <div className="absolute -left-10 -top-10 h-28 w-28 bg-[#FFD300] rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -right-12 bottom-0 h-28 w-28 bg-neutral-200 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 text-center w-full">
              {/* <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-600">
                Еј, добредојде на Vibes!
              </p> */}
              <h2 className="font-serif text-3xl md:text-4xl font-black leading-[1.05] text-neutral-900">
                Еј, добредојде на Vibes!
              </h2>
              <p className="text-sm md:text-base text-neutral-700 leading-relaxed font-sans max-w-xl mx-auto">
                Нашиот нов агрегатор го прилагодува прегледот според твоите избори за најдобро корисничко искуство.
              </p>
            </div>

            {/* <button
              aria-label="Затвори прозорец"
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black bg-white text-neutral-800 hover:bg-black hover:text-white transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button> */}
          </div>

          {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-sans">
            <div className="flex items-center gap-3 border border-neutral-200 rounded-xl px-3 py-2.5 bg-white/70 backdrop-blur">
              <span className="text-lg">✦</span>
              <div>
                <p className="font-bold uppercase tracking-[0.18em] text-[11px] text-neutral-700">Секојдневни вести</p>
                <p className="text-neutral-700">Кратки bullet-и за тоа што ветуваш.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-neutral-200 rounded-xl px-3 py-2.5 bg-white/70 backdrop-blur">
              <span className="text-lg">→</span>
              <div>
                <p className="font-bold uppercase tracking-[0.18em] text-[11px] text-neutral-700">Мобилно пријатно</p>
                <p className="text-neutral-700">Дизајнирано да изгледа чисто на мал екран.</p>
              </div>
            </div>
          </div> */}

          <div className="flex flex-col md:flex-row md:items-center gap-3 items-center justify-center text-center">
            <button
              onClick={handleClose}
              className="w-full md:w-auto px-5 py-3 bg-black text-white font-bold text-xs uppercase tracking-[0.25em] rounded-xl border border-black transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[10px_12px_0_#00000015] hover:bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Најново денес
            </button>
            <a href="../about/"><button
              onClick={handleClose}
              className="w-full md:w-auto px-5 py-3 bg-white text-neutral-800 font-bold text-xs uppercase tracking-[0.25em] rounded-xl border border-black/50 transition-all duration-200 ease-out hover:border-black hover:bg-[#FFD300] hover:text-black hover:-translate-y-0.5 hover:shadow-[8px_10px_0_#00000012] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >За нас
            </button></a>
          </div>
        </div>
      </div>
    </div>
  );
};
