'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Сите категории' },
  { value: 'Tech', label: 'Технологија' },
  { value: 'Culture', label: 'Култура' },
  { value: 'Lifestyle', label: 'Животен стил' },
  { value: 'Business', label: 'Бизнис' },
  { value: 'Sports', label: 'Спорт' },
  { value: 'Blog', label: 'Блог' },
] as const;

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  const fromParam = searchParams.get('from') ?? '';
  const toParam = searchParams.get('to') ?? '';
  const categoryParam = searchParams.get('category') ?? searchParams.get('cat') ?? '';
  const queryParam = searchParams.get('q') ?? '';

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const handleSearch = () => {
    const params = new URLSearchParams();
    const fromValue = fromRef.current?.value?.trim() ?? '';
    const toValue = toRef.current?.value?.trim() ?? '';
    const categoryValue = categoryRef.current?.value ?? '';
    const trimmedQuery = queryParam.trim();

    if (fromValue) params.set('from', fromValue);
    if (toValue) params.set('to', toValue);
    if (categoryValue) params.set('category', categoryValue);
    if (trimmedQuery) params.set('q', trimmedQuery);

    const query = params.toString();
    router.push(query ? `/all?${query}` : '/all');
  };

  // Optional: Allow clearing filters to see all history
  const clearFilter = () => {
    if (fromRef.current) fromRef.current.value = '';
    if (toRef.current) toRef.current.value = '';
    if (categoryRef.current) categoryRef.current.value = '';
    const params = new URLSearchParams();
    const trimmedQuery = queryParam.trim();
    if (trimmedQuery) params.set('q', trimmedQuery);
    const query = params.toString();
    router.push(query ? `/all?${query}` : '/all');
  };
  const hasFilters = Boolean(fromParam || toParam || categoryParam);

  return (
    <div
      key={paramsKey}
      className="w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 bg-white border border-neutral-300 px-4 py-3 rounded-sm shadow-sm"
    >
      <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[140px]">
        <label htmlFor="date-from" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Од:
        </label>
        <input
          type="date"
          id="date-from"
          defaultValue={fromParam}
          max={today}
          ref={fromRef}
          className="font-mono text-sm bg-transparent outline-none text-neutral-900 cursor-pointer border-b border-neutral-200 focus:border-black transition-colors w-full"
        />
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[140px]">
        <label htmlFor="date-to" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          До:
        </label>
        <input
          type="date"
          id="date-to"
          defaultValue={toParam}
          max={today}
          ref={toRef}
          className="font-mono text-sm bg-transparent outline-none text-neutral-900 cursor-pointer border-b border-neutral-200 focus:border-black transition-colors w-full"
        />
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[180px]">
        <label htmlFor="category" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Категорија:
        </label>
        <div className="relative">
          <select
            id="category"
            defaultValue={categoryParam}
            ref={categoryRef}
            className="font-mono text-sm bg-transparent outline-none text-neutral-900 cursor-pointer border-b border-neutral-200 focus:border-black transition-colors w-full appearance-none pr-6"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
        </div>
      </div>

      <button
        onClick={handleSearch}
        className="h-10 w-full sm:w-auto px-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-sm"
      >
        Барај
      </button>

      {hasFilters && (
        <button
          onClick={clearFilter}
          className="h-10 w-full sm:w-auto px-3 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest transition-colors"
          title="Исчисти филтри"
        >
          ✕
        </button>
      )}
    </div>
  );
}
