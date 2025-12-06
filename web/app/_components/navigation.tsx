'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const currentDate = new Date().toLocaleDateString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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

  const menuLinks = [
    { label: "Почетна", href: "/" },
    { label: "Технологија", href: "/?category=Tech" },
    { label: "Култура", href: "/?category=Culture" },
    { label: "Животен стил", href: "/?category=Lifestyle" },
    { label: "Бизнис", href: "/?category=Business" },
    { label: "Спорт", href: "/?category=Sports" },
    { label: "Блог", href: "/?category=Blog" },
    { label: "Сите приказни", href: "/all" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-black bg-[#FDFBF7] py-3 px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            aria-label="Отвори мени"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-2 hover:bg-black hover:text-white transition-colors rounded-full border border-transparent hover:border-black"
          >
            {isOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 8.25h16.5m-16.5 7.5h16.5" />
              </svg>
            )}
          </button>
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase font-sans hidden md:block">
            Мени
          </span>
        </div>

        <h1 className="font-serif text-3xl md:text-5xl font-black tracking-tighter absolute left-1/2 -translate-x-1/2">
          VIBES.
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
              <div className="text-[11px] uppercase tracking-[0.35em] font-bold text-neutral-700">
                Навигација
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
              <SignedOut>
                <div className="space-y-3">
                  <SignInButton mode="modal">
                    <button className="w-full border border-black bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-colors hover:bg-black hover:text-white">
                      Најава
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full border border-black bg-black text-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-all hover:shadow-[6px_6px_0_#00000010]">
                      Креирај сметка
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
  const categories = [
    { name: "Почетна", value: null },
    { name: "Технологија", value: "Tech" },
    { name: "Култура", value: "Culture" },
    { name: "Животен стил", value: "Lifestyle" },
    { name: "Бизнис", value: "Business" },
    { name: "Спорт", value: "Sports" },
    { name: "Блог", value: "Blog" },
  ];

  return (
    <div className="bg-[#FDFBF7]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <nav className="flex items-center gap-4 md:gap-6 py-4 overflow-x-auto scrollbar-hide justify-start md:justify-center px-1 md:px-0">
          <div className="flex items-center gap-4 md:gap-6 flex-none md:flex-1 md:justify-center">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value;
              const href = cat.value ? `/?category=${cat.value}` : "/";
              
              return (
                <Link
                  key={cat.name}
                  href={href}
                  className={`
                    text-sm md:text-base font-bold uppercase tracking-widest whitespace-nowrap
                    transition-colors hover:text-black
                    ${isActive 
                      ? "text-black border-b-2 border-black pb-1" 
                      : "text-neutral-500"
                    }
                  `}
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
