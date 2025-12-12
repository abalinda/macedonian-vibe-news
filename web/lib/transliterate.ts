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