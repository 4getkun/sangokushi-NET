import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  glass = false,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-(--color-border) p-5 shadow-[var(--shadow-soft)]',
        glass ? 'glass-panel' : 'bg-(--color-surface)',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`mb-3 text-sm font-semibold tracking-wide text-(--color-text-muted) uppercase ${className}`}>
      {children}
    </h3>
  );
}
