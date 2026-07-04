// web/lib/transliterate.ts

const mkToLatMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ѓ': 'gj',
  'е': 'e', 'ж': 'zh', 'з': 'z', 'ѕ': 'dz', 'и': 'i', 'ј': 'j',
  'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj',
  'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ќ': 'kj',
  'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'џ': 'dj',
  'ш': 'sh'
};

const latToMkMap: Record<string, string> = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д',
  'e': 'е', 'z': 'з', 'i': 'и', 'j': 'ј', 'k': 'к',
  'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п',
  'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф',
  'h': 'х', 'c': 'ц',
  'zh': 'ж', 'gj': 'ѓ', 'dz': 'ѕ', 'lj': 'љ', 'nj': 'њ', 'kj': 'ќ', 'ch': 'ч', 'dj': 'џ', 'sh': 'ш'
};

function toTitleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildSearchVariants(input: string): string[] {
  const lower = input.toLowerCase();
  const variants = new Set<string>();

  // 1. Generate Scripts (Latin <-> Cyrillic)
  const latin = lower.split('').map(char => mkToLatMap[char] || char).join('');
  let cyrillic = lower;
  const latKeys = Object.keys(latToMkMap).sort((a, b) => b.length - a.length);
  latKeys.forEach(key => {
    cyrillic = cyrillic.replaceAll(key, latToMkMap[key]);
  });

  const baseTerms = new Set([latin, cyrillic, lower]);

  // 2. Generate Cases for each script (lower, Title, UPPER)
  baseTerms.forEach(term => {
    variants.add(term); // lowercase
    variants.add(toTitleCase(term)); // Title Case (Matches headlines)
    variants.add(term.toUpperCase()); // UPPERCASE
  });

  return Array.from(variants);
}

/** Escape a string so it is safe to embed literally inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a case-insensitive RegExp that matches ANY transliteration variant of
 * the query (Latin↔Cyrillic). Lets search-result highlighting show *why* a
 * Cyrillic headline matched a Latin query (and vice-versa) by wrapping the
 * matched run. Case variants are redundant under the `i` flag, so we collapse
 * to the distinct base terms (longest-first, so the fullest match wins).
 * Returns null when there is nothing meaningful (≥2 chars) to highlight.
 */
export function buildHighlightRegex(input: string): RegExp | null {
  const terms = Array.from(new Set(buildSearchVariants(input).map(v => v.toLowerCase())))
    .filter(v => v.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (terms.length === 0) return null;
  return new RegExp(`(${terms.join('|')})`, 'gi');
}