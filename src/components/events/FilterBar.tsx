'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

import type { ReactNode } from 'react';
import type { EventCategory } from '@prisma/client';

import { cn } from '@/lib/cn';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/format';

/**
 * Filters live in the URL, not in component state.
 *
 * That is what makes a filtered view shareable, back-button-correct, and
 * renderable on the server — the page reads the same querystring the chips
 * write. It also means this component holds no state of its own: it reads the
 * current params and pushes new ones.
 */

const WHEN_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'this-weekend', label: 'This weekend' },
  { value: 'this-month', label: 'This month' },
];

export type FilterBarProps = {
  categoryCounts: Partial<Record<EventCategory, number>>;
  counties: string[];
};

export function FilterBar({ categoryCounts, counties }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(key: string, value: string | null): void {
    const next = new URLSearchParams(params);
    // Clicking the active chip clears it, so a filter is its own off switch
    // and there is no separate "all" pill to keep in sync.
    if (!value || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const active = {
    category: params.get('category'),
    county: params.get('county'),
    when: params.get('when'),
    free: params.get('free'),
    q: params.get('q'),
  };
  const activeCount = Object.values(active).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Categories scroll horizontally on narrow screens rather than wrapping
          into four rows that push the results off the fold. */}
      <div className="edge-fade no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORY_ORDER.filter((key) => categoryCounts[key]).map((key) => (
          <Chip
            key={key}
            active={active.category === key}
            onClick={() => apply('category', key)}
          >
            {CATEGORY_LABELS[key]}
            <span
              className={cn(
                'font-mono text-[0.6875rem]',
                active.category === key ? 'text-primary-200' : 'text-dark-500'
              )}
            >
              {categoryCounts[key]}
            </span>
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {WHEN_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            active={active.when === option.value}
            onClick={() => apply('when', option.value)}
          >
            {option.label}
          </Chip>
        ))}

        <Chip active={active.free === '1'} onClick={() => apply('free', '1')}>
          Free entry
        </Chip>

        <label className="sr-only" htmlFor="county-filter">
          Filter by county
        </label>
        <select
          id="county-filter"
          value={active.county ?? ''}
          onChange={(event) => apply('county', event.target.value)}
          // Extra right padding: this is a native select, so the browser draws
          // its own arrow inside the box and it sits on top of the label
          // without room made for it.
          className="h-9 rounded-full border border-white/10 bg-dark-900 pl-3.5 pr-8 text-sm text-dark-200 focus:border-primary-500/50 focus:ring-0"
        >
          <option value="">All counties</option>
          {counties.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-dark-400 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-all',
        active
          ? 'border-primary-500/50 bg-primary-500/15 text-white'
          : 'border-white/10 bg-white/[0.04] text-dark-300 hover:border-white/20 hover:text-white'
      )}
    >
      {children}
    </button>
  );
}
