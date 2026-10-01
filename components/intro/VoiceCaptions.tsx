'use client';
// components/intro/VoiceCaptions.tsx
// One dialogue box at a time, in step with the voice acting: each line's box
// replaces the previous one when its clip starts, with the speaker's portrait
// and name plate. The next line comes when the clip ends — or, when there's no
// clip to play (sound off, not recorded yet, autoplay blocked), after a reading
// time based on the line's length. Tapping the box moves on immediately.
//
// The last line stays up after the run finishes, so a question ("How many
// steps is that?") is still on screen while the kid answers it.
import { useEffect, useRef, useState } from 'react';
import { SPEAKERS, VoiceLine, voiceSrc } from '@/lib/intro/originStory';
import { duckMainTheme, isSfxEnabled } from '@/lib/sounds';

const GAP_MS = 350;

// Grade 2 readers are slow: roughly 60ms a character, never under 2.5s.
const readingMs = (text: string) => Math.max(2500, 900 + text.length * 60);

interface VoiceCaptionsProps {
  lines: VoiceLine[];
  onDone: () => void;
  // Caption-only text tweaks (e.g. the player's name) — the clip stays as recorded.
  personalize?: (line: VoiceLine) => string;
  // Hold the first clip this long (the beat just opened with a big sound).
  startDelayMs?: number;
}

export default function VoiceCaptions({ lines, onDone, personalize, startDelayMs = 0 }: VoiceCaptionsProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    duckMainTheme(false);
    setDone(true);
    onDoneRef.current();
  };

  const next = () => {
    if (doneRef.current) return;
    if (index + 1 >= lines.length) finish();
    else setIndex(index + 1);
  };
  // The playback effect's timers call the latest `next` through this ref.
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; });

  useEffect(() => {
    if (lines.length === 0) {
      const t = setTimeout(() => nextRef.current(), 0);
      return () => clearTimeout(t);
    }
    if (done) return;
    const line = lines[index];
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let audio: HTMLAudioElement | null = null;
    let fellBack = false;

    const advance = () => { if (!cancelled) nextRef.current(); };
    const fallBackToReading = () => {
      if (fellBack || cancelled) return;
      fellBack = true;
      timer = setTimeout(advance, readingMs(line.text));
    };

    const start = () => {
      if (cancelled) return;
      if (isSfxEnabled()) {
        duckMainTheme(true);
        audio = new Audio(voiceSrc(line.id));
        audio.volume = 0.95;
        audio.onended = () => { timer = setTimeout(advance, GAP_MS); };
        audio.onerror = fallBackToReading;
        audio.play().catch(fallBackToReading);
      } else {
        fallBackToReading();
      }
    };
    if (index === 0 && startDelayMs > 0) timer = setTimeout(start, startDelayMs);
    else start();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      audio?.pause();
    };
  }, [index, done, lines, startDelayMs]);

  // Restore the music if the beat unmounts mid-line (e.g. "Skip story").
  useEffect(() => () => duckMainTheme(false), []);

  if (lines.length === 0) return null;
  const line = lines[Math.min(index, lines.length - 1)];
  const speaker = SPEAKERS[line.speaker];

  return (
    <div onClick={next} className={done ? '' : 'cursor-pointer'}>
      <div
        key={line.id}
        className="intro-rise relative flex items-end gap-3 rounded-2xl border-2 px-3 sm:px-4 pt-2 pb-3 min-h-[96px]"
        style={{ background: 'rgba(18,12,5,0.86)', borderColor: `${speaker.color}80`, boxShadow: '0 10px 28px rgba(0,0,0,0.55)' }}
      >
        <img
          src={speaker.portrait}
          alt=""
          className="w-16 h-[84px] sm:w-20 sm:h-[104px] -mt-10 object-contain object-bottom flex-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.85)]"
          onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
        />
        <div className="min-w-0 flex-1 self-center">
          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-1" style={{ color: speaker.color }}>
            {speaker.name}
          </p>
          <p className="text-[15px] sm:text-lg leading-snug text-[#f5f0e8]">
            {personalize ? personalize(line) : line.text}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between min-h-[14px]">
        <span className="flex gap-1" aria-hidden>
          {lines.length > 1 && lines.map((l, i) => (
            <span
              key={l.id}
              className="h-1 rounded-full transition-all"
              style={{ width: i === index ? 14 : 6, background: i <= index ? '#e8d0a0' : 'rgba(255,255,255,0.25)' }}
            />
          ))}
        </span>
        {!done && <span className="text-[10px] uppercase tracking-wider text-[#e8d0a0]/70">Tap to continue</span>}
      </div>
    </div>
  );
}
