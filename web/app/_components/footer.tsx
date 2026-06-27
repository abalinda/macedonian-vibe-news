import Link from "next/link";
import type { ReactNode } from "react";

const navLinks = [
  { label: "Почетна", href: "/" },
  { label: "Најново", href: "/najnovo" },
  { label: "Архива", href: "/all" },
  { label: "Блог", href: "/?category=Blog" },
  { label: "За нас", href: "/about" },
];

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[1350px] px-5 md:px-10 py-12 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              href="/"
              className="font-serif text-3xl font-black tracking-tighter text-ink"
            >
              VIBES.
            </Link>
            <p className="mt-3 text-sm font-sans leading-relaxed text-neutral-600 dark:text-neutral-300">
              Македонски вести, внимателно курирани со вештачка интелигенција и
              освежувани во текот на целиот ден.
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Навигација
            </span>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="w-fit text-sm font-sans text-neutral-700 dark:text-neutral-300 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Следи нè
            </span>
            <div className="flex items-center gap-2">
              <FooterIcon href="https://www.instagram.com/vibes.mkd" label="Instagram">
                <InstagramIcon />
              </FooterIcon>
              <FooterIcon href="https://www.linkedin.com/company/vibes-mk" label="LinkedIn">
                <LinkedInIcon />
              </FooterIcon>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-400">
            © {year} Vibes.mk
          </p>
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
            Курирано со вештачка интелигенција
          </p>
        </div>
      </div>
    </footer>
  );
};

const FooterIcon = ({ href, label, children }: { href: string; label: string; children: ReactNode }) => (
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

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M4.98 3.5A2.25 2.25 0 1 1 2.73 5.75 2.25 2.25 0 0 1 4.98 3.5ZM3 8h4v13H3zm7.5 0h3.83v1.78h.05A4.2 4.2 0 0 1 18.9 8c3.05 0 3.61 2 3.61 4.6V21h-4v-6.07c0-1.45 0-3.31-2-3.31s-2.3 1.58-2.3 3.22V21h-4Z" />
  </svg>
);
