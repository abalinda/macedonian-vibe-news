/* eslint-disable react-hooks/set-state-in-effect */
'use client'
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { useUser } from '@clerk/nextjs';
import { isAdminEmail } from "@/lib/admins";
import { searchPosts, type SearchResult } from "@/app/actions/search";
import { buildHighlightRegex } from "@/lib/transliterate";
import { ThemeToggle } from "./theme-toggle";
import { captureArticleClick } from "./article-link";
import posthog from "posthog-js";

const MIN_NAV_QUERY_LENGTH = 2;

const formatSearchDate = (value?: string | null) => {
  if (!value) return "Ново";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Ново";
  return parsed.toLocaleDateString("mk-MK", { day: "2-digit", month: "short" });
};

/**
 * Wrap the runs of `title` that matched the (transliteration-aware) query in a
 * yellow <mark>, so a Latin query visibly highlights its Cyrillic match — and
 * vice-versa. Splitting on a single capturing group puts the matched runs at the
 * odd indices, preserving the headline's original casing.
 */
const renderHighlightedTitle = (title: string, regex: RegExp | null): ReactNode => {
  if (!regex || !title) return title;
  const parts = title.split(regex);
  if (parts.length <= 1) return title;
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-[2px] bg-accent/40 px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
};

type NavSearchProps = {
  onNavigate?: () => void;
  isCompact?: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
};

const NavSearch = ({
  onNavigate,
  isCompact = false,
  isExpanded = true,
  onExpand,
  onCollapse,
}: NavSearchProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q")?.toString() ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const requestRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const highlightRegex = useMemo(() => buildHighlightRegex(query), [query]);

  useEffect(() => {
    const nextQuery = searchParams.get("q")?.toString() ?? "";
    setQuery(nextQuery);
    if (!nextQuery) {
      setResults([]);
      setIsOpenDropdown(false);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setIsOpenDropdown(false);
      if (isCompact && isExpanded) onCollapse?.();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCompact, isExpanded, onCollapse]);

  useEffect(() => {
    if (!isCompact || !isExpanded) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCollapse?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCompact, isExpanded, onCollapse]);

  useEffect(() => {
    if (isCompact && isExpanded) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isCompact, isExpanded]);

  useEffect(() => {
    if (isCompact && !isExpanded) {
      setIsOpenDropdown(false);
    }
  }, [isCompact, isExpanded]);

  const submitSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < MIN_NAV_QUERY_LENGTH) return;
    posthog.capture('search', {
      query: trimmed,
      query_length: trimmed.length,
      results_count: results.length,
      source: 'nav',
    });
    setIsOpenDropdown(false);
    onNavigate?.();
    router.push(`/all?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    submitSearch(query);
  };

  const runSearch = async (term: string) => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    try {
      const data = await searchPosts({ query: term, limit: 6 });
      if (requestRef.current === requestId) {
        setResults(data);
        setIsOpenDropdown(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      if (requestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < MIN_NAV_QUERY_LENGTH) {
      requestRef.current += 1;
      setIsLoading(false);
      setResults([]);
      setIsOpenDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), 300);
  };

  const containerWidth = isCompact
    ? isExpanded
      ? "w-full max-w-[320px]"
      : "w-11"
    : "w-[170px] sm:w-[240px]";
  const showDropdown = isOpenDropdown && isExpanded;
  const showFormUI = !isCompact || isExpanded;

  const handleResultClick = (result: SearchResult) => {
    const href = result.category === "Blog" ? `/blog/${result.id}` : `/go/${result.id}`;
    captureArticleClick(result, "search");
    setIsOpenDropdown(false);
    onNavigate?.();
    router.push(href);
  };

  const showEmptyState =
    query.trim().length >= MIN_NAV_QUERY_LENGTH && !isLoading && results.length === 0;

  return (
    <div
      className={`relative ${containerWidth} h-11 flex items-center transition-[width,max-width] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] z-20`}
      ref={containerRef}
    >
      {isCompact && (
        <button
          type="button"
          onClick={() => {
            onExpand?.();
          }}
          aria-label="Отвори пребарување"
          className={`absolute inset-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-black shadow-[4px_4px_0_var(--shadow)] transition-all duration-250 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)] ${
            isExpanded ? "pointer-events-none opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      )}

      <form
        onSubmit={handleSubmit}
        className={`relative ${isCompact ? "h-11" : ""} transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showFormUI ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpenDropdown(true);
          }}
          placeholder="Пребарувај"
          ref={inputRef}
          className="h-11 w-full rounded-full border border-line/20 bg-surface px-12 text-sm font-sans placeholder:text-neutral-500 shadow-[3px_3px_0_var(--shadow)] focus:border-line focus:outline-none focus:ring-2 focus:ring-accent/60 transition-all duration-200"
        />
        {showFormUI && (
          <>
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isCompact && isExpanded && (
                <button
                  type="button"
                  onClick={() => onCollapse?.()}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-black shadow-[3px_3px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:bg-black hover:text-accent"
                  aria-label="Затвори пребарување"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
              )}
            </div>
          </>
        )}
      </form>

      {showDropdown && (
        <div className="absolute right-0 top-[110%] z-[70] w-[min(90vw,420px)] sm:w-[360px] rounded-md border border-line bg-surface shadow-[10px_10px_0_var(--shadow)]">
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-line-soft">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleResultClick(item)}
                className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-surface-2 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                    <span className="text-link truncate max-w-[160px]">
                      {item.source || "Vibes"}
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span className="truncate max-w-[120px]">
                      {item.category || "Вести"}
                    </span>
                  </div>
                  <p className="mt-1 font-serif text-sm font-semibold leading-snug text-ink line-clamp-2">
                    {renderHighlightedTitle(item.title, highlightRegex)}
                  </p>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 whitespace-nowrap">
                  {formatSearchDate(item.published_at || item.scraped_at)}
                </div>
              </button>
            ))}

            {showEmptyState && (
              <div className="p-3 text-xs text-neutral-500">Нема резултати.</div>
            )}
          </div>

          <div className="border-t border-line-soft bg-surface-2 p-2">
            <button
              type="button"
              onClick={() => submitSearch(query)}
              className="w-full rounded-sm border border-line bg-black px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:bg-accent hover:text-black"
            >
              Сите резултати во архивата →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const currentDate = new Date().toLocaleDateString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsLocal(host === "localhost" || host === "127.0.0.1");
    }
  }, []);

  useEffect(() => {
    if (!isMobile) setIsMobileSearchOpen(false);
  }, [isMobile]);

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
    { label: "За тебе", href: "/za-tebe" },
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

  const titleShift = isMobile && isMobileSearchOpen ? -70 : 0;
  const searchIsExpanded = !isMobile || isMobileSearchOpen;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-line bg-paper py-3 px-4 md:px-8 flex items-center gap-4 relative">
        <div className="w-full max-w-[1350px] mx-auto flex items-center gap-4 relative">
          <div className="flex items-center gap-4 flex-1">
            <button
              aria-label="Отвори мени"
              aria-expanded={isOpen}
              onClick={() => {
                setIsOpen((prev) => !prev);
                setIsMobileSearchOpen(false);
              }}
              className="group relative h-11 w-11 p-1 flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-full border border-transparent hover:border-line overflow-hidden"
            >
              <Image
                src="/hamburger-menu.svg"
                alt="Мени"
                width={40}
                height={40}
                className={`absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-0 group-hover:-translate-y-2 ${
                  isOpen ? "scale-95 rotate-3" : ""
                }`}
                priority
              />
              <Image
                src="/logo_homepage.png"
                alt="Vibes лого"
                width={40}
                height={40}
                className="absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                priority
              />
            </button>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase font-sans hidden md:block">
            </span>
          </div>

<h1
  className="font-serif text-3xl md:text-5xl font-black tracking-tighter absolute left-1/2 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
  style={{ transform: `translateX(-50%) translateX(${titleShift}px)` }}
>
  <a href="https://www.vibes.mk/">VIBES.</a>
</h1>

          <div className="flex-1 flex justify-end min-w-0 sm:min-w-[180px]">
            <NavSearch
              onNavigate={() => {
                setIsOpen(false);
                setIsMobileSearchOpen(false);
              }}
              isCompact={isMobile}
              isExpanded={searchIsExpanded}
              onExpand={() => setIsMobileSearchOpen(true)}
              onCollapse={() => setIsMobileSearchOpen(false)}
            />
          </div>
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
          className={`absolute left-0 top-0 h-full w-[min(360px,85vw)] bg-paper border-r border-line shadow-[0px_0_0_var(--shadow)] transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full p-6 gap-6">
            <div className="flex items-center justify-between gap-4">
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
                    className="ml-1 inline-flex items-center gap-2 rounded-full border border-line bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-black shadow-[4px_4px_0_var(--shadow)] transition-colors hover:bg-black hover:text-white"
                  >
                    Admin page
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-neutral-600 whitespace-nowrap" suppressHydrationWarning>
                  {currentDate}
                </span>
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
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              {menuLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between border-b border-line-soft pb-3 text-lg font-serif font-black uppercase tracking-tight hover:border-line transition-all"
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-mono tracking-[0.3em] text-neutral-500 group-hover:text-neutral-800 transition-colors">
                    →
                  </span>
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t border-line-soft space-y-3">
              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between border-b border-line-soft pb-3 text-lg font-serif font-black uppercase tracking-tight hover:border-line transition-all"
              >
                <span>За нас</span>
                <span className="text-xs font-mono tracking-[0.3em] text-neutral-500 group-hover:text-neutral-800 transition-colors">
                  →
                </span>
              </Link>
              <ThemeToggle variant="row" />
              <SignedOut>
                <div className="space-y-4 rounded-2xl border border-line/70 bg-[radial-gradient(circle_at_16%_20%,#ffe86a_0,rgba(255,232,106,0.18)_32%,transparent_55%),radial-gradient(circle_at_86%_0,#ffd300_0,rgba(255,211,0,0.2)_36%,transparent_55%),#FDFBF7] dark:bg-none dark:bg-surface p-4 shadow-[10px_10px_0_var(--shadow)]">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-neutral-600">
                    <span>Вклучи се</span>
                    <span className="font-mono text-[10px] text-neutral-500">читач</span>
                  </div>
                  <p className="text-sm font-serif text-neutral-800 dark:text-neutral-200 leading-snug">
                    Управувај со твоите вести, сочувај написи и добиј персонализирани вибрации.
                  </p>
                  <SignInButton mode="modal">
                    <button className="group w-full flex items-center justify-between border border-line/80 bg-surface px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-all hover:bg-black hover:text-accent hover:shadow-[6px_6px_0_var(--shadow)]">
                      <span>Најава</span>
                      <span className="text-[10px] font-mono tracking-[0.2em] group-hover:text-accent">
                        →
                      </span>
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full flex items-center justify-between border border-line bg-accent text-black px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-all shadow-[6px_6px_0_var(--shadow)] hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--shadow)]">
                      <span>Креирај профил</span>
                      <span className="text-[10px] font-mono tracking-[0.2em]">+</span>
                    </button>
                  </SignUpButton>
                </div>
              </SignedOut>

              <SignedIn>
                <div className="flex items-center gap-4 rounded-2xl border border-line/70 bg-[linear-gradient(120deg,#FFF8D8,#FDFBF7)] dark:bg-none dark:bg-surface px-4 py-3 shadow-[10px_10px_0_var(--shadow)]">
                  <Link href="/profil" onClick={() => setIsOpen(false)} className="flex-1 group">
                    <p className="text-sm font-semibold text-ink leading-tight group-hover:underline">Vibes профил</p>
                    <p className="text-xs text-neutral-600">Профил · Подесувања</p>
                  </Link>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-12 h-12 border border-line/70 rounded-full shadow-[4px_4px_0_var(--shadow)]",
                        userButtonPopoverCard: "border border-line/10 shadow-[12px_12px_0_var(--shadow)] bg-[#FFFBEE]",
                        userButtonPopoverActionButton: "hover:bg-black hover:text-accent",
                      },
                    }}
                  />
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
  const hideScrollbarTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isScrollbarHidden, setIsScrollbarHidden] = useState(true);
  const categories = [
    { name: "За тебе", value: "ForYou", href: "/za-tebe" },
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
    // el.scrollTo({ left: offset, behavior: "instant" as ScrollBehavior }); #commeting off as I want for the "Najnovo" to be visible on load. Uncomment to hide
  }, [activeCategory]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const showScrollbar = () => {
      if (hideScrollbarTimeout.current) clearTimeout(hideScrollbarTimeout.current);
      setIsScrollbarHidden(false);
      hideScrollbarTimeout.current = setTimeout(() => setIsScrollbarHidden(true), 1200);
    };

    el.addEventListener("touchstart", showScrollbar, { passive: true });
    el.addEventListener("wheel", showScrollbar, { passive: true });
    el.addEventListener("scroll", showScrollbar, { passive: true });

    return () => {
      el.removeEventListener("touchstart", showScrollbar);
      el.removeEventListener("wheel", showScrollbar);
      el.removeEventListener("scroll", showScrollbar);
      if (hideScrollbarTimeout.current) clearTimeout(hideScrollbarTimeout.current);
    };
  }, []);

  return (
    <div className="bg-paper">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <nav
          ref={scrollRef}
          className={`flex items-center gap-4 md:gap-6 py-4 overflow-x-auto justify-start md:justify-center px-1 md:px-0 ${
            isScrollbarHidden ? "scrollbar-hide" : ""
          }`}
        >
          <div className="flex items-center gap-4 md:gap-6 flex-none md:flex-1 md:justify-center">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value;
              const isLatest = cat.value === "Latest";
              const href = cat.href ?? (cat.value ? `/?category=${cat.value}` : "/");

              const baseClasses = `
                    text-sm md:text-base font-bold uppercase tracking-widest whitespace-nowrap
                    transition-colors hover:text-ink
                  `;
              const activeClasses = isActive
                ? "text-ink border-b-2 border-line pb-1"
                : "text-neutral-500";
              const latestAccent = isLatest
                ? "pl-3 pr-3 py-1 rounded-full border border-line bg-accent text-black shadow-[3px_3px_0_var(--shadow)] md:motion-safe:animate-pulse"
                : "";

              return (
                <Link
                  key={cat.name}
                  href={href}
                  onClick={() =>
                    posthog.capture('category_nav', {
                      category: cat.value ?? 'Home',
                      label: cat.name,
                      source: isAllPage ? 'all' : 'home',
                    })
                  }
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
              border border-line px-1 py-1 rounded-full transition-all
              ${isAllPage 
                ? "bg-ink text-paper shadow-[4px_4px_0_var(--shadow)]"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-ink hover:text-paper"
              }
            `}
          >
            Архива
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
    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-all hover:bg-accent hover:text-black hover:shadow-[4px_4px_0_var(--shadow)]"
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
