'use client';
// components/monster/BossFightScreen.tsx
// Term Exam Boss Fight battle screen. Visually inspired by
// components/battle/BattleStage.tsx (same background art, hit-sequencing,
// answer-tile styling) but built as its own lighter shell rather than forcing
// BattleStage's MonsterDef/MonsterHpPanel machinery onto a persona that isn't
// a real Curio — reuses the genuinely shared pieces (ActionTile,
// AttackBanner, DamageNumber, runBattleBeats/BattleBeat) directly.
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { ActionTile } from '@/components/battle/BattleStage';
import { AttackBanner, DamageNumber, runBattleBeats, BattleBeat } from '@/components/battle/shared';
import { supabase } from '@/lib/supabase';
import { BOSS_PERSONAS, BossPersona } from '@/lib/bossPersonas';
import {
  BossQuestion,
  fetchBossQuestionPool,
  buildBossQuestionPool,
  gradeBossQuestion,
  useBossFightQueue,
  shuffle,
} from '@/lib/bossFightEngine';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { startBossFightTheme, stopBossFightTheme, playHitThud, playClash } from '@/lib/sounds';
import BossVictoryPopup from '@/components/monster/BossVictoryPopup';

interface BossFightScreenProps {
  userId: string;
  grade: number;
  subject: string;
  // The rest of this grade's undefeated personas — rendered blurred/darkened
  // in the fight backdrop as a reminder of what's left, without competing
  // with the active persona for attention.
  otherPersonas: BossPersona[];
  onExit: (defeated: boolean) => void;
}

// Faint, blurred, darkened lineup of the other still-undefeated personas,
// flanking the active persona rather than hiding behind the card's own
// dark backdrop panel — a background depth cue, not a second focal point.
// Alternating vertical offset + blur/scale gives a loose sense of some
// standing farther back than others, rather than a flat row.
export function BackgroundPersonas({ personas }: { personas: BossPersona[] }) {
  if (personas.length === 0) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-around px-2 pointer-events-none select-none" aria-hidden="true">
      {personas.map((p, i) => (
        <img
          key={p.subject}
          src={p.artUrl}
          alt=""
          className="w-16 h-16 object-contain"
          style={{
            opacity: 0.5,
            filter: `blur(${i % 2 === 0 ? 2 : 3.5}px) brightness(0.5)`,
            transform: `scale(${i % 2 === 0 ? 0.85 : 0.7}) translateY(${i % 2 === 0 ? '-6px' : '10px'})`,
          }}
        />
      ))}
    </div>
  );
}

function HeartsRow({ hearts, maxHearts }: { hearts: number; maxHearts: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: maxHearts }).map((_, i) => {
        const filled = i < hearts;
        const isLast = filled && hearts === 1;
        return (
          <span
            key={i}
            className={`text-xl leading-none ${filled ? '' : 'opacity-25 grayscale'} ${isLast ? 'animate-pulse' : ''}`}
          >
            {filled ? '❤️' : '🖤'}
          </span>
        );
      })}
    </div>
  );
}

function CorruptionMeter({ pct }: { pct: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-bold">
        <span>Corruption</span>
        <span>{100 - pct}%</span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
        <div
          className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-500"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

// Inner fight — keyed by the parent on each retry so a fresh pool truly
// resets all local state instead of trying to mutate the hook's queue.
function BossFightBattle({
  pool, personaName, artUrl, glowColor, otherPersonas, onWon, onLost,
}: {
  pool: BossQuestion[];
  personaName: string;
  artUrl: string;
  glowColor: string;
  otherPersonas: BossPersona[];
  onWon: (correctCount: number) => void;
  onLost: () => void;
}) {
  const { status, current, hearts, maxHearts, corruptionPct, submitAnswer, correctCount } = useBossFightQueue(pool);
  // The persona pool's `options` arrays come straight off content_questions with the correct
  // answer always first (an AI-generation authoring convention, not a display order) — rendered
  // as-is, the top-left tile was always correct. Shuffled once per question (keyed on id, not
  // recomputed every render) so the correct tile lands in a random position each time, same
  // pattern QuestModule.tsx already uses for Main Quest quizzes.
  const shuffledOptions = useMemo(() => (current ? shuffle(current.options) : []), [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [grading, setGrading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; iconSrc: string | null } | null>(null);
  const [playerDamagePopup, setPlayerDamagePopup] = useState<{ key: number; missed: boolean } | null>(null);
  const [personaDamagePopup, setPersonaDamagePopup] = useState<{ key: number; missed: boolean } | null>(null);
  // Persona sprite's hurt flash — same .battle-hit class/timing curio battles
  // use (components/monster/BattleScreen.tsx's triggerAnim), reset-then-set
  // via double rAF so it replays even on back-to-back correct answers where
  // React would otherwise see an unchanged className and skip the animation.
  const [personaHitAnim, setPersonaHitAnim] = useState('');
  // Screen-wide red flash on a wrong answer, standing in for the persona's
  // counter landing on the player. Keyed by timestamp so a fresh DOM node
  // (and therefore a fresh animation) mounts every time, same re-trigger
  // trick the damage-number popups below already use.
  const [screenFlashKey, setScreenFlashKey] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'won') onWon(correctCount);
    if (status === 'lost') onLost();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerPersonaHitAnim = () => {
    setPersonaHitAnim('');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPersonaHitAnim('battle-hit');
        setTimeout(() => setPersonaHitAnim(''), 600);
      });
    });
  };

  const handleAnswer = async (opt: string) => {
    if (grading || selected || !current) return;
    setSelected(opt);
    setGrading(true);
    const isCorrect = await gradeBossQuestion(current.id, opt);
    setGrading(false);

    const beat: BattleBeat = {
      actor: isCorrect ? 'player' : 'opponent',
      message: isCorrect ? `Correct! You struck ${personaName}!` : `Wrong! ${personaName} strikes back!`,
      iconSrc: null,
      damage: null,
      missed: false,
      apply: () => {
        if (isCorrect) {
          setPersonaDamagePopup({ key: Date.now(), missed: false });
          triggerPersonaHitAnim();
          playHitThud();
        } else {
          setPlayerDamagePopup({ key: Date.now(), missed: false });
          setScreenFlashKey(Date.now());
          playClash();
        }
      },
    };
    runBattleBeats([beat], b => setBanner({ text: b.message, iconSrc: b.iconSrc }), () => {
      setBanner(null);
      setSelected(null);
      submitAnswer(isCorrect);
    });
  };

  if (!current) return null;

  return (
    <div
      className="relative rounded-2xl border-2 border-black overflow-hidden"
      style={{ backgroundImage: 'url(/battleui/battle_bg_normal.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="relative bg-black/60 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-white font-bold text-lg font-display">{personaName}</p>
            <div className="w-48 mt-1"><CorruptionMeter pct={corruptionPct} /></div>
          </div>
          <HeartsRow hearts={hearts} maxHearts={maxHearts} />
        </div>

        <div className="relative flex items-center justify-center py-4">
          <BackgroundPersonas personas={otherPersonas} />
          <div className={`relative w-32 h-32 ${personaHitAnim}`}>
            <div className="boss-glow" style={{ '--glow': glowColor } as CSSProperties} />
            <img src={artUrl} alt={personaName} className="relative w-full h-full object-contain" />
            {personaDamagePopup && <DamageNumber key={personaDamagePopup.key} value={1} missed={false} />}
          </div>
          {playerDamagePopup && (
            <span className="absolute bottom-0 right-1/3">
              <DamageNumber key={playerDamagePopup.key} value={1} missed={false} />
            </span>
          )}
        </div>

        {banner ? (
          <AttackBanner text={banner.text} iconSrc={banner.iconSrc} />
        ) : (
          <div className="bg-neutral-900/95 border border-neutral-700 rounded-xl p-4">
            <p className="text-[11px] text-gray-500 mb-1 font-mono">
              {correctCount} correct so far
            </p>
            <p className="text-white font-bold mb-3 leading-snug">{current.question}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shuffledOptions.map(opt => (
                <ActionTile
                  key={opt}
                  icon={<span className="text-lg">▸</span>}
                  title={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={grading || !!selected}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {screenFlashKey !== null && (
        <div key={screenFlashKey} className="absolute inset-0 bg-red-600 boss-screen-hit-flash pointer-events-none" aria-hidden="true" />
      )}
    </div>
  );
}

export default function BossFightScreen({ userId, grade, subject, otherPersonas, onExit }: BossFightScreenProps) {
  const persona = BOSS_PERSONAS[subject];
  const [rawPool, setRawPool] = useState<BossQuestion[] | null>(null);
  const [pool, setPool] = useState<BossQuestion[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lost, setLost] = useState(false);
  const [victory, setVictory] = useState<{ correctCount: number; xp: number; gold: number } | null>(null);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    const all = await fetchBossQuestionPool(grade, subject, CURRENT_TERM);
    setRawPool(all);
    setPool(buildBossQuestionPool(all));
  }, [grade, subject]);

  useEffect(() => { load(); }, [load]);

  // Persona fight theme takes over for the whole challenge session (loading,
  // battle, loss/retry, victory popup) — stopping it on unmount falls back
  // to the term boss ambient rather than silence, since the event is still
  // active for the rest of the board.
  useEffect(() => {
    startBossFightTheme();
    return () => { stopBossFightTheme(); };
  }, []);

  const handleRetry = () => {
    if (!rawPool) return;
    setLost(false);
    setPool(buildBossQuestionPool(rawPool)); // fresh shuffle/sample, not the same sequence
    setAttempt(a => a + 1);
  };

  const handleWon = async (correctCount: number) => {
    setClaiming(true);
    const { data, error } = await supabase.rpc('claim_boss_persona_victory', {
      p_user_id: userId,
      p_grade: grade,
      p_subject: subject,
      p_term: CURRENT_TERM,
    });
    setClaiming(false);
    if (error || !data?.newly_defeated) {
      // Already defeated (e.g. a stale re-render) — just exit as a win, no rewards to show.
      onExit(true);
      return;
    }
    setVictory({ correctCount, xp: data.xp_gained, gold: data.gold_gained });
  };

  if (!persona) return null;

  if (victory) {
    return (
      <BossVictoryPopup
        personaName={persona.name}
        artUrl={persona.artUrl}
        glowColor={persona.glowColor}
        xp={victory.xp}
        gold={victory.gold}
        onDismiss={() => onExit(true)}
      />
    );
  }

  if (!pool) {
    return <p className="text-gray-500 text-sm">Summoning {persona.name}…</p>;
  }

  if (pool.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center">
        <p className="text-gray-400 text-sm mb-4">This boss isn't ready to be fought yet — not enough published questions.</p>
        <button onClick={() => onExit(false)} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-6 py-2 rounded-lg">
          Back
        </button>
      </div>
    );
  }

  if (lost) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
        <p className="text-2xl mb-2">💨</p>
        <p className="text-white font-bold text-lg mb-1">{persona.name} held on.</p>
        <p className="text-gray-400 text-sm mb-6">Go review and come back stronger — no rush.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleRetry} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2 rounded-lg">
            Try Again
          </button>
          <button onClick={() => onExit(false)} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold px-6 py-2 rounded-lg">
            Retreat
          </button>
        </div>
      </div>
    );
  }

  if (claiming) {
    return <p className="text-gray-500 text-sm">Sealing the victory…</p>;
  }

  return (
    <BossFightBattle
      key={attempt}
      pool={pool}
      personaName={persona.name}
      artUrl={persona.artUrl}
      glowColor={persona.glowColor}
      otherPersonas={otherPersonas}
      onWon={handleWon}
      onLost={() => setLost(true)}
    />
  );
}
