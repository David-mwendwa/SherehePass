import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional class names, with later Tailwind utilities beating earlier ones
 * of the same kind. Without the merge, `cn('px-4', 'px-6')` emits both and the
 * winner is whichever CSS rule the stylesheet happens to order last — which is
 * exactly the bug that makes a `className` prop fail to override a component's
 * own padding.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
