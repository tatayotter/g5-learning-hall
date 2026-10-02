'use client';
// components/intro/IntroTrainingQuest.tsx
// The last step of the first-curio intro: a five-question quest that walks a
// brand-new kid through the exact main-quest flow — Study Session notes ->
// "Prepare for Battle" (with their new curio as the training curio) -> the
// real QuestModule quiz -> the real victory screen with XP, Gold and curio
// EXP. Mirrors components/dashboard/board/ActiveQuestView.tsx's screens so the
// first real quest looks familiar; questions come from lib/intro/trainingQuiz.ts
// and are graded locally.
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GameButton from '@/components/GameButton';
import GlowCta, { GLOW_CSS } from '@/components/intro/GlowCta';
import QuestModule, { markdownComponents, QuizGradeResult } from '@/components/QuestModule';
import CurioTrainingPicker, { OwnedCurio } from '@/components/dashboard/board/CurioTrainingPicker';
import type { TrainingResult } from '@/components/VictoryScreen';
import type { CharacterStats } from '@/hooks/useWeeklyData';
import { getTrainingQuiz, TRAINING_NOTES } from '@/lib/intro/trainingQuiz';
import { SPEAKERS, TRAINING_LINES, VoiceLine, voiceSrc } from '@/lib/intro/originStory';
import { awardCurioTrainingExp } from '@/lib/curioTraining';
import { duckMainTheme, isSfxEnabled } from '@/lib/sounds';
import { trackEvent } from '@/lib/analytics';
import { playCue } from '@/lib/intro/introCues';

interface IntroTrainingQuestProps {
  userId: string;
  grade: number;
  currentStats: CharacterStats;
  weekStartingDate: string | null;
  // Persists the quiz's XP/Gold (Dashboard routes it through updateStatsAndJournal).
  onRewards: (newStats: CharacterStats, xpEarned: number, goldEarned: number) => void;
  onDone: (completed: boolean) => void;
  /** A real main quest is open to hand off to — changes the victory button. */
  hasFirstQuest?: boolean;
}

type Phase = 'study' | 'ready' | 'quiz';

export default function IntroTrainingQuest({ userId, grade, currentStats, weekStartingDate, onRewards, onDone, hasFirstQuest = false }: IntroTrainingQuestProps) {
  const questions = useMemo(() => getTrainingQuiz(grade), [grade]);
  const questData = useMemo(() => ({ quiz: questions.map(q => ({ question: q.question, options: q.options })) }), [questions]);
  const [phase, setPhase] = useState<Phase>('study');
  const [attempts, setAttempts] = useState(0);
  const [trainingCurio, setTrainingCurio] = useState<OwnedCurio | undefined>(undefined);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);

  useSpokenLine(phase === 'study' ? TRAINING_LINES.notes : null);
  const [victoryLine, setVictoryLine] = useState<VoiceLine | null>(null);
  useSpokenLine(victoryLine);

  const gradeQuiz = async (selected: Record<number, string>): Promise<QuizGradeResult> => {
    const correctCount = questions.filter((q, i) => selected[i] === q.answer).length;
    return {
      correct_count: correctCount,
      total: questions.length,
      is_perfect: correctCount === questions.length,
      correct_answers: questions.map(q => q.answer),
    };
  };

  const skip = () => {
    trackEvent('intro_training_skipped', { phase, attempts });
    onDone(false);
  };

  return (
    <div className="fixed inset-0 z-[95] bg-white overflow-y-auto">
      <style>{GLOW_CSS}</style>
      <div className="w-full max-w-4xl mx-auto px-4 py-5 sm:py-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#c9781a]">Your first quest</p>
          <button onClick={skip} className="text-[11px] font-bold uppercase tracking-wide text-[#6b4820] hover:text-[#2a1505]">
            Skip training
          </button>
        </div>

        {phase === 'study' && (
          <div className="space-y-6">
            <NarratorBanner line={TRAINING_LINES.notes} />
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-[#e8d0a0]">
              <h2 className="text-3xl font-bold mb-6 text-[#7a4a0f] font-display">Study Session: Wake Your Curio</h2>
              <div className="border-t border-[#c9a87a] pt-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{TRAINING_NOTES}</ReactMarkdown>
              </div>
            </div>
            <GlowCta className="w-full">
              <GameButton variant="quest" color="#eab308" onClick={() => { playCue('readyToFight'); setPhase('ready'); }} className="w-full" style={{ fontSize: 18 }}>
                I Am Ready To Fight
              </GameButton>
            </GlowCta>
          </div>
        )}

        {phase === 'ready' && (
          <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 sm:p-12 rounded-2xl text-center shadow-2xl">
            <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">Training Encounter</p>
            <h2 className="text-4xl font-display font-bold text-[#2a1505] mb-4">Prepare for Battle</h2>
            <p className="text-[#6b4820] mb-8 max-w-sm mx-auto">
              Five questions. Answer them all correctly to wake your Curio. Your Curio trains alongside you and earns EXP from every perfect quest.
            </p>
            <CurioTrainingPicker userId={userId} selectedId={trainingCurio?.id} onSelect={setTrainingCurio} />
            <div className="flex gap-4 justify-center">
              <GameButton variant="quest" color="#d4d4d4" onClick={() => setPhase('study')} style={{ fontSize: 15 }}>
                Go Back to Notes
              </GameButton>
              <GlowCta>
                <GameButton variant="quest" color="#3b82f6" onClick={() => { playCue('startQuiz'); setPhase('quiz'); }} style={{ fontSize: 15 }}>
                  Start Quiz
                </GameButton>
              </GlowCta>
            </div>
          </div>
        )}

        {phase === 'quiz' && (
          <QuestModule
            practice
            exitLabel={hasFirstQuest ? 'Start Your First Real Quest' : 'Go to the Campaign Map'}
            userId={userId}
            questName="Wake Your Curio"
            questKey="intro_training"
            questData={questData}
            currentStats={currentStats}
            attemptsSoFar={attempts}
            dailyAttemptsUsed={0}
            isMastered={false}
            trainingCurio={trainingCurio ?? null}
            trainingResult={trainingResult}
            gradeQuiz={gradeQuiz}
            onQuizSubmit={(isPerfect, newAttempts, newStats, xpEarned, goldEarned) => {
              setAttempts(newAttempts);
              trackEvent('intro_training_submitted', { perfect: isPerfect, attempt: newAttempts, grade });
              if (!isPerfect) return;
              onRewards(newStats, xpEarned, goldEarned);
              setVictoryLine(TRAINING_LINES.victory);
              if (trainingCurio && weekStartingDate) {
                awardCurioTrainingExp(userId, trainingCurio.id, xpEarned, weekStartingDate).then(r => { if (r) setTrainingResult(r); });
              }
            }}
            onExit={() => {
              trackEvent('intro_training_completed', { attempts, grade, handoff: hasFirstQuest });
              onDone(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Dark narrator strip over the light quest screens, so the Lorekeeper's voice
// carries over from the story without re-theming the parchment panels.
function NarratorBanner({ line }: { line: VoiceLine }) {
  const speaker = SPEAKERS[line.speaker];
  return (
    <div className="flex items-end gap-3 bg-[#1a1208] rounded-xl px-4 py-3 shadow-lg">
      <img src={speaker.portrait} alt="" className="w-10 h-14 object-contain object-bottom flex-none" />
      <p className="text-sm leading-snug text-[#f5f0e8]">
        <span className="block text-[11px] font-extrabold uppercase tracking-wider mb-0.5" style={{ color: speaker.color }}>{speaker.name}</span>
        {line.text}
      </p>
    </div>
  );
}

// Plays one voice clip (ducking the music) whenever `line` changes to a new
// line; silently does nothing if sound is off or the clip isn't recorded yet.
function useSpokenLine(line: VoiceLine | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const id = line?.id;
  useEffect(() => {
    if (!id || !isSfxEnabled()) return;
    const audio = new Audio(voiceSrc(id));
    audio.volume = 0.95;
    audioRef.current = audio;
    duckMainTheme(true);
    const restore = () => duckMainTheme(false);
    audio.onended = restore;
    audio.onerror = restore;
    audio.play().catch(restore);
    return () => { audio.pause(); restore(); };
  }, [id]);
}
