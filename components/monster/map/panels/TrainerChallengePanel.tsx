'use client';
// Trainer NPC challenge dialogue — shown by TrainingMap.tsx when the player
// enters the trainer's 3×3 detection zone (pendingTrainerChallenge). Accept
// launches the battle; Run Away dismisses and despawns the trainer.
import type { NpcTrainer } from '@/lib/monsterConfig';

interface TrainerChallengePanelProps {
  trainer: NpcTrainer;
  onAccept: () => void;
  onRunAway: () => void;
}

export default function TrainerChallengePanel({ trainer, onAccept, onRunAway }: TrainerChallengePanelProps) {
  return (
    <div className="w-full max-w-sm bg-neutral-900 border border-amber-700 rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <img
          src={trainer.spriteOverride ?? `/trainers/${trainer.id}.png`}
          alt={trainer.name}
          className="w-14 h-14 flex-shrink-0 object-contain object-bottom rounded-lg bg-neutral-800"
          onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).alt = trainer.emoji ?? ''; }}
        />
        <div className="min-w-0">
          <p className="font-bold text-amber-300 text-sm leading-tight">{trainer.name}</p>
          <p className="text-gray-300 text-sm italic mt-1 leading-snug">
            "{trainer.intro}"
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700
                     text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          onClick={onAccept}
        >
          ⚔️ Accept!
        </button>
        <button
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900
                     text-gray-400 font-bold text-sm py-2.5 rounded-xl border border-neutral-700
                     transition-colors"
          onClick={onRunAway}
        >
          🏃 Run Away!
        </button>
      </div>
    </div>
  );
}
