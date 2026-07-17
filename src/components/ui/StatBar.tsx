import type { ReactNode } from 'react';

export function StatBar({
  label,
  value,
  max,
  color = 'crimson',
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color?: 'crimson' | 'gold' | 'jade' | 'azure';
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colorVar = `var(--color-${color}-500)`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-(--color-text-muted)">{label}</span>
        <span className="font-mono tabular-nums text-(--color-text)">
          {value.toLocaleString()}
          {suffix ?? ''} <span className="text-(--color-text-faint)">/ {max.toLocaleString()}{suffix ?? ''}</span>
        </span>
      </div>
      <div className="stat-track h-2 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: colorVar }}
        />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'crimson' | 'gold' | 'jade';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-(--color-surface-hover) text-(--color-text-muted) border-(--color-border)',
    crimson: 'bg-(--color-crimson-500)/15 text-(--color-crimson-500) border-(--color-crimson-500)/30',
    gold: 'bg-(--color-gold-500)/15 text-(--color-gold-600) border-(--color-gold-500)/30',
    jade: 'bg-(--color-jade-500)/15 text-(--color-jade-600) border-(--color-jade-500)/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
