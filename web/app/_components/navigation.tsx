'use client'
import { posthog } from 'posthog-js'
import { useUser } from '@clerk/clerk-react'

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { isAdminEmail } from "@/lib/admins";

export default function PostHogClerkSync() {
  const { isLoaded, user } = useUser();
    useEffect(() => {
    if (isLoaded) {
      if (user) {
        // User is signed in - identify them
        posthog.identify(user.id)
      } else {
        // User is signed out - reset PostHog
        posthog.reset()
      }
    }
  }, [isLoaded, user])

  return null
}
export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const { user, isLoaded } = useUser();
  const currentDate = new Date().toLocaleDateString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsLocal(host === "localhost" || host === "127.0.0.1");
    }
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const showAdminLink = (isLoaded && isAdminEmail(email)) || isLocal;

  const menuLinks = [
    { label: "Најново", href: "/najnovo" },
    { label: "Почетна", href: "/" },
    { label: "Технологија", href: "/?category=Tech" },
    { label: "Култура", href: "/?category=Culture" },
    { label: "Животен стил", href: "/?category=Lifestyle" },
    { label: "Бизнис", href: "/?category=Business" },
    { label: "Спорт", href: "/?category=Sports" },
    { label: "Блог", href: "/?category=Blog" },
    { label: "Архива", href: "/all" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-black bg-[#FDFBF7] py-3 px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            aria-label="Отвори мени"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-11 w-11 p-1 flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-full border border-transparent hover:border-black"
          >
            <Image
              src="/logo_homepage.png"
              alt="Vibes лого"
              width={40}
              height={40}
              className={`h-full w-full object-contain transition-transform ${isOpen ? "scale-95 rotate-6" : ""}`}
              priority
            />
          </button>
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase font-sans hidden md:block">
          </span>
        </div>

        <h1 className="font-serif text-3xl md:text-5xl font-black tracking-tighter absolute left-1/2 -translate-x-1/2">
          <a href="https://www.vibes.mk/">VIBES.</a>
        </h1>

{/* Date on Right */}
        <div className="text-xs font-mono min-w-[80px] text-right" suppressHydrationWarning>
          {currentDate}
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[60] transition ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsOpen(false)}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-[min(360px,85vw)] bg-[#FDFBF7] border-r border-black shadow-[10px_0_0_#0000000a] transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full p-6 gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconButton href="https://www.instagram.com/vibes.mkd" label="Instagram">
                  <InstagramIcon />
                {/* </IconButton>
                <IconButton href="https://www.facebook.com/vibes.mkd" label="Facebook">
                  <FacebookIcon /> */}
                </IconButton>
                <IconButton href="https://www.linkedin.com/company/vibes-mk" label="LinkedIn">
                  <LinkedInIcon />
                </IconButton>
                {showAdminLink && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="ml-1 inline-flex items-center gap-2 rounded-full border border-black bg-[#FFD300] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-black shadow-[4px_4px_0_#00000010] transition-colors hover:bg-black hover:text-white"
                  >
                    Admin page
                  </Link>
                )}
              </div>
              <button
                aria-label="Затвори мени"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-black hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              {menuLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between border-b border-neutral-200 pb-3 text-lg font-serif font-black uppercase tracking-tight hover:border-black transition-all"
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-mono tracking-[0.3em] text-neutral-500 group-hover:text-neutral-800 transition-colors">
                    →
                  </span>
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-200 space-y-3">
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between border-b border-neutral-200 pb-3 text-lg font-serif font-black uppercase tracking-tight hover:border-black transition-all"
              >
                <span>За нас</span>
                <span className="text-xs font-mono tracking-[0.3em] text-neutral-500 group-hover:text-neutral-800 transition-colors">
                  →
                </span>
              </Link>

              <SignedOut>
                <div className="space-y-3">
                  <SignInButton mode="modal">
                    <button className="w-full border border-black bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-colors hover:bg-black hover:text-white">
                      Најава
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full border border-black bg-black text-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-all hover:shadow-[6px_6px_0_#00000010]">
                      Креирај профил
                    </button>
                  </SignUpButton>
                </div>
              </SignedOut>

              <SignedIn>
                <div className="flex items-center justify-between gap-3 bg-white/70 backdrop-blur border border-neutral-200 rounded-xl px-4 py-3">
                  <div>
                    
                    <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Сметка</p>
                    <p className="text-sm font-semibold text-neutral-900">Управувај профил</p>
                  </div>
                  <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
                </div>
              </SignedIn>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

type CategoryNavProps = {
  activeCategory: string | null;
  isAllPage?: boolean;
};

export const CategoryNav = ({ activeCategory, isAllPage = false }: CategoryNavProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const categories = [
    { name: "Најново", value: "Latest", href: "/najnovo" },
    { name: "Почетна", value: null, href: "/" },
    { name: "Технологија", value: "Tech" },
    { name: "Култура", value: "Culture" },
    { name: "Животен стил", value: "Lifestyle" },
    { name: "Бизнис", value: "Business" },
    { name: "Спорт", value: "Sports" },
    { name: "Блог", value: "Blog" },
    // { name: "За нас", value: "About", href: "/about" },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > 768) return;
    if (activeCategory === "Latest") return;

    const el = scrollRef.current;
    if (!el) return;

    const firstLink = el.querySelector("a");
    if (!(firstLink instanceof HTMLElement)) return;

    const offset = firstLink.offsetWidth + 16; // hide the first chip just off-screen
    el.scrollTo({ left: offset, behavior: "instant" as ScrollBehavior });
  }, [activeCategory]);

  return (
    <div className="bg-[#FDFBF7]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <nav
          ref={scrollRef}
          className="flex items-center gap-4 md:gap-6 py-4 overflow-x-auto scrollbar-hide justify-start md:justify-center px-1 md:px-0"
        >
          <div className="flex items-center gap-4 md:gap-6 flex-none md:flex-1 md:justify-center">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value;
              const isLatest = cat.value === "Latest";
              const href = cat.href ?? (cat.value ? `/?category=${cat.value}` : "/");

              const baseClasses = `
                    text-sm md:text-base font-bold uppercase tracking-widest whitespace-nowrap
                    transition-colors hover:text-black
                  `;
              const activeClasses = isActive
                ? "text-black border-b-2 border-black pb-1"
                : "text-neutral-500";
              const latestAccent = isLatest
                ? "pl-3 pr-3 py-1 rounded-full border border-black bg-[#FFD300] text-black shadow-[3px_3px_0_#00000012] md:animate-pulse"
                : "";

              return (
                <Link
                  key={cat.name}
                  href={href}
                  className={`${baseClasses} ${activeClasses} ${latestAccent}`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          <Link
            href="/all"
            className={`
              ml-auto flex-shrink-0 text-xs font-bold uppercase tracking-widest whitespace-nowrap
              border border-black px-3 py-1 rounded-full transition-all
              ${isAllPage 
                ? "bg-black text-white shadow-[4px_4px_0_#000]" 
                : "text-neutral-700 hover:bg-black hover:text-white"
              }
            `}
          >
            Сите
          </Link>
        </nav>
      </div>
    </div>
  );
};

const IconButton = ({ href, label, children }: { href: string; label: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black bg-white text-black transition-all hover:bg-[#FFD300] hover:shadow-[4px_4px_0_#00000012]"
  >
    <span className="sr-only">{label}</span>
    {children}
  </a>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2a3.5 3.5 0 1 0 3.5 3.5A3.5 3.5 0 0 0 12 9.5Zm5.75-3.75a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M13.5 9H15V6h-1.5C11.57 6 10 7.57 10 9.5V11H8v3h2v6h3v-6h2.086L15 11h-2v-.927C13 9.48 13.229 9 13.5 9Z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M4.98 3.5A2.25 2.25 0 1 1 2.73 5.75 2.25 2.25 0 0 1 4.98 3.5ZM3 8h4v13H3zm7.5 0h3.83v1.78h.05A4.2 4.2 0 0 1 18.9 8c3.05 0 3.61 2 3.61 4.6V21h-4v-6.07c0-1.45 0-3.31-2-3.31s-2.3 1.58-2.3 3.22V21h-4Z" />
  </svg>
);
