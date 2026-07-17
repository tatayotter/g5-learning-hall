'use client';
// components/battle/PostBattleSummary.tsx
// Shared post-battle summary screen — win/loss/draw banner, both sides'
// avatar + monster + stats, a scrollable log recap, and a single Continue
// button the player clicks to leave. Used by both LiveBattleScreen (PVP) and
// the solo BattleScreen (NPC trainers + wild encounters) so every battle mode
// in the game ends the same way instead of PVP alone getting a proper recap.
import { useState } from 'react';
import { ActiveBattleMonster, MonsterImage } from '@/components/battle/shared';
import { getScaledStats } from '@/lib/monsterConfig';

function AvatarImage({ src, fallbackEmoji, alt }: { src: string; fallbackEmoji?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed && fallbackEmoji) {
    return (
      <span className="w-16 h-16 rounded-full border border-neutral-600 mx-auto mb-2 flex items-center justify-center text-3xl bg-neutral-950">
        {fallbackEmoji}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-16 h-16 rounded-full object-cover border border-neutral-600 mx-auto mb-2"
      onError={() => (fallbackEmoji ? setFailed(true) : undefined)}
    />
  );
}

export interface PostBattleSideInfo {
  avatarSrc: string;
  avatarFallbackEmoji?: string;
  name: string;
  subtitle?: string;
  mon: ActiveBattleMonster;
  isWinner: boolean;
}

interface PostBattleSummaryProps {
  outcome: 'win' | 'loss' | 'draw';
  reasonLabel: string;
  left: PostBattleSideInfo;
  right: PostBattleSideInfo;
  log: string[];
  rewardLine?: string;
  onContinue: () => void;
}

function Side({ avatarSrc, avatarFallbackEmoji, name, subtitle, mon, isWinner }: PostBattleSideInfo) {
  const scaled = getScaledStats(mon.def, mon.level);
  return (
    <div className={`flex-1 rounded-2xl border-2 p-5 text-center ${isWinner ? 'border-amber-500 bg-amber-900/10' : 'border-neutral-700 bg-neutral-950'}`}>
      {isWinner && <p className="text-xs font-bold text-amber-400 mb-2">🏆 WINNER</p>}
      <AvatarImage src={avatarSrc} fallbackEmoji={avatarFallbackEmoji} alt={name} />
      <p className="font-bold text-white">{name}</p>
      {subtitle && <p className="text-xs text-gray-500 mb-1">{subtitle}</p>}
      <div className="w-14 h-14 mx-auto my-2">
        <MonsterImage monster={mon.def} className="w-full h-full" emojiClassName="text-3xl" />
      </div>
      <p className="text-sm text-gray-300">{mon.def.name} · Lv.{mon.level}</p>
      <p className="text-xs text-gray-500 capitalize">{mon.def.element} · {mon.def.archetype.replace('_', ' ')}</p>
      <p className={`text-sm font-mono mt-2 ${mon.currentHp <= 0 ? 'text-red-500' : 'text-green-400'}`}>
        {Math.max(0, mon.currentHp)}/{mon.maxHp} HP
      </p>
      <p className="text-xs text-gray-500 mt-1">⚔️ {scaled.attack} ATK · 🛡️ {scaled.defense} DEF · ⚡ {scaled.speed} SPD</p>
    </div>
  );
}

export default function PostBattleSummary({ outcome, reasonLabel, left, right, log, rewardLine, onContinue }: PostBattleSummaryProps) {
  const titleText = outcome === 'draw' ? "🤝 It's a Draw!" : outcome === 'win' ? '🏆 Victory!' : '💀 Defeat...';

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6">
      <p className="text-center text-2xl font-display font-bold text-white mb-1">{titleText}</p>
      <p className="text-center text-xs text-gray-500 mb-1">{reasonLabel}</p>
      {rewardLine && <p className="text-center text-xs text-amber-400 font-bold mb-4">{rewardLine}</p>}
      {!rewardLine && <div className="mb-4" />}
      <div className="flex gap-4 mb-6">
        <Side {...left} />
        <Side {...right} />
      </div>
      <div className="bg-black/30 rounded-xl p-3 max-h-40 overflow-y-auto mb-6">
        {log.map((msg, i) => (
          <p key={i} className="text-xs text-gray-400 mb-1">{msg}</p>
        ))}
      </div>
      <button
        onClick={onContinue}
        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
