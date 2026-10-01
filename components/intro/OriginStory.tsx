'use client';
// components/intro/OriginStory.tsx
// "The Legend of the Ledger" — the voiced, tap-through origin story every
// curio-less account sees before choosing its first curio (see
// components/intro/FirstCurioIntro.tsx). Script and beat data live in
// lib/intro/originStory.ts.
//
// Deliberately dark and cinematic, like LoadingScreen rather
// than the parchment content panels (docs/STYLE_GUIDE.md): it's full-bleed
// painted art with captions over it, not a panel on the shell. Every beat
// asks the kid to DO something (open the book, light the Guilds, spell the
// name, count the stairs, take the oath) so the lore is acted out, not just
// read — and the action only appears once the beat's lines have played.
//
// The player itself (StoryPlayer) is shared with the Term Boss intro
// (components/intro/TermBossIntro.tsx), which brings its own beats and its
// own interactions through renderInteraction / renderOverlay.
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Beat, BeatArt, GUILDS, ORIGIN_BEATS, VoiceLine, voiceSrc } from '@/lib/intro/originStory';
import VoiceCaptions from '@/components/intro/VoiceCaptions';
import GameButton from '@/components/GameButton';
import GlowCta, { GLOW_CSS } from '@/components/intro/GlowCta';
import { MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { isSfxEnabled, playPageFlip } from '@/lib/sounds';
import IntroFx from '@/components/intro/IntroFx';
import { playCue, playGuildCue, startIntroMusic, stopIntroMusic, ScreenPoint } from '@/lib/intro/introCues';
import { trackEvent } from '@/lib/analytics';

const INTRO_CSS = `
@keyframes intro-kenburns { from { transform: scale(1.02); } to { transform: scale(1.12); } }
.intro-kenburns { animation: intro-kenburns 26s ease-out forwards; }
@keyframes intro-flash { 0% { opacity: 0; } 25% { opacity: .85; } 100% { opacity: 0; } }
.intro-flash { animation: intro-flash .75s ease-out forwards; }
@keyframes intro-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.intro-shake { animation: intro-shake .3s ease-in-out; }
@keyframes intro-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.intro-rise { animation: intro-rise .5s ease-out both; }
@media (prefers-reduced-motion: reduce) { .intro-kenburns, .intro-rise, .intro-shake { animation: none; } }
`;

interface OriginStoryProps {
  playerName: string;
  onFinish: () => void;
  onSkip: () => void;
}

// Module-level so StoryPlayer's mount effect sees stable objects.
const ORIGIN_EVENTS = { beat: 'intro_beat_viewed', skip: 'intro_skipped' };
const ORIGIN_MUSIC = { start: startIntroMusic, stop: stopIntroMusic };

export default function OriginStory({ playerName, onFinish, onSkip }: OriginStoryProps) {
  // The one caption that uses the kid's name; the recorded clip just says "Keeper".
  const personalize = (line: VoiceLine) =>
    line.id === 'oath_4' && playerName ? line.text.replace('welcome, Keeper.', `welcome, Keeper ${playerName}.`) : line.text;

  return (
    <StoryPlayer
      beats={ORIGIN_BEATS}
      events={ORIGIN_EVENTS}
      music={ORIGIN_MUSIC}
      skipLabel="Skip story"
      personalize={personalize}
      onFinish={onFinish}
      onSkip={onSkip}
    />
  );
}

export interface StoryPlayerProps {
  beats: Beat[];
  // Analytics event names (beat viewed, skipped) and the story's music; both
  // must be stable (module-level) objects.
  events: { beat: string; skip: string };
  music: { start: () => void; stop: () => void };
  skipLabel: string;
  personalize?: (line: VoiceLine) => string;
  // Interaction kinds this story adds to the shared ones.
  renderInteraction?: (beat: Beat, onComplete: () => void) => ReactNode;
  // Drawn over the art in the top-center spot (where Solarch appears).
  renderOverlay?: (beat: Beat) => ReactNode;
  onFinish: () => void;
  onSkip: () => void;
}

export function StoryPlayer({
  beats, events, music, skipLabel, personalize = l => l.text, renderInteraction, renderOverlay, onFinish, onSkip,
}: StoryPlayerProps) {
  const [index, setIndex] = useState(0);
  const beat = beats[index];

  useEffect(() => {
    trackEvent(events.beat, { beat: beat.id, index });
  }, [events, beat.id, index]);

  useEffect(() => {
    music.start();
    return () => music.stop();
  }, [music]);

  const next = () => {
    if (index + 1 >= beats.length) onFinish();
    else setIndex(index + 1);
  };

  const skip = () => {
    trackEvent(events.skip, { at_beat: beat.id, index });
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-[95] bg-[#120c05] text-white overflow-hidden select-none">
      <style>{INTRO_CSS + GLOW_CSS}</style>
      <BeatView key={beat.id} beat={beat} onNext={next} personalize={personalize} renderInteraction={renderInteraction} renderOverlay={renderOverlay} />
      {/* Effects over the art, under the dialogue (which is z-10). */}
      <div className="absolute inset-0 z-[5] pointer-events-none"><IntroFx /></div>

      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-4 py-3 z-10">
        <div className="flex gap-1.5" aria-label={`Part ${index + 1} of ${beats.length}`}>
          {beats.map((b, i) => (
            <span
              key={b.id}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 20 : 8, background: i <= index ? '#f5c542' : 'rgba(255,255,255,0.3)' }}
            />
          ))}
        </div>
        <button
          onClick={skip}
          className="text-[11px] font-bold uppercase tracking-wide text-[#e8d0a0] bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 hover:bg-black/70 transition-colors"
        >
          {skipLabel}
        </button>
      </div>
    </div>
  );
}

type Stage = 'intro' | 'interact' | 'after' | 'ready';

function BeatView({ beat, onNext, personalize, renderInteraction, renderOverlay }: {
  beat: Beat;
  onNext: () => void;
  personalize: (line: VoiceLine) => string;
  renderInteraction?: StoryPlayerProps['renderInteraction'];
  renderOverlay?: StoryPlayerProps['renderOverlay'];
}) {
  const [stage, setStage] = useState<Stage>('intro');
  const [interactionDone, setInteractionDone] = useState(false);
  // How much of Solarch's color is back (spell beat raises it letter by letter).
  const [solarchColor, setSolarchColor] = useState(beat.solarch?.start ?? 1);

  const art = interactionDone && beat.artAfter ? beat.artAfter : beat.art;

  useEffect(() => {
    if (beat.enterCue) playCue(beat.enterCue);
  }, [beat.enterCue]);

  const complete = () => {
    setInteractionDone(true);
    if (beat.solarch) setSolarchColor(beat.solarch.end);
    if (beat.after?.length) setStage('after');
    else setTimeout(onNext, 700);
  };

  return (
    <>
      <ArtLayer key={art.src} art={art} />
      {renderOverlay?.(beat)}

      {beat.solarch && (
        <div className="absolute inset-x-0 top-12 bottom-[48%] flex items-center justify-center pointer-events-none">
          <div
            className="w-32 h-32 sm:w-44 sm:h-44 battle-float"
            style={{
              filter: `grayscale(${1 - solarchColor}) brightness(${0.7 + 0.3 * solarchColor}) drop-shadow(0 0 ${Math.round(28 * solarchColor)}px rgba(245,197,66,${solarchColor}))`,
              transition: 'filter 0.8s ease-out',
            }}
          >
            <MonsterImage monster={MONSTERS.solarch} className="w-full h-full" emojiClassName="text-8xl" />
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 max-h-[70%] overflow-y-auto bg-gradient-to-t from-[#120c05] via-[#120c05]/95 to-transparent pt-16">
        <div className="max-w-2xl mx-auto px-4 pb-8 sm:pb-10 space-y-4">
          {stage !== 'after' && stage !== 'ready' ? (
            <VoiceCaptions
              lines={beat.lines}
              personalize={personalize}
              startDelayMs={beat.enterCue ? 900 : 0}
              onDone={() => setStage(s => (s === 'intro' ? 'interact' : s))}
            />
          ) : (
            <VoiceCaptions
              key="after"
              lines={beat.after ?? []}
              personalize={personalize}
              startDelayMs={700}
              onDone={() => setStage('ready')}
            />
          )}

          {stage === 'interact' && !interactionDone && (
            <div className="intro-rise">
              <Interaction beat={beat} onComplete={complete} onSolarchColor={setSolarchColor} renderInteraction={renderInteraction} />
            </div>
          )}

          {stage === 'ready' && (
            <div className="intro-rise flex justify-center py-2">
              <GlowCta>
                <GameButton variant="quest" onClick={() => { playPageFlip(); onNext(); }} style={{ fontSize: 18 }}>
                  {beat.afterLabel ?? 'Continue'}
                </GameButton>
              </GlowCta>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ArtLayer({ art }: { art: BeatArt }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? art.fallback : art.src;
  const contain = failed && art.fallbackFit === 'contain';
  const filter = art.drained ? 'grayscale(0.85) brightness(0.75)' : undefined;

  return (
    <div className="absolute inset-0">
      {contain && (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 30%, rgba(245,197,66,0.35), transparent 55%)' }}
        />
      )}
      <img
        src={src}
        alt=""
        onError={() => { if (!failed) setFailed(true); }}
        className={contain
          ? 'absolute inset-x-0 top-12 bottom-[48%] mx-auto h-[40%] sm:h-[45%] w-auto object-contain battle-float'
          : 'absolute inset-0 w-full h-full object-cover intro-kenburns'}
        style={{ filter, transition: 'filter 1.2s ease-out', objectPosition: failed ? undefined : art.focus }}
      />
      {art.drained && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="boss-mist-layer boss-mist-layer--a" style={{ '--mist-density': 0.9 } as CSSProperties} />
          <div className="boss-mist-layer boss-mist-layer--b" style={{ '--mist-density': 0.9 } as CSSProperties} />
          <div className="boss-mist-layer boss-mist-layer--c" style={{ '--mist-density': 0.9 } as CSSProperties} />
        </div>
      )}
    </div>
  );
}

function Interaction({ beat, onComplete, onSolarchColor, renderInteraction }: {
  beat: Beat;
  onComplete: () => void;
  onSolarchColor: (c: number) => void;
  renderInteraction?: StoryPlayerProps['renderInteraction'];
}) {
  const it = beat.interaction;
  switch (it.kind) {
    case 'tap':
      return (
        <div className="flex justify-center py-2">
          <GlowCta>
            <GameButton
              variant="quest"
              onClick={() => {
                playCue(it.cue);
                onComplete();
              }}
              style={{ fontSize: 18 }}
            >
              {it.label}
            </GameButton>
          </GlowCta>
        </div>
      );
    case 'guilds':
      return <GuildLighting onComplete={onComplete} />;
    case 'spell':
      return <SpellName word={it.word} range={beat.solarch} onProgress={onSolarchColor} onComplete={onComplete} />;
    case 'count':
      return <CountStairs choices={it.choices} answer={it.answer} retry={it.retry} onComplete={onComplete} />;
    case 'oath':
      return <KeepersOath pledges={it.pledges} onComplete={onComplete} />;
    default:
      return <>{renderInteraction?.(beat, onComplete)}</>;
  }
}

// Where an element sits on screen, as fractions (for the effects layer).
export function screenPoint(el: Element, yFrac = 0.5): ScreenPoint {
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height * yFrac) / window.innerHeight };
}

function GuildLighting({ onComplete }: { onComplete: () => void }) {
  const [lit, setLit] = useState<string[]>([]);
  const last = GUILDS.find(g => g.key === lit[lit.length - 1]);

  const light = (key: (typeof GUILDS)[number]['key'], el: Element) => {
    if (lit.includes(key)) return;
    const nextLit = [...lit, key];
    setLit(nextLit);
    playGuildCue(key, screenPoint(el, 0.15));
    if (nextLit.length === GUILDS.length) {
      setTimeout(() => playCue('guildsDone'), 450);
      setTimeout(onComplete, 1300);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {GUILDS.map(g => {
          const isLit = lit.includes(g.key);
          return (
            <button
              key={g.key}
              onClick={e => light(g.key, e.currentTarget)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 transition-colors ${isLit ? '' : 'intro-choice-glow'}`}
              style={{ background: isLit ? `${g.color}26` : 'rgba(0,0,0,0.35)', border: `1px solid ${isLit ? g.color : 'rgba(255,255,255,0.15)'}` }}
            >
              <img
                src={g.npc}
                alt=""
                className="h-14 sm:h-20 w-auto object-contain transition-all duration-500"
                style={{ filter: isLit ? `drop-shadow(0 0 10px ${g.color})` : 'grayscale(1) brightness(0.55)' }}
              />
              <span className="text-[9px] sm:text-[11px] font-extrabold leading-tight text-center" style={{ color: isLit ? g.color : '#a8a29e' }}>
                {g.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 min-h-[2.5rem] text-center text-sm text-[#f5f0e8]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}>
        {last ? (
          <span key={last.key} className="intro-rise inline-block">
            <span className="font-extrabold" style={{ color: last.color }}>{last.name}: {last.subject}.</span> {last.line}
          </span>
        ) : (
          <span className="text-[#e8d0a0]">Tap a Guild. {GUILDS.length - lit.length} left to light.</span>
        )}
      </p>
    </div>
  );
}

function SpellName({ word, range, onProgress, onComplete }: {
  word: string;
  range?: { start: number; end: number };
  onProgress: (color: number) => void;
  onComplete: () => void;
}) {
  // Shuffled once per mount (lazy state init, not render-time randomness).
  const [tiles] = useState(() => shuffleTiles(word));
  const [used, setUsed] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);

  const tap = (tile: { ch: string; id: number }) => {
    if (used.includes(tile.id)) return;
    if (tile.ch !== word[used.length]) {
      playCue('letterWrong');
      setWrong(tile.id);
      setTimeout(() => setWrong(w => (w === tile.id ? null : w)), 320);
      return;
    }
    const nextUsed = [...used, tile.id];
    setUsed(nextUsed);
    if (range) onProgress(range.start + (range.end - range.start) * (nextUsed.length / word.length));
    playCue('letter');
    if (nextUsed.length === word.length) {
      setTimeout(() => playCue('nameSpelled'), 250);
      setTimeout(onComplete, 900);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-1.5">
        {word.split('').map((ch, i) => (
          <span
            key={i}
            className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center rounded-lg text-xl font-extrabold border-2"
            style={{
              borderColor: i < used.length ? '#f5c542' : 'rgba(255,255,255,0.25)',
              background: i < used.length ? 'rgba(245,197,66,0.2)' : 'rgba(0,0,0,0.4)',
              color: '#fff3c4',
            }}
          >
            {i < used.length ? ch : ''}
          </span>
        ))}
      </div>
      <div className="flex justify-center flex-wrap gap-2">
        {tiles.map(tile => (
          <button
            key={tile.id}
            onClick={() => tap(tile)}
            disabled={used.includes(tile.id)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-xl font-extrabold bg-[#f0ddb8] text-[#2a1505] border-2 border-[#8b5e2a] shadow-[0_3px_0_#8b5e2a] transition-opacity ${used.includes(tile.id) ? 'opacity-0' : 'intro-choice-glow'} ${wrong === tile.id ? 'intro-shake' : ''}`}
          >
            {tile.ch}
          </button>
        ))}
      </div>
    </div>
  );
}

function shuffleTiles(word: string) {
  const letters = word.split('').map((ch, i) => ({ ch, id: i }));
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Never start already spelled.
  return letters.every((l, i) => l.id === i) ? [...letters].reverse() : letters;
}

function CountStairs({ choices, answer, retry, onComplete }: { choices: number[]; answer: number; retry: VoiceLine; onComplete: () => void }) {
  const [missed, setMissed] = useState<number | null>(null);

  const pick = (n: number) => {
    if (n === answer) {
      playCue('reink');
      onComplete();
      return;
    }
    playCue('stairsWrong');
    setMissed(n);
    if (isSfxEnabled()) {
      const a = new Audio(voiceSrc(retry.id));
      a.volume = 0.95;
      a.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-3">
        {choices.map(n => (
          <button
            key={n}
            onClick={() => pick(n)}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-3xl font-extrabold bg-[#f0ddb8] text-[#2a1505] border-2 border-[#8b5e2a] shadow-[0_4px_0_#8b5e2a] ${missed === n ? 'intro-shake opacity-50' : 'intro-choice-glow'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {missed !== null && (
        <p className="intro-rise text-center text-sm text-[#7dd3fc]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}>
          <span className="font-extrabold">Damien:</span> {retry.text}
        </p>
      )}
    </div>
  );
}

function KeepersOath({ pledges, onComplete }: { pledges: string[]; onComplete: () => void }) {
  const [sealed, setSealed] = useState(0);

  const seal = (i: number, el: Element) => {
    if (i !== sealed) return;
    const next = sealed + 1;
    setSealed(next);
    playCue('pledge', screenPoint(el));
    if (next === pledges.length) {
      setTimeout(() => playCue('oathDone'), 450);
      setTimeout(onComplete, 900);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#e8d0a0]">Tap each line to take the oath</p>
      {pledges.map((p, i) => {
        const isSealed = i < sealed;
        const isNext = i === sealed;
        return (
          <button
            key={p}
            onClick={e => seal(i, e.currentTarget)}
            disabled={!isNext}
            className={`w-full max-w-xs rounded-xl px-4 py-3 text-lg font-extrabold border-2 transition-all ${isNext ? 'intro-choice-glow' : ''}`}
            style={{
              background: isSealed ? 'rgba(245,197,66,0.25)' : isNext ? 'rgba(240,221,184,0.95)' : 'rgba(0,0,0,0.35)',
              borderColor: isSealed ? '#f5c542' : isNext ? '#8b5e2a' : 'rgba(255,255,255,0.15)',
              color: isSealed ? '#fff3c4' : isNext ? '#2a1505' : '#a8a29e',
              boxShadow: isNext ? '0 4px 0 #8b5e2a' : undefined,
            }}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
