'use client';
// components/monster/MissionStory.tsx
// The story of a curio's idle mission (lib/missionStories.ts), opened by tapping its card in
// MissionsPanel. Phone first: a trail across the top from the Curio Camp's tent to the mission's
// flag, the curio hopping along it as time passes (it turns round for the walk home at 90%), four
// stones that light up as each beat is reached; under it the beats so far, newest first. A beat
// the kid hasn't seen yet pops in with a little sparkle. With "reduce motion" on nothing moves.
import { MonsterImage } from '@/components/battle/shared';
import type { MonsterDef } from '@/lib/monsterConfig';
import { BEAT_AT, BEAT_TITLES } from '@/lib/missionStories';

const CSS = `
  @keyframes ms-hop { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes ms-pop { 0% { opacity: 0; transform: translateY(8px) scale(.96); } 60% { opacity: 1; transform: translateY(-2px) scale(1.02); } 100% { transform: none; } }
  @keyframes ms-spark { 0% { opacity: 0; transform: scale(.2) rotate(0deg); } 40% { opacity: 1; } 100% { opacity: 0; transform: scale(1.4) rotate(90deg); } }
  @keyframes ms-glow { 0%, 100% { box-shadow: 0 0 0 2px #f5c542, 0 0 10px 2px rgba(245,197,66,.5); } 50% { box-shadow: 0 0 0 2px #f5c542, 0 0 18px 6px rgba(245,197,66,.8); } }
  @keyframes ms-wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
  .ms-hop { animation: ms-hop .6s ease-in-out infinite; }
  .ms-pop { animation: ms-pop .5s ease-out both; }
  .ms-spark { animation: ms-spark .9s ease-out .15s both; }
  .ms-glow { animation: ms-glow 1.6s ease-in-out infinite; }
  .ms-wave { animation: ms-wave 1.2s ease-in-out infinite; transform-origin: 50% 90%; }
  @media (prefers-reduced-motion: reduce) { .ms-hop, .ms-pop, .ms-spark, .ms-glow, .ms-wave { animation: none; } }
`;
export const MissionStoryCss = () => <style>{CSS}</style>;

/** Where the curio is on the trail (0 = the tent, 1 = the flag), and which way it faces. */
export function trailSpot(progress: number): { at: number; homeward: boolean } {
  const out = BEAT_AT[3];
  if (progress < out) return { at: progress / out, homeward: false };
  return { at: Math.max(0, 1 - (progress - out) / (1 - out)), homeward: true };
}

interface Props {
  def: MonsterDef;
  curioName: string;
  missionName: string;
  lines: string[];
  shown: number;       // beats unlocked (1..4)
  seen: number;        // beats the kid had seen before opening this
  progress: number;    // 0..1
  done: boolean;
  timeLeft: string;
  onClose: () => void;
}

export default function MissionStory({ def, curioName, missionName, lines, shown, seen, progress, done, timeLeft, onClose }: Props) {
  const { at, homeward } = trailSpot(progress);
  const beats = Array.from({ length: shown }, (_, i) => i).reverse();
  return (
    <div className="rounded-xl border-2 border-[#c9a87a] bg-[#f0ddb8] p-3 space-y-3" data-testid="mission-story">
      <MissionStoryCss />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#2a1505] leading-tight truncate">{missionName}</p>
          <p className="text-xs font-semibold text-[#6b4820]">
            {done ? `${curioName} is back!` : `${curioName} · back in ${timeLeft}`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 flex-shrink-0 rounded-full bg-[#2a1505] border-2 border-[#d4a017] text-[#fde68a] text-lg font-black leading-none" data-testid="mission-story-close">×</button>
      </div>

      {/* The trail: tent, four stones, flag; the curio walks it. */}
      <div className="relative h-16 rounded-lg bg-[#e8d0a0]/70 border border-[#c9a87a] overflow-hidden" data-testid="mission-trail" data-at={at.toFixed(3)}>
        <div className="absolute left-9 right-9 top-[46px] border-t-2 border-dashed border-[#a07a48]" />
        <img src="/hideout/curio_camp.png" alt="" className="absolute left-1 bottom-1 w-9 h-auto" style={{ imageRendering: 'pixelated' }} />
        <svg className="absolute right-2 bottom-2" width="22" height="34" viewBox="0 0 22 34" aria-hidden>
          <rect x="3" y="2" width="2.5" height="32" fill="#5b3a1a" />
          <path d="M5.5 3 L20 8 L5.5 13 Z" fill="#e11d48" stroke="#7f1d1d" strokeWidth="1" />
        </svg>
        {BEAT_AT.map((b, i) => (
          <span
            key={i}
            className={`absolute top-[41px] w-3 h-3 -ml-1.5 rounded-full border-2 ${i < shown ? 'bg-[#f5c542] border-[#8b5e2a]' : 'bg-[#d6bd92] border-[#b89868]'}`}
            style={{ left: `calc(36px + (100% - 72px) * ${b / BEAT_AT[3] > 1 ? 1 : b / BEAT_AT[3]})` }}
            data-testid={`mission-stone-${i}`}
            data-lit={i < shown ? '1' : '0'}
          />
        ))}
        <div className="absolute bottom-[14px] -ml-5 w-10 h-10" style={{ left: `calc(36px + (100% - 72px) * ${at})` }}>
          <div className={done ? 'ms-wave w-full h-full' : 'ms-hop w-full h-full'}>
            <div className="w-full h-full" style={{ transform: homeward ? 'scaleX(-1)' : undefined }}>
              <MonsterImage monster={def} className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* The story so far, newest first. */}
      <ol className="space-y-1.5">
        {beats.map(i => {
          const fresh = i >= seen;
          return (
            <li
              key={i}
              className={`relative rounded-lg bg-[#fffdf7] border border-[#c9a87a] px-2.5 py-1.5 ${fresh ? 'ms-pop' : ''}`}
              style={fresh ? { animationDelay: `${(shown - 1 - i) * 0.12}s` } : undefined}
              data-testid={`mission-beat-${i}`}
              data-fresh={fresh ? '1' : '0'}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b5e2a]">{BEAT_TITLES[i]}</p>
              <p className="text-[13px] font-semibold leading-snug text-[#2a1505]">{lines[i]}</p>
              {fresh && (
                <svg className="ms-spark absolute -top-1.5 -right-1.5" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z" fill="#f5c542" stroke="#8b5e2a" strokeWidth=".8" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
      {!done && shown < 4 && (
        <p className="text-[11px] text-center font-semibold text-[#6b4820]">More of the story soon. Check back!</p>
      )}
    </div>
  );
}
