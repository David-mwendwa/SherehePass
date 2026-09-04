import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The empty state.
 *
 * There were three near-copies of this markup — browse, tickets, saved — and
 * they had already drifted: different icon sizes, one with a border and two
 * without, one missing the action entirely. An empty state is the screen a
 * first-time visitor is most likely to hit, so it is the last one that should
 * be assembled by hand each time.
 *
 * `action` is not optional by accident. "Nothing here" is a dead end; the way
 * out is the whole point of the component, and making it required means a new
 * empty state cannot quietly ship without one. The few places that genuinely
 * have no next step pass `action={null}` and say so.
 */
export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-dark-500 ring-1 ring-white/[0.06]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="text-subhead text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-dark-400">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
