'use client';
// components/intro/TermBossIntro.tsx
// The Term Boss intro — "The Trial of the Forgetting" — a voiced, interactive
// story played once per player, grade and term when the Term Boss event goes
// live (gated in components/Dashboard.tsx). Built on the first intro's
// StoryPlayer (components/intro/OriginStory.tsx); beats and script live in
// lib/intro/termBossStory.ts.
//
// Its own interactions act out the fight's rules before the kid ever sees the
// arena: refuse the Forgetting, uncover this grade's real bosses, a practice
// strike with hearts, and a moment with the kid's own Curio.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { StoryPlayer, screenPoint } from '@/components/intro/OriginStory';
import GameButton from '@/components/GameButton';
import GlowCta from '@/components/intro/GlowCta';
import { MonsterImage } from '@/components/battle/shared';
import { TERM_BOSS_BEATS } from '@/lib/intro/termBossStory';
import { voiceSrc, type Beat, type VoiceLine } from '@/lib/intro/originStory';
import { playCue, startTermBossIntroMusic, stopIntroMusic } from '@/lib/intro/introCues';
import { isSfxEnabled, playPageFlip } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';
import { ALL_MONSTERS, getOwnedMonsterDisplay, type MonsterDef } from '@/lib/monsterConfig';
import type { BossPersona } from '@/lib/bossPersonas';

export interface IntroCurio {
  def: MonsterDef;
  name: string;
}

interface TermBossIntroProps {
  // This grade's personas, for the card reveal.
  personas: BossPersona[];
  // The kid's active Curio, for the partner beat (null: not loaded / none).
  curio: IntroCurio | null;
  onFinish: () => void;
  onSkip: () => void;
}

const TB_EVENTS = { beat: 'term_boss_intro_beat_viewed', skip: 'term_boss_intro_skipped' };
const TB_MUSIC = { start: startTermBossIntroMusic, stop: stopIntroMusic };

const TB_CSS = `
@keyframes tb-crumble { 0% { opacity: 1; transform: none; filter: none; } 100% { opacity: 0; transform: translateY(14px) scale(.85); filter: blur(6px) grayscale(1); } }
.tb-crumble { animation: tb-crumble .7s ease-in forwards; pointer-events: none; }
.tb-card { perspective: 700px; }
.tb-card-inner { position: relative; width: 100%; height: 100%; transition: transform .55s cubic-bezier(.3,.7,.3,1); transform-style: preserve-3d; }
.tb-card-flipped .tb-card-inner { transform: rotateY(180deg); }
.tb-card-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 12px; overflow: hidden; }
.tb-card-back { transform: rotateY(180deg); }
@keyframes tb-heart-break { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(1.5) rotate(-12deg); } 100% { transform: scale(.7) rotate(18deg); opacity: .3; } }
.tb-heart-break { animation: tb-heart-break .6s ease-out forwards; }
@keyframes tb-spot-in { from { opacity: 0; transform: scale(.9) translateY(12px); } to { opacity: 1; transform: none; } }
.tb-spot-in { animation: tb-spot-in .35s cubic-bezier(.2,.8,.3,1.2) both; }
.tb-target-gone { opacity: 0; transform: scale(.6); filter: brightness(3); transition: opacity .7s ease-out .25s, transform .7s ease-out .25s, filter .3s; }
@media (prefers-reduced-motion: reduce) { .tb-crumble, .tb-heart-break, .tb-spot-in { animation: none; } .tb-card-inner { transition: none; } }
`;

export default function TermBossIntro({ personas, curio, onFinish, onSkip }: TermBossIntroProps) {
  const renderInteraction = (beat: Beat, onComplete: () => void) => {
    const it = beat.interaction;
    switch (it.kind) {
      case 'refuse':
        return <RefuseForgetting give={it.give} refuse={it.refuse} scold={it.scold} onComplete={onComplete} />;
      case 'shadows':
        return <ShadowCards personas={personas} onComplete={onComplete} />;
      case 'strike':
        return <PracticeStrike choices={it.choices} answer={it.answer} hearts={it.hearts} retry={it.retry} onComplete={onComplete} />;
      case 'partner':
        return <PartnerReady label={it.label} curioName={curio?.name ?? 'Your Curio'} onComplete={onComplete} />;
      default:
        return null;
    }
  };

  // The kid's Curio stands where the first intro shows Solarch.
  const renderOverlay = (beat: Beat) =>
    beat.interaction.kind === 'partner' && curio ? (
      <div className="absolute inset-x-0 top-12 bottom-[48%] flex items-center justify-center pointer-events-none">
        <div className="w-32 h-32 sm:w-44 sm:h-44 battle-float" style={{ filter: 'drop-shadow(0 0 18px rgba(245,197,66,0.55))' }}>
          <MonsterImage monster={curio.def} className="w-full h-full" emojiClassName="text-8xl" />
        </div>
      </div>
    ) : null;

  return (
    <>
      <style>{TB_CSS}</style>
      <StoryPlayer
        beats={TERM_BOSS_BEATS}
        events={TB_EVENTS}
        music={TB_MUSIC}
        skipLabel="Skip"
        renderInteraction={renderInteraction}
        renderOverlay={renderOverlay}
        onFinish={onFinish}
        onSkip={onSkip}
      />
    </>
  );
}

// Loads the kid's active Curio (the one in their active battle slot) for the
// partner beat, then plays the intro. The partner beat is sixth, so the fetch
// is long done by the time it's needed.
export function TermBossIntroForUser({ userId, ...rest }: Omit<TermBossIntroProps, 'curio'> & { userId: string }) {
  const [curio, setCurio] = useState<IntroCurio | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('user_monsters').select('monster_id, nickname, slot, graduation_tier').eq('user_id', userId),
      supabase.from('user_battle_state').select('active_monster_slot').eq('user_id', userId).maybeSingle(),
    ]).then(([mons, state]) => {
      if (cancelled || !mons.data?.length) return;
      const slot = state.data?.active_monster_slot ?? 1;
      const row = mons.data.find(m => m.slot === slot) ?? mons.data.find(m => m.slot != null) ?? mons.data[0];
      const def = getOwnedMonsterDisplay(ALL_MONSTERS[row.monster_id], row.graduation_tier);
      if (def) setCurio({ def, name: row.nickname || def.name });
    });
    return () => { cancelled = true; };
  }, [userId]);
  return <TermBossIntro {...rest} curio={curio} />;
}

function playLine(line: VoiceLine) {
  if (!isSfxEnabled()) return;
  const a = new Audio(voiceSrc(line.id));
  a.volume = 0.95;
  a.play().catch(() => {});
}

function SpokenAside({ line, color }: { line: VoiceLine; color: string }) {
  return (
    <p className="intro-rise text-center text-sm" style={{ color, textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}>
      <span className="font-extrabold">{line.speaker === 'narrator' ? 'The Lorekeeper' : line.speaker === 'damien' ? 'Damien' : 'Tala'}:</span> {line.text}
    </p>
  );
}

// "Let it go" crumbles to dust and the Lorekeeper scolds; only "Never!" moves on.
function RefuseForgetting({ give, refuse, scold, onComplete }: { give: string; refuse: string; scold: VoiceLine; onComplete: () => void }) {
  const [crumbled, setCrumbled] = useState(false);
  const [gone, setGone] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-center items-center gap-4 min-h-[64px]">
        {!gone && (
          <button
            onClick={e => {
              if (crumbled) return;
              playCue('letGo', screenPoint(e.currentTarget));
              setCrumbled(true);
              playLine(scold);
            }}
            onAnimationEnd={() => setGone(true)}
            className={`rounded-xl px-5 py-2.5 text-base font-extrabold border-2 ${crumbled ? 'tb-crumble' : ''}`}
            style={{ background: 'rgba(216,200,255,0.18)', borderColor: 'rgba(216,200,255,0.45)', color: '#e9dcff' }}
          >
            {give}
          </button>
        )}
        <GlowCta>
          <GameButton
            variant="quest"
            onClick={e => { playCue('never', screenPoint(e.currentTarget)); onComplete(); }}
            style={{ fontSize: 20 }}
          >
            {refuse}
          </GameButton>
        </GlowCta>
      </div>
      {crumbled && <SpokenAside line={scold} color="#f5c542" />}
    </div>
  );
}

// The grade's bosses, face down in the mist: tap a card to flip it, and the
// shadow steps forward in a big spotlight (its art, what it attacks, what
// fighting it reviews) until the kid moves on. The beat ends after the last
// spotlight closes.
function ShadowCards({ personas, onComplete }: { personas: BossPersona[]; onComplete: () => void }) {
  const [revealed, setRevealed] = useState<string[]>([]);
  const [featured, setFeatured] = useState<BossPersona | null>(null);
  const last = personas.find(p => p.subject === revealed[revealed.length - 1]);
  const allRevealed = personas.length > 0 && revealed.length === personas.length;

  useEffect(() => {
    if (personas.length > 0) return;
    const t = setTimeout(onComplete, 0);
    return () => clearTimeout(t);
  }, [personas.length, onComplete]);

  const flip = (p: BossPersona, el: Element) => {
    if (featured) return;
    if (revealed.includes(p.subject)) { setFeatured(p); return; }
    setRevealed([...revealed, p.subject]);
    playCue('flipCard', screenPoint(el));
    // Let the card finish turning over, then bring the shadow forward.
    setTimeout(() => setFeatured(p), 450);
  };

  const closeSpotlight = () => {
    setFeatured(null);
    if (allRevealed) {
      playCue('shadowsAll');
      setTimeout(onComplete, 900);
    }
  };

  return (
    <div>
      <div className={`grid gap-1.5 sm:gap-2 ${personas.length > 8 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {personas.map(p => {
          const isUp = revealed.includes(p.subject);
          return (
            <button
              key={p.subject}
              onClick={e => flip(p, e.currentTarget)}
              className={`tb-card h-24 sm:h-32 ${isUp ? 'tb-card-flipped' : 'intro-choice-glow'}`}
              aria-label={isUp ? p.name : 'Hidden shadow'}
            >
              <span className="tb-card-inner block">
                <span className="tb-card-face flex items-center justify-center border-2" style={{ background: 'linear-gradient(180deg,#2a1640,#120a1e)', borderColor: '#3b2a5c' }}>
                  <img src="/intro/portrait_forgetting.svg" alt="" className="w-10 h-10 sm:w-12 sm:h-12 opacity-80" />
                </span>
                <span
                  className="tb-card-face tb-card-back flex flex-col items-center justify-end border-2 pb-1"
                  style={{ background: `radial-gradient(circle at 50% 38%, ${p.glowColor}66, #120a1e 70%)`, borderColor: p.glowColor } as CSSProperties}
                >
                  <img src={p.artUrl} alt="" className="absolute inset-x-1 top-1 bottom-5 m-auto max-h-[calc(100%-1.75rem)] w-auto object-contain" />
                  <span className="relative text-[8px] sm:text-[10px] font-extrabold leading-tight text-center px-0.5" style={{ color: '#f3e8ff' }}>{p.name}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 min-h-[2.5rem] text-center text-sm text-[#f5f0e8]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}>
        {last ? (
          <span key={last.subject} className="intro-rise inline-block">
            <span className="font-extrabold" style={{ color: last.glowColor }}>{last.name}, shadow of {last.subject}.</span> {last.loreShort}
          </span>
        ) : (
          <span className="text-[#d8c8ff]">Tap a card. {personas.length - revealed.length} shadows hidden.</span>
        )}
      </p>
      {featured && createPortal(
        <ShadowSpotlight persona={featured} isLast={allRevealed} onClose={closeSpotlight} />,
        document.body,
      )}
    </div>
  );
}

// One shadow, up close: big art, what it attacks, and what beating it reviews.
function ShadowSpotlight({ persona: p, isLast, onClose }: { persona: BossPersona; isLast: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-[#0a0612]/85" onClick={onClose}>
      <div
        key={p.subject}
        className="tb-spot-in relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl border-2 px-5 pt-4 pb-5 text-center"
        style={{ background: 'linear-gradient(180deg,#241536 0%,#0f0918 100%)', borderColor: p.glowColor, boxShadow: `0 0 0 2px #0a0612, 0 0 48px ${p.glowColor}66` }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: p.glowColor }}>Shadow of {p.subject}</p>
        <div className="relative mx-auto my-2 h-44 sm:h-60">
          <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 55%, ${p.glowColor}77, transparent 62%)` }} />
          <img src={p.artUrl} alt={p.name} className="relative h-full w-auto mx-auto object-contain battle-float drop-shadow-[0_8px_14px_rgba(0,0,0,0.7)]" />
        </div>
        <h3 className="font-display text-2xl sm:text-3xl text-[#f3e8ff]" style={{ textShadow: `0 0 14px ${p.glowColor}` }}>{p.name}</h3>
        <p className="mt-1 text-sm italic text-[#d8c8ff] leading-snug">{p.loreShort}</p>
        <div className="mt-4 space-y-2 text-left">
          <div className="rounded-xl border border-white/15 bg-black/40 px-3 py-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#fca5a5]">It attacks</p>
            <p className="text-sm text-[#f3e8ff] leading-snug">{p.attacks}</p>
          </div>
          <div className="rounded-xl border-2 border-[#8b5e2a] bg-[#f0ddb8] px-3 py-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7a4a0f]">Beat it to review</p>
            <p className="text-sm font-bold text-[#2a1505] leading-snug">{p.reviews}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <GameButton variant="quest" onClick={() => { playPageFlip(); onClose(); }} style={{ fontSize: 17 }}>
            {isLast ? 'I know them all!' : 'Next shadow'}
          </GameButton>
        </div>
      </div>
    </div>
  );
}

function PracticeHeart({ state }: { state: 'full' | 'breaking' | 'empty' }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-7 h-7 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] ${state === 'breaking' ? 'tb-heart-break' : ''}`} aria-hidden>
      <path
        d="M12 21.2s-7.6-4.7-10-9.3C.3 8.4 2.2 4.2 6.2 3.9c2.3-.2 3.8 1.1 4.6 2.4.4.6 1 .6 1.4 0 .8-1.3 2.3-2.6 4.6-2.4 4 .3 5.9 4.5 4.2 8C19.6 16.5 12 21.2 12 21.2z"
        fill={state === 'empty' ? '#3a2f2f' : '#ef4444'} stroke="#2a0a0a" strokeWidth="1.6"
      />
    </svg>
  );
}

// One shadow, a few hearts, one question: a right answer strikes the shadow,
// a wrong one cracks a heart (practice can't be lost).
function PracticeStrike({ choices, answer, hearts, retry, onComplete }: {
  choices: string[]; answer: string; hearts: number; retry: VoiceLine; onComplete: () => void;
}) {
  const [missed, setMissed] = useState<string[]>([]);
  const [struck, setStruck] = useState(false);
  const heartsLeft = Math.max(1, hearts - missed.length);

  const pick = (choice: string) => {
    if (struck || missed.includes(choice)) return;
    if (choice === answer) {
      const target = document.getElementById('tb-practice-target');
      playCue('strikeHit', target ? screenPoint(target) : undefined);
      setStruck(true);
      setTimeout(onComplete, 1100);
      return;
    }
    playCue('strikeMiss');
    setMissed([...missed, choice]);
    playLine(retry);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-6">
        <div className="flex gap-1" aria-label={`${heartsLeft} of ${hearts} hearts`}>
          {Array.from({ length: hearts }, (_, i) => (
            <PracticeHeart key={i < heartsLeft ? i : `b${i}`} state={i < heartsLeft ? 'full' : i === heartsLeft ? 'breaking' : 'empty'} />
          ))}
        </div>
        <img
          id="tb-practice-target"
          src="/bosses/shadow-persona.webp"
          alt=""
          className={`h-20 sm:h-24 w-auto object-contain ${struck ? 'battle-hit tb-target-gone' : 'battle-float'}`}
          style={{ filter: struck ? undefined : 'brightness(0.65) drop-shadow(0 0 10px rgba(167,139,250,0.7))' }}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        {choices.map(c => (
          <button
            key={c}
            onClick={() => pick(c)}
            disabled={struck}
            className={`w-full max-w-xs rounded-xl px-4 py-2.5 text-base font-extrabold bg-[#f0ddb8] text-[#2a1505] border-2 border-[#8b5e2a] shadow-[0_4px_0_#8b5e2a] ${missed.includes(c) ? 'intro-shake opacity-50' : struck ? '' : 'intro-choice-glow'}`}
          >
            {c}
          </button>
        ))}
      </div>
      {missed.length > 0 && !struck && <SpokenAside line={retry} color="#7dd3fc" />}
    </div>
  );
}

function PartnerReady({ label, curioName, onComplete }: { label: string; curioName: string; onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2 py-2 min-h-[64px]">
      {ready ? (
        <p className="intro-rise font-display text-2xl text-[#f5c542]" style={{ textShadow: '0 0 12px rgba(245,197,66,0.6), 0 2px 3px rgba(0,0,0,0.9)' }}>
          {curioName} is ready!
        </p>
      ) : (
        <GlowCta>
          <GameButton
            variant="quest"
            onClick={() => { playCue('partnerReady'); setReady(true); setTimeout(onComplete, 1500); }}
            style={{ fontSize: 18 }}
          >
            {label}
          </GameButton>
        </GlowCta>
      )}
    </div>
  );
}
