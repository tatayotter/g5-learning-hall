'use client';
// components/battle/PostBattleSummary.tsx
// Shared post-battle summary screen — win/loss/draw banner, both sides'
// avatar + monster + stats, a scrollable log recap, and a single Continue
// button the player clicks to leave. Used by both LiveBattleScreen (PVP) and
// the solo BattleScreen (NPC trainers + wild encounters) so every battle mode
// in the game ends the same way instead of PVP alone getting a proper recap.
import { useState } from 'react';
import { ActiveBattleMonster, MonsterImage } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';

// The player's userpic and the trainer's sprite, unframed — no border, no
// background chip, no rounding of any kind. Just the art itself, sized and
// centered ("don't wrap in any shape", 2026-08-29).
function AvatarImage({ src, fallbackEmoji, alt, contain }: { src: string; fallbackEmoji?: string; alt: string; contain?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed && fallbackEmoji) {
    return (
      <span className="w-16 h-16 mx-auto mb-2 flex items-center justify-center text-3xl">
        {fallbackEmoji}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`w-16 h-16 mx-auto mb-2 ${contain ? 'object-contain' : 'object-cover'}`}
      onError={() => (fallbackEmoji ? setFailed(true) : undefined)}
    />
  );
}

export interface PostBattleSideInfo {
  avatarSrc: string;
  avatarFallbackEmoji?: string;
  // Set when avatarSrc is a non-square sprite (e.g. a trainer's full-body
  // art rather than the usual square /trainers/{id}.png icon) — object-cover
  // would crop it, so this switches to object-contain instead.
  avatarContain?: boolean;
  name: string;
  subtitle?: string;
  mon: ActiveBattleMonster;
  // Full roster, not just the curio that ended the battle — rendered as a
  // small lineup row so the whole team is visible, not only the active one.
  // Falls back to [mon] when omitted (e.g. a caller that never tracked a
  // multi-monster roster).
  team?: ActiveBattleMonster[];
  isWinner: boolean;
}

interface PostBattleSummaryProps {
  outcome: 'win' | 'loss' | 'draw';
  reasonLabel: string;
  left: PostBattleSideInfo;
  right: PostBattleSideInfo;
  log: string[];
  // Preferred: numeric rewards, rendered as one consistent "You Earned X
  // EXP, Y Gold" line. `rewardLine` remains as a free-text escape hatch for
  // a caller with a message that doesn't fit that template.
  expEarned?: number;
  goldEarned?: number;
  rewardLine?: string;
  onContinue: () => void;
}

function Side({ avatarSrc, avatarFallbackEmoji, avatarContain, name, subtitle, team, mon, isWinner }: PostBattleSideInfo) {
  const roster = team && team.length > 0 ? team : [mon];
  return (
    <div
      className={`flex-1 rounded-2xl border-2 p-5 text-center ${
        isWinner
          ? 'border-green-500 bg-green-50 py-8 shadow-[0_0_18px_3px_rgba(34,197,94,0.4)]'
          : 'border-red-500 bg-red-50'
      }`}
    >
      {isWinner && <p className="text-xs font-extrabold tracking-widest text-green-700 mb-2">WINNER</p>}
      <AvatarImage src={avatarSrc} fallbackEmoji={avatarFallbackEmoji} alt={name} contain={avatarContain} />
      <p className="font-bold text-[#2a1505]">{name}</p>
      {subtitle && <p className="text-xs text-[#6b4820] mb-1">{subtitle}</p>}

      {/* Team lineup — just name + level per curio. Fainted ones (currentHp
          <= 0) fade to indicate they're down, without hiding them from the
          roster. No per-stat breakdown here — that level of detail belongs
          to the Compendium/team panel, not this recap. */}
      <div className="flex flex-col items-center gap-1.5 my-3">
        {roster.map((m, i) => (
          <div key={i} className={`flex items-center gap-2 ${m.currentHp <= 0 ? 'opacity-30 grayscale' : ''}`}>
            <div className="w-8 h-8 flex-shrink-0">
              <MonsterImage monster={m.def} className="w-full h-full" emojiClassName="text-lg" />
            </div>
            <span className="text-xs font-bold text-[#3a2610]">{m.def.name} · Lv.{m.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PostBattleSummary({ outcome, reasonLabel, left, right, log, expEarned, goldEarned, rewardLine, onContinue }: PostBattleSummaryProps) {
  const titleIcon = outcome === 'draw' ? '/icons/stats/draw.svg' : outcome === 'win' ? '/icons/stats/victory.svg' : '/icons/stats/defeat.svg';
  const titleText = outcome === 'draw' ? "It's a Draw!" : outcome === 'win' ? 'Victory!' : 'Defeat...';

  const computedRewardLine = rewardLine ?? (
    expEarned || goldEarned
      ? `You Earned ${expEarned ?? 0} EXP${goldEarned ? `, ${goldEarned} Gold` : ''}`
      : undefined
  );

  return (
    <div className="bg-white border border-[#c9a87a] rounded-2xl p-6 battle-panel-in">
      <div className="flex flex-col items-center justify-center gap-1 mb-1">
        <img src={titleIcon} alt={outcome} className="w-10 h-10 object-contain" />
        <p className="text-center text-2xl font-display font-bold text-[#2a1505]">{titleText}</p>
      </div>
      {/* The reason line ("Fight complete") is redundant with "Victory!" on
          a win — only shown when it's actually informative (a loss/draw, or
          a non-default reason like a surrender). */}
      {outcome !== 'win' && <p className="text-center text-xs text-[#6b4820] mb-1">{reasonLabel}</p>}
      {computedRewardLine && <p className="text-center text-xs text-[#c9781a] font-bold mb-4">{computedRewardLine}</p>}
      {!computedRewardLine && outcome === 'win' && <div className="mb-4" />}
      <div className="flex items-start gap-4 mb-6">
        <Side {...left} />
        <Side {...right} />
      </div>
      <div className="bg-[#f5f0e8] rounded-xl p-3 max-h-40 overflow-y-auto mb-6">
        {log.map((msg, i) => (
          <p key={i} className="text-xs text-[#6b4820] mb-1">{msg}</p>
        ))}
      </div>
      <GameButton variant="quest" color="#d97706" onClick={onContinue} className="w-full" style={{ fontSize: 16 }}>
        Continue
      </GameButton>
    </div>
  );
}
