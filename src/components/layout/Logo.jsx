import { cn } from '@/lib/cn';

/**
 * The mark: a ticket stub with a torn perforation down the middle, the tear
 * drawn as the negative space between two halves rather than a dashed line, so
 * it survives being scaled down to a 16px favicon.
 *
 * Inline SVG rather than a file, because it takes its colour from `currentColor`
 * and so works on the dark header, on a pink button and in the footer without
 * three copies existing.
 */
export function LogoMark({ className }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-7 w-7', className)}
    >
      {/* Left half of the stub. */}
      <path
        d="M3 9a3 3 0 0 1 3-3h7v3.2a2.8 2.8 0 0 0 0 5.6v2.4a2.8 2.8 0 0 0 0 5.6V26H6a3 3 0 0 1-3-3v-3.2a3.8 3.8 0 0 0 0-7.6V9Z"
        fill="currentColor"
      />
      {/* Right half, offset by the tear. */}
      <path
        d="M16 6h10a3 3 0 0 1 3 3v3.2a3.8 3.8 0 0 0 0 7.6V23a3 3 0 0 1-3 3H16v-3.2a2.8 2.8 0 0 0 0-5.6v-2.4a2.8 2.8 0 0 0 0-5.6V6Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

export function Logo({ className, textClassName }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="h-7 w-7 text-primary-500" />
      <span
        className={cn(
          'font-heading text-lg font-extrabold tracking-tight text-white',
          textClassName
        )}
      >
        Sherehe<span className="text-primary-400">Pass</span>
      </span>
    </span>
  );
}
