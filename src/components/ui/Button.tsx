import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The one button.
 *
 * Renders an `<a>` when given `href` and a `<button>` otherwise, so a link that
 * looks like a button is still a link: middle-click opens it in a tab, and a
 * screen reader announces it correctly.
 *
 * Variants encode the colour rules from tailwind.config.js. `primary` is pink
 * and marks the brand action; `pay` is lime and is reserved for the step that
 * actually spends money, so exactly one button on the checkout page is lime.
 */
const VARIANTS = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-500 shadow-glow hover:shadow-[0_0_0_1px_rgba(255,31,163,0.4),0_10px_50px_-8px_rgba(255,31,163,0.5)]',
  pay: 'bg-secondary-300 text-dark-950 hover:bg-secondary-200 font-semibold',
  secondary:
    'bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.11] hover:border-white/20',
  ghost: 'text-dark-300 hover:text-white hover:bg-white/[0.06]',
  danger: 'bg-danger-600 text-white hover:bg-danger-500',
  outline:
    'border border-primary-500/40 text-primary-300 hover:bg-primary-500/10 hover:border-primary-500/70',
} as const;

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
  icon: 'h-10 w-10 justify-center',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

/**
 * A discriminated union rather than one loose prop bag: with `href` the
 * component accepts anchor attributes, and without it, button attributes. That
 * is what stops `<Button href="/x" type="submit">` and `<Button disabled>` on
 * a link — neither of which does anything, and both of which look correct.
 */
type ButtonAsLink = SharedProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'> & {
    href: string;
  };

type ButtonAsButton = SharedProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'> & {
    href?: undefined;
  };

export type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children } = props;

  const classes = cn(
    'inline-flex items-center rounded-xl font-medium transition-all duration-200',
    // Disabled covers both the attribute and the aria state, because a form
    // button mid-submit is often the latter.
    'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
    'active:scale-[0.98]',
    VARIANTS[variant],
    SIZES[size],
    className
  );

  if (props.href !== undefined) {
    const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    return (
      <Link className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, ...rest } =
    props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
