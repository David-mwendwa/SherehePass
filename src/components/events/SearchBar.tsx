'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

/**
 * Search is a real form with a real submit, so pressing Enter works, the
 * browser can autofill it, and the result is a URL that can be shared. The
 * query lives in the querystring rather than in component state for the same
 * reason: /events?q=jazz is a page someone can send to a friend.
 */
export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    // Dropping the page number: results for a new search start at page one,
    // and keeping ?page=4 would land on an empty list.
    next.delete('page');
    router.push(`/events?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative">
      <label htmlFor="event-search" className="sr-only">
        Search events
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-500"
        aria-hidden="true"
      />
      <input
        id="event-search"
        type="search"
        name="q"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search events, venues or organisers"
        className="h-14 w-full rounded-2xl border border-white/10 bg-dark-900/80 pl-12 pr-28 text-base text-white placeholder:text-dark-500 focus:border-primary-500/50 focus:ring-0"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-primary-600 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-500"
      >
        Search
      </button>
    </form>
  );
}
