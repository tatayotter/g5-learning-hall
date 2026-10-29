'use client';
// The one frame for every in-game pop-up a kid opens from the world: talking to the Shopkeeper,
// using a station, feeding a curio... (docs/STYLE_GUIDE.md "In-game pop-ups"). Phone first: it's
// a sheet that slides up from the bottom of the screen, as tall as it needs (never more than
// 88% of it), with the thumb-reach close button on top. From a tablet up it's a centred card.
//
//  ┌ wood header ─────────────────────────────┐  who you're talking to (portrait, name, their
//  │ (o) Shopkeeper                       [X] │  line) or the place's name; the close button
//  │     "Look, but don't lick the potions."  │
//  ├ toolbar (optional, stays put) ───────────┤  tabs, filters, the kid's gold
//  │ parchment body (scrolls)                 │
//  ├ footer (optional, stays put) ────────────┤  the main action
//  └──────────────────────────────────────────┘
//
// Esc, the X and a tap outside all close it.
import { useEffect, useId, type ReactNode } from 'react';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

export interface GamePopupProps {
  title: string;
  /** Who the kid is talking to: their picture and what they say (one short line). */
  speaker?: { portrait: ReactNode; line?: string | null };
  /** A small picture for a place or thing (no speaker), shown left of the title. */
  icon?: ReactNode;
  /** Under the title when there's no speaker line: what this is for, in a few words. */
  subtitle?: string;
  /** Stays at the top of the body while it scrolls (tabs, filters, the kid's gold). */
  toolbar?: ReactNode;
  /** Stays at the bottom (the main action). */
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** 'md' for a few rows, 'lg' for a shop or a list. Only changes the desktop width. */
  size?: 'md' | 'lg';
  testId?: string;
  /** Already inside a dimmed full-screen layer (the map's overlay, MapStage.tsx): just the
   *  frame, no backdrop of its own. app/globals.css docks it to the bottom on a phone. */
  inline?: boolean;
  /** Extra data-* attributes on the frame (tests read them). */
  data?: Record<string, string>;
}

const POPUP_CSS = `
  @keyframes gp-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes gp-pop { from { opacity: 0; transform: translate(-50%, -46%) scale(.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
  @keyframes gp-fade { from { opacity: 0; } to { opacity: 1; } }
  .gp-sheet { animation: gp-up .26s cubic-bezier(.2,.9,.3,1.1); }
  @media (min-width: 640px) { .gp-sheet { animation: gp-pop .2s ease-out; } .gp-inline { animation: gp-pop-inline .2s ease-out; } }
  @keyframes gp-pop-inline { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  .gp-back { animation: gp-fade .2s ease-out; }
  @media (prefers-reduced-motion: reduce) { .gp-sheet, .gp-back { animation: none; } }
`;

export default function GamePopup({ title, speaker, icon, subtitle, toolbar, footer, onClose, children, size = 'md', testId, inline = false, data }: GamePopupProps) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  const sheet = (
    <div
      className={inline
        ? `gp-sheet gp-inline relative flex flex-col w-full max-h-[88dvh] rounded-t-[20px] overflow-hidden border-2 border-b-0 border-[#4a2f18] sm:max-h-[85dvh] sm:rounded-[20px] sm:border-b-2
          ${size === 'lg' ? 'sm:w-[min(720px,94vw)]' : 'sm:w-[min(480px,94vw)]'}`
        : `gp-sheet absolute inset-x-0 bottom-0 flex flex-col max-h-[88dvh] rounded-t-[20px] overflow-hidden border-2 border-b-0 border-[#4a2f18]
        sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh] sm:rounded-[20px] sm:border-b-2
        ${size === 'lg' ? 'sm:w-[min(720px,94vw)]' : 'sm:w-[min(480px,94vw)]'}`}
      style={{ boxShadow: '0 0 0 3px #d4a017, 0 -6px 30px rgba(0,0,0,.45)' }}
      {...(inline ? { role: 'dialog', 'aria-labelledby': titleId, 'data-testid': testId, ...dataAttrs } : {})}
    >
      <GamePopupHeader title={title} titleId={titleId} speaker={speaker} icon={icon} subtitle={subtitle} onClose={onClose} testId={testId} />
      {toolbar && <div className="flex-shrink-0 bg-[#e8d0a0] border-b-2 border-[#c9a87a] px-3 py-2">{toolbar}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f0ddb8] px-3 py-3 sm:px-4">
        {children}
      </div>
      {footer && (
        <div className="flex-shrink-0 bg-[#e8d0a0] border-t-2 border-[#c9a87a] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{footer}</div>
      )}
      {!footer && <div className="flex-shrink-0 bg-[#f0ddb8] pb-[env(safe-area-inset-bottom)] sm:hidden" />}
    </div>
  );
  if (inline) return <><style>{POPUP_CSS}</style>{sheet}</>;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid={testId} {...dataAttrs}>
      <style>{POPUP_CSS}</style>
      <div className="gp-back absolute inset-0 bg-[#0a0807]/60" onClick={onClose} data-testid={testId ? `${testId}-backdrop` : undefined} />
      {sheet}
    </div>
  );
}

/** The pop-up's wood header on its own, for a page over the map that wants the same top
 *  (Baylan's quests, components/nav/BaylanQuestHeader.tsx). */
export function GamePopupHeader({ title, titleId, speaker, icon, subtitle, onClose, testId, className = '', grabBar = true, closeLabel = 'Close' }: Pick<GamePopupProps, 'title' | 'speaker' | 'icon' | 'subtitle' | 'onClose' | 'testId'> & { titleId?: string; className?: string; grabBar?: boolean; closeLabel?: string }) {
  return (
    <div className={`relative flex-shrink-0 px-3 pt-2 pb-3 sm:pt-3 ${className}`} style={woodTextureStyle}>
      <Nail className="top-2 left-2" />
      <Nail className="top-2 right-2" />
      {/* The grab bar says "this slides" on a phone. */}
      {grabBar && <div className="sm:hidden mx-auto mb-1.5 h-1 w-10 rounded-full bg-[#f0ddb8]/50" aria-hidden />}
      <div className="flex items-center gap-3 pr-12">
        {(speaker?.portrait ?? icon) && (
          <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-[#d4a017] bg-[radial-gradient(circle,#fff6d6_0%,#f0ddb8_80%)] flex items-start justify-center">
            {speaker?.portrait ?? icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg leading-tight truncate" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>{title}</span>
              <span style={{ ...questTextStyle, color: '#f5c542' }}>{title}</span>
            </span>
          </h2>
          {speaker?.line ? (
            <p className="mt-1 inline-block max-w-full rounded-xl rounded-tl-sm bg-[#fffdf7] border-2 border-[#2a1505] px-2.5 py-1 text-[13px] font-semibold leading-snug text-[#2a1505]" data-testid={testId ? `${testId}-line` : undefined}>
              {speaker.line}
            </p>
          ) : subtitle ? (
            <p className="text-xs font-semibold leading-snug text-[#f0ddb8]" style={{ textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-[#2a1505] border-2 border-[#d4a017] text-[#fde68a] text-xl font-black leading-none shadow-[0_3px_0_#1a0d05] active:translate-y-[calc(-50%+2px)] active:shadow-none"
        data-testid={testId ? `${testId}-close` : undefined}
      >
        ×
      </button>
    </div>
  );
}
