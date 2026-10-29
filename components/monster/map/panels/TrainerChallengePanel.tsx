'use client';
// Trainer NPC challenge dialogue — shown by TrainingMap.tsx when the player
// enters the trainer's 3×3 detection zone (pendingTrainerChallenge). Accept
// launches the battle; Run Away (or the X) dismisses and despawns the trainer. Uses the
// in-game pop-up frame (components/game/GamePopup.tsx).
import type { NpcTrainer } from '@/lib/monsterConfig';
import GameButton from '@/components/GameButton';
import GamePopup from '@/components/game/GamePopup';

interface TrainerChallengePanelProps {
  trainer: NpcTrainer;
  onAccept: () => void;
  onRunAway: () => void;
}

export default function TrainerChallengePanel({ trainer, onAccept, onRunAway }: TrainerChallengePanelProps) {
  return (
    <GamePopup
      inline
      title={trainer.name}
      speaker={{
        portrait: (
          <img
            src={trainer.spriteOverride ?? `/trainers/${trainer.id}.png`}
            alt=""
            className="w-14 h-[72px] mt-0.5 object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ),
        line: trainer.intro,
      }}
      onClose={onRunAway}
      testId="trainer-challenge"
      footer={
        <div className="flex gap-2">
          <GameButton variant="quest" color="#d97706" onClick={onAccept} className="flex-1" style={{ fontSize: 15 }} data-testid="trainer-accept">
            Accept!
          </GameButton>
          <GameButton variant="quest" color="#78716c" onClick={onRunAway} className="flex-1" style={{ fontSize: 15 }} data-testid="trainer-run">
            Run Away!
          </GameButton>
        </div>
      }
    >
      <p className="rounded-xl border-2 border-[#8b5e2a] bg-[#fffdf7] px-3 py-2 text-[13px] font-semibold leading-snug text-[#2a1505]">
        A trainer wants to battle your curios! Answer right to win.
      </p>
    </GamePopup>
  );
}
