// components/nav/JourneyTrail.tsx
//
// Today's To-Do drawn as a trail of big picture stops that ends at a reward
// chest (the daily bonus), for the new navigation's Today tab
// (docs/nav-redesign.md). DailyChecklist owns the data and the claim; this is
// only the picture. Words are labels, not sentences, so it reads like a game.
'use client';

import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { playPageFlip } from '@/lib/sounds';

export interface JourneyStop {
  key: string;
  label: string;        // under the stop, one word
  icon: string;
  done: boolean;
  does: string;         // full sentence for screen readers
  count?: string;       // e.g. "2/5" on the guild stop
  onGo?: () => void;
}

interface Props {
  stops: JourneyStop[];
  claimed: boolean;
  claiming: boolean;
  gold: number;
  online: boolean;
  onClaim: () => void;
  compact?: boolean;
}

const BG = 'linear-gradient(rgba(10,8,7,0.35), rgba(10,8,7,0.8)), url("/intro/ledger_hall.webp") center 40% / cover';
const LABEL_SHADOW = { textShadow: '0 1px 2px rgba(0,0,0,.9)' };
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542]';

export default function JourneyTrail({ stops, claimed, claiming, gold, online, onClaim, compact }: Props) {
  const doneCount = stops.filter(s => s.done).length;
  const left = stops.length - doneCount;
  const nextIdx = stops.findIndex(s => !s.done && s.onGo);
  const node = compact ? 46 : 56;
  const cols = stops.length + 1;

  return (
    <section aria-label="Today's journey" className="relative rounded-2xl border-2 border-[#8b5e2a] overflow-hidden" style={{ background: BG, boxShadow: '0 3px 0 #4a2f18' }}>
      <div className={compact ? 'p-2.5' : 'p-3'}>
        <div className="flex items-center justify-between gap-2">
          <span style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: compact ? 15 : 18 }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>Today&apos;s Journey</span>
              <span style={questTextStyle}>Today&apos;s Journey</span>
            </span>
          </span>
          <span className="rounded-full bg-[#0a0807]/70 border border-[#f5c542]/70 text-[#f5c542] text-[11px] font-black px-2 py-0.5 whitespace-nowrap">
            {doneCount} of {stops.length} done
          </span>
        </div>

        <div className="relative mt-3" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {/* The path between stops turns gold once the stop before it is done. */}
          {stops.map((s, i) => (
            <span
              key={`path-${s.key}`}
              aria-hidden
              className="absolute"
              style={{
                left: `${((i + 0.5) / cols) * 100}%`, width: `${100 / cols}%`, top: node / 2 - 3, height: 6, borderRadius: 3,
                background: s.done ? '#f5c542' : 'transparent',
                border: s.done ? '1px solid #8b5e2a' : '2px dashed rgba(245,197,66,.55)',
              }}
            />
          ))}
          {stops.map((s, i) => {
            const isNext = i === nextIdx;
            const state = s.done ? 'done' : isNext ? 'do this next' : 'not done yet';
            return (
              <div key={s.key} className="relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => { if (s.onGo) { playPageFlip(); s.onGo(); } }}
                  disabled={!s.onGo}
                  aria-label={`${s.does}, ${state}${s.count ? `, ${s.count}` : ''}`}
                  className={`relative rounded-full flex items-center justify-center active:scale-95 ${FOCUS_RING}`}
                  style={{
                    width: node, height: node,
                    background: s.done ? '#dcfce7' : '#f0ddb8',
                    border: `3px solid ${s.done ? '#15803d' : isNext ? '#f5c542' : '#8b5e2a'}`,
                    boxShadow: isNext ? '0 0 0 3px rgba(245,197,66,.45), 0 3px 0 #4a2f18' : '0 3px 0 #4a2f18',
                  }}
                >
                  <img src={s.icon} alt="" className="object-contain" style={{ width: node - 16, height: node - 16 }} />
                  {s.done && (
                    <span aria-hidden className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#15803d] border-2 border-[#ffffff] text-[#ffffff] text-[11px] font-black leading-none flex items-center justify-center">✓</span>
                  )}
                  {!s.done && s.count && (
                    <span aria-hidden className="absolute -top-1.5 -right-2 rounded-full bg-[#2563eb] border-2 border-[#ffffff] text-[#ffffff] text-[11px] font-black px-1 leading-[14px]">{s.count}</span>
                  )}
                </button>
                <span aria-hidden className={`mt-1 text-[11px] font-black whitespace-nowrap ${isNext ? 'text-[#f5c542]' : 'text-[#ffffff]'}`} style={LABEL_SHADOW}>
                  {isNext ? `${s.label}!` : s.label}
                </span>
              </div>
            );
          })}
          {/* The reward at the end of the path: the daily bonus. */}
          <div className="relative flex flex-col items-center">
            <span aria-hidden className="relative flex items-center justify-center" style={{ width: node, height: node }}>
              <img
                src="/nav/vault.png"
                alt=""
                className="object-contain"
                style={{ width: node + 4, height: node + 4, filter: left > 0 ? 'grayscale(.85) brightness(.8)' : 'drop-shadow(0 0 8px rgba(245,197,66,.9))' }}
              />
            </span>
            <span aria-hidden className="mt-1 text-[11px] font-black text-[#f5c542] whitespace-nowrap" style={LABEL_SHADOW}>{gold} gold</span>
          </div>
        </div>

        <div className="mt-2.5" style={{ fontSize: compact ? 13 : 15 }}>
          {claimed ? (
            <p className="text-center text-[#f5c542] text-[13px] font-black" style={LABEL_SHADOW}>Chest opened! Come back tomorrow.</p>
          ) : left > 0 ? (
            <p className="text-center text-[#ffffff] text-[13px] font-bold" style={LABEL_SHADOW}>
              {left === 1 ? 'One more stop to open the chest!' : `${left} more stops to open the chest!`}
            </p>
          ) : (
            <GameButton
              variant="quest"
              color={online ? '#d97706' : '#a8a29e'}
              disabled={!online || claiming}
              onClick={onClaim}
              className="w-full"
              style={{ minHeight: 44 }}
            >
              {!online ? 'Open it when the internet is back' : claiming ? 'Opening…' : `Open the chest! ${gold} gold`}
            </GameButton>
          )}
        </div>
      </div>
    </section>
  );
}
