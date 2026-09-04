import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * A headline number on a dashboard.
 *
 * Was defined twice, once in the organiser dashboard and once in admin, and the
 * two had already diverged — only one of them supported a hint line, so the
 * turnout percentage existed on one dashboard and not the other.
 *
 * The value is `font-mono` deliberately. These sit in a row and change on every
 * load; proportional digits make the row jitter as the numbers change width,
 * and tabular figures keep the columns still.
 */
export type StatProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  className?: string;
};

export function Stat({ icon: Icon, label, value, hint, className }: StatProps) {
  return (
    <div className={cn('surface p-4 sm:p-5', className)}>
      <div className="flex items-center gap-2 text-dark-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="eyebrow">{label}</span>
      </div>
      <p className="mt-2.5 font-mono text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-dark-500">{hint}</p> : null}
    </div>
  );
}
