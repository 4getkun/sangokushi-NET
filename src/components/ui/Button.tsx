import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'bg-(--color-crimson-500) text-white shadow-[var(--shadow-glow)] hover:bg-(--color-crimson-600)',
  secondary:
    'bg-(--color-surface-hover) text-(--color-text) border border-(--color-border) hover:border-(--color-accent)/50',
  ghost: 'text-(--color-text-muted) hover:bg-(--color-surface-hover) hover:text-(--color-text)',
  danger: 'bg-(--color-crimson-700) text-white hover:bg-(--color-crimson-600)',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
