'use client';
// Liquid Glass (iOS 26-style) building blocks for the parent area — parent
// dashboard + child detail. Deliberately NOT the game's parchment/wood look:
// parents get a calm, native-feeling surface of translucent glass panels
// (blur + saturation + specular edge) floating over a soft color field, with
// grouped inset lists, 44pt rows, SF system font and systemBlue tint.
// Mobile-first; on wider screens the column centers and sheets become
// centered glass cards.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';

export const IOS = {
  label: '#000000',
  secondary: '#6C6C70',
  tertiary: '#AEAEB2',
  separator: 'rgba(60,60,67,0.16)',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  teal: '#30B0C7',
  gray: '#8E8E93',
} as const;

export const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif';

// Glass materials, backdrop, keyframes — injected once by <IosScreen>.
const GLASS_CSS = `
.lg-backdrop {
  background:
    radial-gradient(55% 40% at 0% 0%, rgba(120,180,255,0.55), transparent 70%),
    radial-gradient(45% 35% at 100% 12%, rgba(255,184,108,0.45), transparent 70%),
    radial-gradient(55% 40% at 85% 75%, rgba(196,160,255,0.40), transparent 70%),
    radial-gradient(50% 40% at 5% 95%, rgba(110,220,200,0.35), transparent 70%),
    #EEF0F6;
}
.lg-glass, .lg-glass-strong, .lg-chip {
  position: relative;
  -webkit-backdrop-filter: blur(28px) saturate(185%);
  backdrop-filter: blur(28px) saturate(185%);
  border: 1px solid rgba(255,255,255,0.7);
}
.lg-glass {
  background: rgba(255,255,255,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 1px rgba(255,255,255,0.3),
    0 10px 30px -8px rgba(40,50,90,0.14), 0 1px 2px rgba(40,50,90,0.06);
}
.lg-glass-strong {
  background: rgba(250,250,252,0.74);
  -webkit-backdrop-filter: blur(44px) saturate(190%);
  backdrop-filter: blur(44px) saturate(190%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 24px 60px -12px rgba(20,30,60,0.32);
}
.lg-chip {
  background: rgba(255,255,255,0.62);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 14px -4px rgba(40,50,90,0.18), 0 1px 2px rgba(40,50,90,0.08);
}
/* Specular sheen — the light catching the top-left edge of the glass. */
.lg-glass::before, .lg-glass-strong::before, .lg-chip::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(140deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 38%);
  mix-blend-mode: soft-light;
}
.lg-sheet .lg-glass { background: rgba(255,255,255,0.7); box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(40,50,90,0.05); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .lg-glass, .lg-chip { background: rgba(255,255,255,0.9); }
  .lg-glass-strong { background: rgba(250,250,252,0.97); }
}
.ios-group > *:last-child .ios-row-sep { border-bottom: 0 !important; }

@keyframes ios-sheet-up { from { transform: translateY(105%); } to { transform: translateY(0); } }
@keyframes ios-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ios-pop-in { from { opacity: 0; transform: scale(1.12); } to { opacity: 1; transform: scale(1); } }
@keyframes ios-push-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (min-width: 640px) {
  @keyframes ios-sheet-up { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
}
@media (prefers-reduced-motion: reduce) {
  .ios-anim { animation: none !important; }
}
`;

/** The soft color field the glass refracts. Fixed so it doesn't scroll away. */
function GlassBackdrop() {
  return <div aria-hidden className="lg-backdrop fixed inset-0 -z-10 pointer-events-none" />;
}

/* ── Screen + nav bar ─────────────────────────────────────────────────── */

/** Full-height screen with the glass backdrop; provides font + styles. */
export function IosScreen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`relative isolate min-h-screen text-[17px] leading-[22px] antialiased ${className}`}
      style={{ color: IOS.label, fontFamily: IOS_FONT, background: '#EEF0F6' }}
    >
      <style>{GLASS_CSS}</style>
      <GlassBackdrop />
      {children}
    </main>
  );
}

interface NavBarProps {
  /** Shown as a large title under the bar; collapses into the bar on scroll. */
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  /** Large-title style (top-level screens). Pushed screens use the inline title only. */
  large?: boolean;
}

/**
 * iOS 26 nav bar: no opaque bar — content scrolls under a soft progressive
 * blur, and bar buttons float as glass chips. Large title collapses on scroll.
 */
export function IosNavBar({ title, left, right, large = true }: NavBarProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(!large);

  useEffect(() => {
    if (!large || !sentinel.current) return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), { threshold: 0 });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [large]);

  return (
    <>
      <header className="sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* progressive blur + fade, strongest at the very top */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[calc(100%+20px)] pointer-events-none transition-opacity duration-300"
          style={{
            opacity: collapsed ? 1 : 0,
            background: 'linear-gradient(to bottom, rgba(238,240,246,0.9), rgba(238,240,246,0))',
            WebkitBackdropFilter: 'blur(14px)',
            backdropFilter: 'blur(14px)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)',
            maskImage: 'linear-gradient(to bottom, #000 55%, transparent)',
          }}
        />
        <div className="relative mx-auto max-w-[680px] h-[56px] px-4 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start min-w-0">{left}</div>
          <p
            className="text-[17px] font-semibold truncate max-w-[55vw] transition-opacity duration-200"
            style={{ opacity: collapsed ? 1 : 0 }}
          >
            {title}
          </p>
          <div className="justify-self-end min-w-0">{right}</div>
        </div>
      </header>
      {large && (
        <div className="mx-auto max-w-[680px] px-5 pb-3 -mt-2">
          <h1 className="text-[34px] leading-[41px] font-bold tracking-[0.01em]">{title}</h1>
          <div ref={sentinel} className="h-px" />
        </div>
      )}
    </>
  );
}

/**
 * Floating glass bar button. `back` renders the iOS 26 circular chevron chip
 * (children become its accessible label); otherwise a glass capsule with text.
 */
export function IosBarButton({
  children, onClick, bold, disabled, back,
}: { children: ReactNode; onClick?: () => void; bold?: boolean; disabled?: boolean; back?: boolean }) {
  if (back) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={typeof children === 'string' ? `Back to ${children}` : 'Back'}
        className="lg-chip w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform"
      >
        <Chevron dir="left" size={20} color={IOS.label} strokeWidth={2.6} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`lg-chip h-11 px-4 rounded-full text-[17px] active:scale-95 disabled:opacity-40 transition-transform ${bold ? 'font-semibold' : ''}`}
      style={{ color: IOS.blue }}
    >
      {children}
    </button>
  );
}

/** Centered content column. */
export function IosContent({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto max-w-[680px] px-4 pt-1 space-y-7"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 40px)' }}
    >
      {children}
    </div>
  );
}

/* ── Grouped list ─────────────────────────────────────────────────────── */

export function IosGroup({
  header, footer, children,
}: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {header && (
        <h2 className="px-5 pb-2 text-[15px] leading-[20px] font-semibold" style={{ color: IOS.label }}>
          {header}
        </h2>
      )}
      <div className="lg-glass ios-group rounded-[26px] overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className="px-5 pt-2 text-[13px] leading-[18px]" style={{ color: IOS.secondary }}>
          {footer}
        </div>
      )}
    </section>
  );
}

/** Rounded-square SF-style icon tile used at the start of a row. */
export function IosIconTile({ icon, color, size = 30 }: { icon: IconName; color: string; size?: number }) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: `linear-gradient(180deg, ${color}D9, ${color})`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.12)',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.6)} color="#FFFFFF" />
    </span>
  );
}

interface RowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned grey value ("Grade 5", "On", "120"). */
  detail?: ReactNode;
  /** Arbitrary trailing control (switch, button). Replaces detail + chevron. */
  accessory?: ReactNode;
  icon?: IconName;
  iconColor?: string;
  /** Custom leading element (e.g. a child avatar) instead of an icon tile. */
  leading?: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  chevron?: boolean;
  tint?: 'default' | 'blue' | 'red';
  center?: boolean;
  disabled?: boolean;
  /** Let a long title wrap instead of truncating to one line. */
  wrap?: boolean;
}

/**
 * A 44pt+ list row. Separator is inset to the text column like iOS, and is
 * drawn by the row itself (hidden on the last row via the `.ios-group` rule).
 */
export function IosRow({
  title, subtitle, detail, accessory, icon, iconColor = IOS.gray, leading,
  onClick, href, external, chevron, tint = 'default', center, disabled, wrap,
}: RowProps) {
  const interactive = !!(onClick || href) && !disabled;
  const showChevron = chevron ?? (interactive && !accessory && tint === 'default');
  const titleColor = tint === 'blue' ? IOS.blue : tint === 'red' ? IOS.red : IOS.label;

  const inner = (
    <div className={`flex items-center gap-3 pl-4 min-h-[48px] ${interactive ? 'active:bg-[#0000000F] transition-colors duration-75' : ''}`}>
      {leading ?? (icon && <IosIconTile icon={icon} color={iconColor} />)}
      <div
        className="ios-row-sep flex-1 min-w-0 flex items-center gap-2 pr-4 py-[12px] self-stretch"
        style={{ borderBottom: `0.5px solid ${IOS.separator}` }}
      >
        <div className={`flex-1 min-w-0 ${center ? 'text-center' : ''}`}>
          <p className={`text-[17px] leading-[22px] ${wrap ? '' : 'truncate'} ${tint !== 'default' ? 'font-medium' : ''}`} style={{ color: disabled ? IOS.tertiary : titleColor }}>{title}</p>
          {subtitle && (
            <p className="text-[13px] leading-[18px] mt-0.5 line-clamp-2" style={{ color: IOS.secondary }}>{subtitle}</p>
          )}
        </div>
        {accessory ?? (
          <>
            {detail !== undefined && (
              <span className="text-[17px] shrink-0 max-w-[45%] truncate" style={{ color: IOS.secondary }}>{detail}</span>
            )}
            {showChevron && <Chevron dir="right" size={14} color={IOS.tertiary} strokeWidth={3} />}
          </>
        )}
      </div>
    </div>
  );

  const cls = `block w-full text-left select-none ${disabled ? 'pointer-events-none' : ''}`;
  if (href) {
    if (href.startsWith('mailto:')) return <a href={href} className={cls}>{inner}</a>;
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    ) : (
      <Link href={href} className={cls}>{inner}</Link>
    );
  }
  if (onClick) {
    return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
  }
  return <div className={cls}>{inner}</div>;
}

/* ── Controls ─────────────────────────────────────────────────────────── */

export function IosSwitch({
  checked, onChange, disabled, label,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group relative shrink-0 w-[60px] h-[28px] rounded-full transition-colors duration-200 disabled:opacity-50"
      style={{ background: checked ? IOS.green : 'rgba(120,120,128,0.2)' }}
    >
      <span
        className="absolute top-[2px] left-[2px] w-[37px] h-[24px] rounded-full bg-[#ffffff] transition-transform duration-300 group-active:scale-x-110"
        style={{
          transform: checked ? 'translateX(19px)' : 'translateX(0)',
          transitionTimingFunction: 'cubic-bezier(0.34,1.4,0.64,1)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.04)',
        }}
      />
    </button>
  );
}

/** Full-width pill button (sheet CTAs, plan card) — "prominent glass". */
export function IosButton({
  children, onClick, disabled, type = 'button', variant = 'filled', color = IOS.blue,
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
  variant?: 'filled' | 'tinted' | 'plain'; color?: string;
}) {
  const style =
    variant === 'filled'
      ? {
          background: `linear-gradient(180deg, ${color}E6, ${color})`,
          color: '#FFFFFF',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 20px -6px ${color}99`,
        }
      : variant === 'tinted'
        ? { background: `${color}1F`, color }
        : { background: 'transparent', color };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-[52px] rounded-full text-[17px] font-semibold active:scale-[0.98] disabled:opacity-40 disabled:shadow-none transition-transform"
      style={style}
    >
      {children}
    </button>
  );
}

/** Small capsule button ("Show", "Award"). */
export function IosCapsule({
  children, onClick, disabled, filled, type = 'button',
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; filled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 h-[32px] px-4 rounded-full text-[15px] font-semibold active:scale-95 disabled:opacity-40 transition-transform ${filled ? '' : 'lg-chip'}`}
      style={
        filled
          ? { background: `linear-gradient(180deg, ${IOS.blue}E6, ${IOS.blue})`, color: '#FFFFFF', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }
          : { color: IOS.blue }
      }
    >
      {children}
    </button>
  );
}

/** Text field that sits inside an IosGroup as its own row. */
export function IosField(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className = '', ...rest } = props;
  return (
    <label className="flex items-center gap-3 pl-4 min-h-[48px]">
      <div className="ios-row-sep flex-1 flex items-center gap-3 pr-4 self-stretch" style={{ borderBottom: `0.5px solid ${IOS.separator}` }}>
        {label && <span className="w-[96px] shrink-0 text-[17px]">{label}</span>}
        <input
          {...rest}
          className={`flex-1 min-w-0 bg-transparent text-[17px] py-[12px] outline-none placeholder:text-[#AEAEB2] ${className}`}
        />
      </div>
    </label>
  );
}

/** iOS segmented control on a glass track. */
export function IosSegmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="lg-chip flex p-[3px] rounded-full">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative flex-1 h-[32px] rounded-full text-[15px] font-semibold transition-all"
            style={active ? { background: '#FFFFFF', boxShadow: '0 3px 10px rgba(0,0,0,0.12)' } : { color: IOS.secondary }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Sheets, alerts, pushed pages ─────────────────────────────────────── */

function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/** Circular glass toolbar button used in sheet headers (X / checkmark). */
function GlassCircle({
  icon, label, onClick, disabled, prominent,
}: { icon: IconName; label: string; onClick?: () => void; disabled?: boolean; prominent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-40 transition-transform ${prominent ? '' : 'lg-chip'}`}
      style={prominent ? {
        background: `linear-gradient(180deg, ${IOS.blue}E6, ${IOS.blue})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 16px -4px ${IOS.blue}99`,
      } : undefined}
    >
      <Icon name={icon} size={20} color={prominent ? '#FFFFFF' : IOS.label} strokeWidth={2.4} />
    </button>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Right-side confirm action (rendered as the blue checkmark button). */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  /** "Done" renders a checkmark close button; anything else renders an X. */
  closeLabel?: string;
  children: ReactNode;
}

/** Floating glass sheet: inset bottom card on phones, centered card on desktop. */
export function IosSheet({ open, onClose, title, action, closeLabel = 'Cancel', children }: SheetProps) {
  useLockBodyScroll(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center"
      style={{ fontFamily: IOS_FONT, padding: '0 6px max(env(safe-area-inset-bottom), 6px)' }}
    >
      <div
        className="ios-anim absolute inset-0 bg-[#000000]/25"
        style={{ animation: 'ios-fade-in 200ms ease-out' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="lg-glass-strong lg-sheet ios-anim w-full sm:max-w-[540px] max-h-[94vh] sm:max-h-[85vh] flex flex-col rounded-[34px] overflow-hidden"
        style={{ color: IOS.label, animation: 'ios-sheet-up 380ms cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="sm:hidden flex justify-center pt-[7px]">
          <span className="w-9 h-[5px] rounded-full" style={{ background: 'rgba(60,60,67,0.3)' }} />
        </div>
        <div className="h-[60px] px-3 grid grid-cols-[1fr_auto_1fr] items-center shrink-0">
          <div className="justify-self-start">
            {closeLabel === 'Done' && !action
              ? <GlassCircle icon="check" label="Done" onClick={onClose} />
              : <GlassCircle icon="xmark" label={closeLabel} onClick={onClose} />}
          </div>
          <p className="text-[17px] font-semibold truncate px-2">{title}</p>
          <div className="justify-self-end">
            {action && (
              <GlassCircle icon="check" label={action.label} onClick={action.onClick} disabled={action.disabled} prominent />
            )}
          </div>
        </div>
        <div
          className="overflow-y-auto overscroll-contain px-3 sm:px-4 pt-2 pb-6 space-y-7"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

interface AlertProps {
  open: boolean;
  title: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** iOS 26 alert: rounded glass card with side-by-side pill buttons. */
export function IosAlert({
  open, title, message, cancelLabel = 'Cancel', confirmLabel, destructive, busy, onCancel, onConfirm,
}: AlertProps) {
  useLockBodyScroll(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center px-8" style={{ fontFamily: IOS_FONT }}>
      <div className="ios-anim absolute inset-0 bg-[#000000]/25" style={{ animation: 'ios-fade-in 150ms ease-out' }} onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        className="lg-glass-strong ios-anim w-full max-w-[300px] rounded-[34px] p-5 space-y-4"
        style={{ animation: 'ios-pop-in 260ms cubic-bezier(0.34,1.3,0.64,1)' }}
      >
        <div className="space-y-1 px-1">
          <p className="text-[17px] font-semibold leading-[22px]" style={{ color: IOS.label }}>{title}</p>
          {message && <p className="text-[15px] leading-[20px]" style={{ color: IOS.label }}>{message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-full text-[17px] font-medium active:scale-95 transition-transform"
            style={{ background: 'rgba(120,120,128,0.16)', color: IOS.label }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-12 rounded-full text-[17px] font-semibold active:scale-95 disabled:opacity-40 transition-transform"
            style={destructive
              ? { background: 'rgba(255,59,48,0.14)', color: IOS.red }
              : { background: IOS.blue, color: '#FFFFFF' }}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pushed navigation page — slides in from the right over the current screen. */
export function IosPushedPage({ children }: { children: ReactNode }) {
  useLockBodyScroll(true);
  return (
    <div
      className="ios-anim fixed inset-0 z-40 overflow-y-auto isolate"
      style={{ color: IOS.label, fontFamily: IOS_FONT, background: '#EEF0F6', animation: 'ios-push-in 380ms cubic-bezier(0.32,0.72,0,1)' }}
    >
      <GlassBackdrop />
      {children}
    </div>
  );
}

/* ── Icons (SF Symbols-ish line icons) ────────────────────────────────── */

export function Chevron({
  dir, size = 14, color = 'currentColor', strokeWidth = 2.5,
}: { dir: 'left' | 'right' | 'down'; size?: number; color?: string; strokeWidth?: number }) {
  const d = dir === 'left' ? 'M15 5l-7 7 7 7' : dir === 'right' ? 'M9 5l7 7-7 7' : 'M5 9l7 7 7-7';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICON_PATHS = {
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  coins: 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5',
  plus: 'M12 5v14M5 12h14',
  xmark: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20c.8-3.6 3.9-6 7.5-6s6.7 2.4 7.5 6',
  people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.6-3.3 3.3-5.5 6.5-5.5s5.9 2.2 6.5 5.5M16 4.3a3.5 3.5 0 010 6.4M18 14.8c2 .7 3.3 2.6 3.6 5.2',
  chart: 'M5 20V11M12 20V5M19 20v-6',
  book: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z',
  calendar: 'M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zM4 10h16M8 3.5v4M16 3.5v4',
  bag: 'M5 8h14l-1 12H6zM9 8V6.5a3 3 0 016 0V8',
  ticket: 'M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4zM14 7v10',
  tag: 'M3.5 12.5V4.5h8l9 9-8 8zM8 8.5h.01',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 004 0',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  chat: 'M12 3.5c4.7 0 8.5 3.4 8.5 7.8s-3.8 7.8-8.5 7.8c-.9 0-1.8-.1-2.6-.4L5.5 20.5l.9-3.4C4.6 15.7 3.5 13.6 3.5 11.3c0-4.4 3.8-7.8 8.5-7.8zM7.5 13l3-3.2 2.2 2 3.8-2.8-3 3.2-2.2-2z',
  ladybug: 'M12 6a6 6 0 016 6v2a6 6 0 01-12 0v-2a6 6 0 016-6zM12 6v14M6.5 10H4M20 10h-2.5M6 15H3.5M20.5 15H18M9 4l1.5 2M15 4l-1.5 2',
  exit: 'M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h10',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
  lock: 'M7 11V8a5 5 0 0110 0v3M5.5 11h13v9h-13z',
  flame: 'M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.2-2-5.3-3.6-7.2-.3 1.8-1.2 3-2.4 3.6.4-3.2-1-6.2-3.5-7.6.3 3-1.4 4.8-2.8 6.6C5.3 11.3 5.5 13 5.5 14.7 5.5 18.4 8.1 21 12 21z',
  key: 'M14.5 4a5.5 5.5 0 11-4.9 8L4 17.6V20h3v-2h2v-2h2l.6-.6A5.5 5.5 0 0114.5 4zM16 8h.01',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  journal: 'M6 3.5h11a1 1 0 011 1v15a1 1 0 01-1 1H6zM9 3.5v17M12 8h3M12 11.5h3',
  doc: 'M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 15.5h5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  compare: 'M8 4v16M16 4v16M4 8h8M12 16h8',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  sparkle: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

const FILLED_ICONS = new Set<IconName>(['star', 'flame', 'sparkle']);

export function Icon({
  name, size = 18, color = 'currentColor', strokeWidth = 2,
}: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const filled = FILLED_ICONS.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={filled ? 1 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
