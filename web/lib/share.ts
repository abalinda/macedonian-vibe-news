// Helpers for the share button (web/app/_components/share-button.tsx).

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vibes.mk').replace(/\/$/, '');

/** Resolve a path ("/blog/12") or an already-absolute URL to an absolute, shareable URL. */
export const toAbsoluteUrl = (urlOrPath: string): string => {
  if (!urlOrPath) return SITE_URL;
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const base = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
};

export type ShareChannel = { key: string; label: string; href: string };

/** Build the fallback share-intent links (used when the Web Share API is unavailable). */
export const buildShareChannels = ({ url, title }: { url: string; title: string }): ShareChannel[] => {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const tu = encodeURIComponent(`${title} ${url}`);
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${tu}` },
    { key: 'viber', label: 'Viber', href: `viber://forward?text=${tu}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: 'email', label: 'Е-пошта', href: `mailto:?subject=${t}&body=${tu}` },
  ];
};
