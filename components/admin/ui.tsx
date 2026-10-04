'use client';
// Admin design system: dark, neutral surfaces with one blue accent.
//
// Colors are CSS variables set on the admin root (ADMIN_THEME) and used via
// Tailwind arbitrary values, never Tailwind palette names — app/globals.css
// remaps blue/gray/green/neutral/red/yellow to the game's dungeon palette.
// Values come from the dataviz reference palette's dark mode, so charts and
// chrome share one validated set.
import {
  createContext, useCallback, useContext, useRef, useState,
  type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert, CircleCheck, Search, TrendingDown, TrendingUp, X, type LucideIcon } from 'lucide-react';

export const ADMIN_THEME = {
  '--a-page': '#0d0d0d',
  '--a-surface': '#1a1a19',
  '--a-surface-2': '#232321',
  '--a-surface-3': '#2c2c2a',
  '--a-border': 'rgba(255,255,255,0.10)',
  '--a-border-strong': 'rgba(255,255,255,0.18)',
  '--a-ink': '#ffffff',
  '--a-ink-2': '#c3c2b7',
  '--a-muted': '#898781',
  '--a-grid': '#2c2c2a',
  '--a-axis': '#383835',
  '--a-accent': '#3987e5',
  '--a-accent-soft': 'rgba(57,135,229,0.16)',
  '--a-good': '#0ca30c',
  '--a-warning': '#fab219',
  '--a-serious': '#ec835a',
  '--a-critical': '#d03b3b',
  '--a-series-1': '#3987e5',
  '--a-series-2': '#d95926',
  colorScheme: 'dark',
} as CSSProperties;

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-[var(--a-ink)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--a-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title, description, actions, children, className, bodyClassName,
}: {
  title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cx('rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)]', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-[var(--a-ink)]">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-[var(--a-muted)]">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── Stat tile ──────────────────────────────────────────────────────────── */

export function StatTile({
  label, value, icon: Icon, delta, deltaLabel, hint, loading,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Fractional change vs the comparison period (0.25 = +25%). null hides it. */
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  loading?: boolean;
}) {
  const up = (delta ?? 0) > 0;
  const flat = delta === 0;
  return (
    <div className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--a-ink-2)]">{label}</p>
        {Icon && <Icon size={16} className="text-[var(--a-muted)]" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-20" />
      ) : (
        <p className="mt-2 text-[26px] leading-8 font-semibold tracking-tight text-[var(--a-ink)]">{value}</p>
      )}
      <div className="mt-1.5 flex items-center gap-1.5 text-xs min-h-[18px]">
        {!loading && delta != null && Number.isFinite(delta) && (
          <span
            className={cx(
              'inline-flex items-center gap-0.5 font-medium',
              flat ? 'text-[var(--a-muted)]' : up ? 'text-[var(--a-good)]' : 'text-[var(--a-serious)]',
            )}
          >
            {!flat && (up ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />)}
            {up ? '+' : ''}{Math.round(delta * 100)}%
          </span>
        )}
        {!loading && (deltaLabel || hint) && <span className="text-[var(--a-muted)]">{delta != null ? deltaLabel : hint}</span>}
      </div>
    </div>
  );
}

/* ── Controls ───────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary', size = 'md', icon: Icon, children, className, ...rest
}: {
  variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: LucideIcon; children?: ReactNode; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--a-page)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-[var(--a-accent)] text-[#ffffff] hover:brightness-110',
        variant === 'secondary' && 'border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-ink)] hover:bg-[var(--a-surface-3)]',
        variant === 'ghost' && 'text-[var(--a-ink-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]',
        variant === 'danger' && 'bg-[var(--a-critical)] text-[#ffffff] hover:brightness-110',
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden />}
      {children}
    </button>
  );
}

export function Switch({
  checked, onChange, label, description, disabled,
}: {
  checked: boolean; onChange: (next: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  return (
    <label className={cx('inline-flex items-center gap-2.5 select-none', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--a-page)]',
          checked ? 'bg-[var(--a-accent)]' : 'bg-[var(--a-surface-3)] border border-[var(--a-border)]',
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#ffffff] shadow transition-[left]',
            checked ? 'left-[18px]' : 'left-[2px]',
          )}
        />
      </button>
      <span className="leading-tight">
        <span className="block text-sm text-[var(--a-ink)]">{label}</span>
        {description && <span className="block text-xs text-[var(--a-muted)]">{description}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-7 rounded-md px-2.5 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)]',
            value === o.value
              ? 'bg-[var(--a-surface-3)] text-[var(--a-ink)] shadow-sm'
              : 'text-[var(--a-muted)] hover:text-[var(--a-ink)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type BadgeTone = 'neutral' | 'info' | 'good' | 'warning' | 'critical';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const color = {
    neutral: 'var(--a-ink-2)',
    info: 'var(--a-accent)',
    good: 'var(--a-good)',
    warning: 'var(--a-warning)',
    critical: 'var(--a-critical)',
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--a-border)] bg-[var(--a-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--a-ink-2)]"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {children}
    </span>
  );
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-[var(--a-surface-3)]', className)} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm font-medium text-[var(--a-ink-2)]">{title}</p>
      {description && <p className="mt-1 text-xs text-[var(--a-muted)]">{description}</p>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--a-critical)]/40 bg-[var(--a-critical)]/10 px-4 py-3 text-sm text-[var(--a-ink)]">
      <span>{message}</span>
      {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

/* ── Form fields ────────────────────────────────────────────────────────── */

// No width here: Input/Textarea default to full width, Select only when the
// caller doesn't size it (filter bars want natural-width selects).
const fieldBase =
  'rounded-lg border border-[var(--a-border-strong)] bg-[var(--a-page)] text-sm text-[var(--a-ink)] ' +
  'placeholder:text-[var(--a-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--a-accent)] focus:border-transparent ' +
  'disabled:opacity-50';

/** `group` renders a div instead of a <label>, for button groups (a label
 *  around several buttons would forward clicks on its text to the first). */
export function Field({ label, hint, children, className, group }: {
  label: string; hint?: ReactNode; children: ReactNode; className?: string; group?: boolean;
}) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className={cx('block', className)} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className="mb-1.5 block text-xs font-medium text-[var(--a-ink-2)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--a-muted)]">{hint}</span>}
    </Tag>
  );
}

export function Input({ className, mono, ...rest }: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return <input {...rest} className={cx(fieldBase, 'h-9 w-full px-3', mono && 'font-mono', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(fieldBase, 'h-9 px-2.5 pr-8', /(^|\s)w-/.test(className ?? '') ? null : 'w-full', className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(fieldBase, 'w-full px-3 py-2 resize-y', className)} />;
}

export function SearchInput({ value, onChange, placeholder = 'Search', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--a-muted)]" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(fieldBase, 'h-9 w-full pl-8 pr-3')}
      />
    </div>
  );
}

/* ── Table ──────────────────────────────────────────────────────────────── */

export function Table({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)]">
      <table className="w-full text-sm" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export function Th({ children, align = 'left', className }: { children?: ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return (
    <th
      className={cx(
        'whitespace-nowrap border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-2.5 text-xs font-medium text-[var(--a-muted)]',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = 'left', className, colSpan }: {
  children?: ReactNode; align?: 'left' | 'right' | 'center'; className?: string; colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cx(
        'border-b border-[var(--a-border)] px-4 py-3 align-middle text-[var(--a-ink-2)]',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** "Showing 1-50 of 306" plus prev/next. */
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--a-muted)]">
      <span>Showing {from.toLocaleString()} to {to.toLocaleString()} of {total.toLocaleString()}</span>
      <div className="flex gap-2">
        <Button size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/* ── Toasts ─────────────────────────────────────────────────────────────── */

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: number; tone: ToastTone; message: string }

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

/** Replaces alert(): a short message in the corner that clears itself. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === 'error' ? CircleAlert : CircleCheck;
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-[var(--a-border-strong)] bg-[var(--a-surface-2)] px-3.5 py-3 text-sm text-[var(--a-ink)] shadow-xl"
            >
              <Icon
                size={18}
                className="mt-px shrink-0"
                style={{ color: t.tone === 'error' ? 'var(--a-critical)' : t.tone === 'success' ? 'var(--a-good)' : 'var(--a-accent)' }}
                aria-hidden
              />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-[var(--a-muted)] hover:text-[var(--a-ink)]" aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
