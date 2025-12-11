'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState, useTransition } from 'react';

export function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get('q')?.toString() ?? '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setValue(searchParams.get('q')?.toString() ?? '');
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }

    startTransition(() => {
      const queryString = params.toString();
      replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearch(value.trim());
  };

  const handleChange = (next: string) => {
    setValue(next);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = next.trim();
    debounceRef.current = setTimeout(() => handleSearch(trimmed), 300);
  };

  return (
    <form className="w-full max-w-md" onSubmit={handleSubmit}>
      <div className="relative">
        <input
          className="peer block w-full rounded-md border border-neutral-200 bg-white py-[9px] pl-10 text-sm outline-2 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Пребарувај..."
          onChange={(e) => handleChange(e.target.value)}
          value={value}
        />
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 peer-focus:text-neutral-900">
           {/* Simple SVG Mag Glass icon */}
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
        </div>
        {isPending && (
           <div className="absolute right-3 top-1/2 -translate-y-1/2">
             <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-[#002CFF]"></div>
           </div>
        )}
      </div>
    </form>
  );
}
