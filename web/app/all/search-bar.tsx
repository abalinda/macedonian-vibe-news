'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }

    startTransition(() => {
      // Updates the URL without a full page reload, but triggers a server re-render
      replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="mb-8 w-full max-w-md">
      <div className="relative">
        <input
          className="peer block w-full rounded-md border border-neutral-200 bg-white py-[9px] pl-10 text-sm outline-2 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Пребарувај..."
          onChange={(e) => {
            handleSearch(e.target.value);
          }}
          defaultValue={searchParams.get('q')?.toString()}
        />
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 peer-focus:text-neutral-900">
           {/* Simple SVG Mag Glass icon */}
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
        </div>
        {isPending && (
           <div className="absolute right-3 top-1/2 -translate-y-1/2">
             <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"></div>
           </div>
        )}
      </div>
    </div>
  );
}