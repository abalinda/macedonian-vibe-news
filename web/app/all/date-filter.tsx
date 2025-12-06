'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Initialize state from URL or default to empty
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');

  useEffect(() => {
    setFrom(searchParams.get('from') ?? '');
    setTo(searchParams.get('to') ?? '');
  }, [searchParams]);

  const handleSearch = () => {
    if (!from && !to) {
      router.push('/all');
      return;
    }

    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    router.push(`/all?${params.toString()}`);
  };

  // Optional: Allow clearing filters to see all history
  const clearFilter = () => {
    setFrom('');
    setTo('');
    router.push('/all');
  };

  return (
    <div className="w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 bg-white border border-neutral-300 px-4 py-3 rounded-sm shadow-sm">
      <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[140px]">
        <label htmlFor="date-from" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Од:
        </label>
        <input
          type="date"
          id="date-from"
          value={from}
          max={today}
          onChange={(e) => setFrom(e.target.value)}
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
          value={to}
          max={today}
          onChange={(e) => setTo(e.target.value)}
          className="font-mono text-sm bg-transparent outline-none text-neutral-900 cursor-pointer border-b border-neutral-200 focus:border-black transition-colors w-full"
        />
      </div>

      <button
        onClick={handleSearch}
        className="h-10 w-full sm:w-auto px-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-sm"
      >
        Барај
      </button>

      {(from || to) && (
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
