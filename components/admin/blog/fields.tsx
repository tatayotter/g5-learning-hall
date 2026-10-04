'use client';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '@/components/admin/ui';

// Form controls for the blog editor, on the admin design tokens (components/admin/ui.tsx).
const CONTROL = cx(
  'w-full rounded-lg border border-[var(--a-border-strong)] bg-[var(--a-page)] px-3 text-sm text-[var(--a-ink)]',
  'placeholder:text-[var(--a-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--a-accent)]',
);

export function Field({ label, hint, counter, children, className }: {
  label: string; hint?: ReactNode; counter?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-[var(--a-ink-2)]">{label}</span>
        {counter && <span className="text-[11px] tabular-nums text-[var(--a-muted)]">{counter}</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-4 text-[var(--a-muted)]">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(CONTROL, 'h-9', className)} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(CONTROL, 'py-2 leading-relaxed resize-y', className)} />;
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(CONTROL, 'h-9', className)}>
      {children}
    </select>
  );
}

/** Character counter that turns amber outside the ideal range. */
export function charCount(value: string, min: number, max: number) {
  const n = value.length;
  const ok = n === 0 || (n >= min && n <= max);
  return <span className={ok ? undefined : 'text-[var(--a-warning)]'}>{n} / {min}-{max}</span>;
}
