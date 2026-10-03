'use client';
// components/intro/KeeperEggSequence.tsx
// The Keeper's Egg: the "come back tomorrow" sequence. After a player's first
// win, at the next calm moment on the Board (Dashboard decides when), the
// Lorekeeper gives them an egg that hatches a random starter on their third
// check-in day (grant_keeper_egg / sync_egg_progress). The kid warms the egg,
// sees the 3-day meter, is offered reminders, taps through how their own
// Curio can level up, graduate and lay an egg, and lands on today's checklist.
// Script: lib/intro/keeperEgg.ts. KeeperEggReturn is the short day-two scene.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { StoryPlayer } from '@/components/intro/OriginStory';
import VoiceCaptions from '@/components/intro/VoiceCaptions';
import GlowCta, { GLOW_CSS } from '@/components/intro/GlowCta';
import GameButton from '@/components/GameButton';
import { MonsterImage } from '@/components/battle/shared';
import { usePushAsk } from '@/components/PushOptInCard';
import { keeperEggBeats, RETURN_LINE, WARM_TAPS } from '@/lib/intro/keeperEgg';
import type { Beat } from '@/lib/intro/originStory';
import { grantKeeperEgg } from '@/lib/curioEggs';
import { claimPushGoldBonusChild } from '@/lib/pushBonus';
import { ALL_MONSTERS, EGG_SPRITE_SRC, GRADUATION_LEVEL_REQUIREMENT, getOwnedMonsterDisplay, type Element, type MonsterDef } from '@/lib/monsterConfig';
import { supabase } from '@/lib/supabase';
import { eggReadyLevel } from '@/lib/curioEggs';
import { playCue, startIntroMusic, stopIntroMusic } from '@/lib/intro/introCues';
import { playChime, playPageFlip } from '@/lib/sounds';
import { trackEvent } from '@/lib/analytics';

const STORY_EVENTS = { beat: 'keeper_egg_beat_viewed', skip: 'keeper_egg_skipped' };
const STORY_MUSIC = { start: startIntroMusic, stop: stopIntroMusic };

const EGG_CSS = `
@keyframes ke-wobble { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-9deg); } 75% { transform: rotate(9deg); } }
.ke-wobble { animation: ke-wobble .45s ease-in-out; transform-origin: 50% 90%; }
@keyframes ke-idle { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
.ke-idle { animation: ke-idle 2.4s ease-in-out infinite; transform-origin: 50% 90%; }
@media (prefers-reduced-motion: reduce) { .ke-wobble, .ke-idle { animation: none; } }
`;

interface KeeperEggSequenceProps {
  userId: string;
  // Reminders turned on; gold is the bonus granted (null if none).
  onRemindersOn?: (gold: number | null) => void;
  // openChecklist: the kid finished (not skipped), so take them to the To-Do tab.
  onDone: (openChecklist: boolean) => void;
  // Dev previews only (/dev/ui-gallery): skip the real grant and use this egg.
  previewElement?: Element;
}

export default function KeeperEggSequence({ userId, onRemindersOn, onDone, previewElement }: KeeperEggSequenceProps) {
  const push = usePushAsk({ kind: 'app_user', id: userId });
  // The player's lead curio, shown at the start of the level-up path.
  const [leadCurio, setLeadCurio] = useState<MonsterDef | null>(null);
  useEffect(() => {
    supabase.from('user_monsters')
      .select('monster_id, graduation_tier, quality')
      .eq('user_id', userId).not('slot', 'is', null).order('slot').limit(1)
      .then(({ data }) => {
        const row = data?.[0];
        if (row && ALL_MONSTERS[row.monster_id]) setLeadCurio(getOwnedMonsterDisplay(ALL_MONSTERS[row.monster_id], row.graduation_tier) as MonsterDef);
      });
  }, [userId]);
  const [egg, setEgg] = useState<{ element: Element } | null>(previewElement ? { element: previewElement } : null);
  const [beats, setBeats] = useState<Beat[] | null>(null);
  const [warmth, setWarmth] = useState(0);
  const [warmActive, setWarmActive] = useState(false);
  const [wobbleKey, setWobbleKey] = useState(0);

  // Grant first (the egg's element picks its sprite), then freeze the beats:
  // the reminder beat is only included if this device can actually ask.
  useEffect(() => {
    if (previewElement) return; // preview starts with its egg already set
    let cancelled = false;
    grantKeeperEgg().then(result => {
      if (cancelled) return;
      if (!result) { onDone(false); return; }
      trackEvent('keeper_egg_granted', { new_grant: result.granted, element: result.element });
      setEgg({ element: result.element });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!egg || beats) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time freeze once the grant lands
    setBeats(keeperEggBeats({ askReminders: push.state === 'ask' }));
  }, [egg, beats, push.state]);

  if (!egg || !beats) return null;

  const warm = () => {
    if (!warmActive || warmth >= WARM_TAPS) return;
    const next = warmth + 1;
    setWarmth(next);
    setWobbleKey(k => k + 1);
    if (next >= WARM_TAPS) playCue('crack'); else playChime();
  };

  return (
    <StoryPlayer
      beats={beats}
      events={STORY_EVENTS}
      music={STORY_MUSIC}
      skipLabel="Skip"
      renderOverlay={beat => beat.id === 'ke_grow' ? null : (
        <EggOverlay
          element={egg.element}
          warmth={beat.id === 'ke_gift' ? warmth : WARM_TAPS}
          tappable={beat.id === 'ke_gift' && warmActive && warmth < WARM_TAPS}
          wobbleKey={wobbleKey}
          onTap={warm}
        />
      )}
      renderInteraction={(beat, onComplete) => {
        switch (beat.interaction.kind) {
          case 'warm':
            return <WarmHint warmth={warmth} onActive={() => setWarmActive(true)} onComplete={onComplete} />;
          case 'days':
            return <DaysMeter element={egg.element} onComplete={onComplete} />;
          case 'remind':
            return (
              <RemindChoice
                busy={push.busy}
                onYes={async () => {
                  const ok = await push.enable();
                  trackEvent('keeper_egg_reminders', { enabled: ok });
                  if (ok) {
                    const reward = await claimPushGoldBonusChild(userId);
                    onRemindersOn?.(reward?.gold ?? null);
                  }
                  onComplete();
                }}
                onNo={() => { push.snooze(); trackEvent('keeper_egg_reminders', { enabled: false }); onComplete(); }}
              />
            );
          case 'grow':
            return <GrowPath leadCurio={leadCurio} element={egg.element} onComplete={onComplete} />;
          default:
            return null;
        }
      }}
      onFinish={() => { trackEvent('keeper_egg_completed'); onDone(true); }}
      onSkip={() => onDone(false)}
    />
  );
}

// The egg over the story art, where Solarch stands in the intro. Glows
// brighter as it's warmed; tappable only while the warm step is waiting.
function EggOverlay({ element, warmth, tappable, wobbleKey, onTap }: {
  element: Element; warmth: number; tappable: boolean; wobbleKey: number; onTap: () => void;
}) {
  const glow = warmth / WARM_TAPS;
  return (
    <div className="absolute inset-x-0 top-12 bottom-[48%] flex items-center justify-center pointer-events-none">
      <style>{EGG_CSS}</style>
      <button
        type="button"
        onClick={onTap}
        disabled={!tappable}
        aria-label="Warm the egg"
        className={`relative h-full max-h-56 aspect-square ${tappable ? 'pointer-events-auto cursor-pointer' : ''}`}
      >
        <span
          aria-hidden
          className="absolute inset-[12%] rounded-full transition-all duration-500"
          style={{ background: `radial-gradient(circle, rgba(245,197,66,${0.15 + glow * 0.55}), transparent 70%)`, transform: `scale(${1 + glow * 0.35})` }}
        />
        {tappable && <span aria-hidden className="absolute inset-[18%] rounded-full border-2 border-[#f5c542]/70 animate-ping" />}
        <img
          key={wobbleKey}
          src={EGG_SPRITE_SRC[element]}
          alt=""
          className={`relative w-full h-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)] ${wobbleKey > 0 ? 'ke-wobble' : 'ke-idle'}`}
        />
      </button>
    </div>
  );
}

function WarmHint({ warmth, onActive, onComplete }: { warmth: number; onActive: () => void; onComplete: () => void }) {
  useEffect(() => { onActive(); }, [onActive]);
  useEffect(() => {
    if (warmth < WARM_TAPS) return;
    const t = setTimeout(onComplete, 900);
    return () => clearTimeout(t);
  }, [warmth, onComplete]);
  return (
    <p className="text-center text-sm font-bold text-[#e8d0a0]">
      Tap the egg to warm it ({Math.min(warmth, WARM_TAPS)}/{WARM_TAPS})
    </p>
  );
}

// Day one is already lit: it counts on the day the egg is given.
function DaysMeter({ element, onComplete }: { element: Element; onComplete: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2 sm:gap-3">
        {[1, 2, 3].map(day => {
          const lit = day === 1;
          return (
            <div
              key={day}
              className="flex flex-col items-center gap-1 rounded-xl px-3 sm:px-5 py-2 border-2"
              style={{ background: lit ? 'rgba(245,197,66,0.2)' : 'rgba(0,0,0,0.35)', borderColor: lit ? '#f5c542' : 'rgba(255,255,255,0.18)' }}
            >
              {day === 3
                ? <img src={EGG_SPRITE_SRC[element]} alt="" className="w-8 h-8 object-contain" />
                : <span className="w-8 h-8 flex items-center justify-center text-lg font-black" style={{ color: lit ? '#f5c542' : 'rgba(255,255,255,0.5)' }}>{lit ? '✓' : day}</span>}
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#e8d0a0]">
                {day === 1 ? 'Today' : day === 2 ? 'Tomorrow' : 'Hatch day'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <GlowCta>
          <GameButton variant="quest" onClick={() => { playCue('pledge'); onComplete(); }} style={{ fontSize: 17 }}>
            I&apos;ll be back tomorrow!
          </GameButton>
        </GlowCta>
      </div>
    </div>
  );
}

function RemindChoice({ busy, onYes, onNo }: { busy: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div className="flex justify-center gap-3">
      <GameButton variant="quest" color="#57534e" onClick={() => { playPageFlip(); onNo(); }} disabled={busy} style={{ fontSize: 15 }}>
        Not now
      </GameButton>
      <GlowCta>
        <GameButton variant="quest" onClick={() => { playPageFlip(); onYes(); }} disabled={busy} style={{ fontSize: 17 }}>
          Remind me
        </GameButton>
      </GlowCta>
    </div>
  );
}

// Level up -> graduate -> lay an egg, tapped in order, starting from the
// kid's own lead curio. Levels come from the real rules (monsterConfig /
// curioEggs), so the numbers stay true if those change.
function GrowPath({ leadCurio, element, onComplete }: { leadCurio: MonsterDef | null; element: Element; onComplete: () => void }) {
  const [lit, setLit] = useState(0);
  const steps = [
    { title: 'Level up', sub: `Lv. 1 to ${GRADUATION_LEVEL_REQUIREMENT[1]}`, icon: leadCurio ? null : '/icons/myteamicon.png' },
    { title: 'Graduate', sub: `Lv. ${GRADUATION_LEVEL_REQUIREMENT[1]} + Scroll`, icon: '/items/graduation_scroll.svg' },
    { title: 'Lay an egg', sub: `Lv. ${eggReadyLevel(1)}`, icon: EGG_SPRITE_SRC[element] },
  ];

  const tap = (i: number) => {
    if (i !== lit) return;
    const next = lit + 1;
    setLit(next);
    if (next === steps.length) { playCue('oathDone'); setTimeout(onComplete, 900); } else playCue('pledge');
  };

  return (
    <div className="flex items-stretch justify-center gap-1.5 sm:gap-3">
      {steps.map((step, i) => {
        const done = i < lit;
        const next = i === lit;
        const style: CSSProperties = {
          background: done ? 'rgba(245,197,66,0.22)' : 'rgba(0,0,0,0.4)',
          borderColor: done ? '#f5c542' : next ? 'rgba(245,197,66,0.6)' : 'rgba(255,255,255,0.15)',
        };
        return (
          <div key={step.title} className="flex items-center gap-1.5 sm:gap-3">
            {i > 0 && <span className="text-[#f5c542] text-lg" aria-hidden>&rarr;</span>}
            <button
              type="button"
              onClick={() => tap(i)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 sm:px-4 py-2 w-24 sm:w-32 ${next ? 'intro-choice-glow' : ''}`}
              style={style}
            >
              <span className="w-10 h-10 flex items-center justify-center">
                {i === 0 && leadCurio
                  ? <MonsterImage monster={leadCurio} className="w-full h-full" emojiClassName="text-2xl" />
                  : <img src={step.icon ?? ''} alt="" className="w-full h-full object-contain" />}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#f5f0e8]">{step.title}</span>
              <span className="text-[10px] sm:text-[11px] text-[#e8d0a0]">{step.sub}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Day two of three: the egg has grown but not hatched. Short, once a day.
export function KeeperEggReturn({ element, progress, hatchDays, onClose }: {
  element: Element;
  progress: number;
  hatchDays: number;
  onClose: (openChecklist: boolean) => void;
}) {
  const [linesDone, setLinesDone] = useState(false);
  useEffect(() => { trackEvent('keeper_egg_return_viewed', { progress }); }, [progress]);
  return (
    <div className="fixed inset-0 z-[95] bg-[#120c05]/90 flex items-center justify-center p-4 text-white select-none">
      <style>{EGG_CSS + GLOW_CSS + COACH_RISE_CSS}</style>
      <div className="w-full max-w-xl space-y-5">
        <div className="flex justify-center">
          <img src={EGG_SPRITE_SRC[element]} alt="" className="w-36 h-36 object-contain ke-idle drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="flex justify-center gap-2">
          {Array.from({ length: hatchDays }, (_, i) => (
            <span key={i} className="h-2.5 w-12 rounded-full" style={{ background: i < progress ? '#f5c542' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
        <VoiceCaptions lines={[RETURN_LINE]} startDelayMs={300} onDone={() => setLinesDone(true)} />
        {linesDone && (
          <div className="intro-rise flex justify-center gap-3">
            <GameButton variant="quest" color="#57534e" onClick={() => { playPageFlip(); onClose(false); }} style={{ fontSize: 15 }}>
              Close
            </GameButton>
            <GlowCta>
              <GameButton variant="quest" onClick={() => { playPageFlip(); onClose(true); }} style={{ fontSize: 16 }}>
                Today&apos;s checklist
              </GameButton>
            </GlowCta>
          </div>
        )}
      </div>
    </div>
  );
}

const COACH_RISE_CSS = `
@keyframes ke-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.intro-rise { animation: ke-rise .45s ease-out both; }
`;
