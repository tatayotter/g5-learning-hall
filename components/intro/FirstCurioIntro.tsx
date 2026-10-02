'use client';
// components/intro/FirstCurioIntro.tsx
// Onboarding for any account that doesn't own a curio yet (Dashboard mounts
// it): the voiced origin story -> choosing a first curio -> a five-question
// training quest that teaches the main-quest flow.
//
// Why it exists (usage data, 2026-09-30): 70% of new kids never started a
// single quiz, and only 19 of 212 ever got a curio because the starter pick
// lived on the monster tab. Curio owners learned and returned at 3-4x the rate.
import { useState } from 'react';
import OriginStory from '@/components/intro/OriginStory';
import IntroTrainingQuest from '@/components/intro/IntroTrainingQuest';
import StarterSelection from '@/components/monster/StarterSelection';
import type { CharacterStats } from '@/hooks/useWeeklyData';
import { trackEvent } from '@/lib/analytics';

const TRAINING_PENDING_PREFIX = 'lh_intro_training_pending';

// Set when the curio is claimed, cleared when training ends — so a kid who
// reloads between the two still gets the training quest (they'd otherwise
// skip it, since owning a curio is what normally ends the intro).
export function isIntroTrainingPending(userId: string): boolean {
  try { return localStorage.getItem(`${TRAINING_PENDING_PREFIX}:${userId}`) === '1'; } catch { return false; }
}

function setIntroTrainingPending(userId: string, pending: boolean) {
  try {
    if (pending) localStorage.setItem(`${TRAINING_PENDING_PREFIX}:${userId}`, '1');
    else localStorage.removeItem(`${TRAINING_PENDING_PREFIX}:${userId}`);
  } catch {
    // storage unavailable — worst case the training quest isn't resumed after a reload
  }
}

type Stage = 'story' | 'pick' | 'training';

interface FirstCurioIntroProps {
  userId: string;
  playerName: string;
  grade: number;
  startAt: 'story' | 'training';
  currentStats: CharacterStats;
  weekStartingDate: string | null;
  onRewards: (newStats: CharacterStats, xpEarned: number, goldEarned: number) => void;
  /** Whether a real main quest is open for the post-training handoff. */
  hasFirstQuest: boolean;
  /** startFirstQuest: training was finished (not skipped) with a quest to hand off to. */
  onFinish: (startFirstQuest: boolean) => void;
}

export default function FirstCurioIntro({ userId, playerName, grade, startAt, currentStats, weekStartingDate, onRewards, hasFirstQuest, onFinish }: FirstCurioIntroProps) {
  const [stage, setStage] = useState<Stage>(startAt);

  if (stage === 'story') {
    return (
      <OriginStory
        playerName={playerName}
        onFinish={() => { trackEvent('intro_story_completed'); setStage('pick'); }}
        onSkip={() => setStage('pick')}
      />
    );
  }

  if (stage === 'pick') {
    return (
      // Dark scrim + parchment panel (STYLE_GUIDE: content panels float on
      // the shell). StarterClaimModal renders its own z-[60] ceremony on top.
      <div className="fixed inset-0 z-[95] bg-[#120c05] overflow-y-auto p-4">
        <div className="bg-[#f0ddb8] border border-[#8b5e2a] rounded-2xl shadow-2xl p-5 sm:p-8 max-w-4xl mx-auto my-4">
          <StarterSelection
            userId={userId}
            onComplete={() => {
              trackEvent('starter_curio_claimed', { source: 'intro' });
              setIntroTrainingPending(userId, true);
              setStage('training');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <IntroTrainingQuest
      userId={userId}
      grade={grade}
      currentStats={currentStats}
      weekStartingDate={weekStartingDate}
      onRewards={onRewards}
      hasFirstQuest={hasFirstQuest}
      onDone={(completed) => {
        setIntroTrainingPending(userId, false);
        onFinish(completed && hasFirstQuest);
      }}
    />
  );
}
