import { cn } from '@/lib/cn';

const TONES = {
  neutral: 'bg-white/[0.07] text-dark-200 border-white/10',
  primary: 'bg-primary-500/15 text-primary-300 border-primary-500/25',
  money: 'bg-secondary-400/15 text-secondary-300 border-secondary-400/25',
  success: 'bg-success-500/15 text-success-400 border-success-500/25',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/25',
  danger: 'bg-danger-500/15 text-danger-400 border-danger-500/25',
  // On top of a photograph, where a translucent tint would pick up whatever is
  // behind it. Opaque, blurred, always legible.
  onCover: 'bg-dark-950/70 text-white border-white/15 backdrop-blur-md',
};

export function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
        TONES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Order and ticket states, mapped to a tone once so every screen agrees. */
export const ORDER_TONE = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'primary',
};

export const TICKET_TONE = {
  VALID: 'success',
  CHECKED_IN: 'primary',
  VOID: 'danger',
};

export const EVENT_TONE = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  CANCELLED: 'danger',
};
