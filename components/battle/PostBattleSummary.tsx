'use client';
// components/battle/PostBattleSummary.tsx
// Shared post-battle summary screen — win/loss/draw banner, both sides'
// avatar + monster + stats, a scrollable log recap, and a single Continue
// button the player clicks to leave. Used by both LiveBattleScreen (PVP) and
// the solo BattleScreen (NPC trainers + wild encounters) so every battle mode
// in the game ends the same way instead of PVP alone getting a proper recap.
import { useMemo, useState } from 'react';
import { ActiveBattleMonster, MonsterImage } from '@/components/battle/shared';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle } from '@/components/GameButton';
import { Nail } from '@/components/battle/MonsterHpPanel';
import VictoryScreen, { VictoryReward, XpIcon, GoldIcon, XP_REWARD, GOLD_REWARD } from '@/components/VictoryScreen';

const TITLE_COLOR: Record<'win' | 'loss' | 'draw', string> = {
  win: '#f5c542', // quest-button gold
  loss: '#dc2626',
  draw: '#2563eb',
};

// A short, warm nudge shown only under "Defeat..." — same encouraging,
// no-shame tone as WelcomeCard's MOTD lines. Picked once per mount rather
// than per render so it doesn't flicker between lines on a re-render.
const DEFEAT_ENCOURAGEMENT = [
  "Every loss teaches something a win can't.",
  "Rest up, review your notes, and try again.",
  "Champions lose plenty of rounds before they don't.",
  "That one stings — but you'll come back sharper.",
];

// Same idea, but for "It's a Draw!" — leans on strategy/tactics rather than
// resilience, since a draw usually means the plan was close, not wrong.
const DRAW_ENCOURAGEMENT = [
  "So close! A sharper move order might've tipped this one.",
  "Dead even — try switching up your curio order next time.",
  "A draw means your strategy is almost there. Fine-tune it.",
  "Neither side broke through — time to rethink your lineup.",
];

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
  // No longer displayed (the small reason line under the title was dropped
  // for every outcome, 2026-08-29) — kept optional so existing callers that
  // still pass one (e.g. "You surrendered" vs "Fight complete") don't need
  // an immediate follow-up edit.
  reasonLabel?: string;
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
      className={`relative flex-1 rounded-2xl border-2 bg-white p-5 text-center ${
        isWinner
          ? 'border-green-500 py-8 shadow-[0_0_18px_3px_rgba(34,197,94,0.4)]'
          : 'border-red-500'
      }`}
    >
      <Nail className="top-3 left-3" />
      <Nail className="top-3 right-3" />
      <Nail className="bottom-3 left-3" />
      <Nail className="bottom-3 right-3" />
      {isWinner && (
        // Same Bungee/stroke/shadow text treatment as the quest GameButton's
        // label (2026-08-29), in the card's own green instead of the
        // button's white.
        <p className="text-sm mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>WINNER</span>
            <span style={{ position: 'relative', color: '#22c55e', WebkitTextStroke: '0.0952em #000', paintOrder: 'stroke fill' as const }}>WINNER</span>
          </span>
        </p>
      )}
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

// Stars are outcome-based, not a score: win 3, draw 1, loss 0.
const OUTCOME_STARS: Record<'win' | 'loss' | 'draw', number> = { win: 3, draw: 1, loss: 0 };

export default function PostBattleSummary({ outcome, left, right, log, expEarned, goldEarned, rewardLine, onContinue }: PostBattleSummaryProps) {
  const titleText = outcome === 'draw' ? "It's a Draw!" : outcome === 'win' ? 'Victory!' : 'Defeat...';

  const rewards: VictoryReward[] = [];
  if (expEarned) rewards.push({ ...XP_REWARD, label: 'Curio EXP', value: expEarned, icon: <XpIcon /> });
  if (goldEarned) rewards.push({ ...GOLD_REWARD, value: goldEarned, icon: <GoldIcon /> });

  const encouragement = useMemo(() => {
    const pool = outcome === 'draw' ? DRAW_ENCOURAGEMENT : DEFEAT_ENCOURAGEMENT;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [outcome]);

  // A loss/draw gets its warm nudge; a win shows the free-text reward line only
  // when the caller had no numeric rewards to put in the tiles.
  const subtitle = outcome !== 'win' ? encouragement : (rewards.length === 0 ? rewardLine : undefined);

  return (
    <div className="battle-panel-in">
      <VictoryScreen
        title={titleText.toUpperCase()}
        titleColor={TITLE_COLOR[outcome]}
        stars={OUTCOME_STARS[outcome]}
        rays={outcome === 'win'}
        subtitle={subtitle}
        rewards={rewards}
        actions={
          <GameButton variant="quest" color="#d97706" onClick={onContinue} className="w-full max-w-sm" style={{ fontSize: 20 }}>
            Continue
          </GameButton>
        }
      >
        <div className="flex items-start gap-4 mb-6 text-left">
          <Side {...left} />
          <Side {...right} />
        </div>
        <div className="bg-[#f5f0e8] border border-[#c9a87a] rounded-xl p-3 max-h-40 overflow-y-auto text-left">
          {log.map((msg, i) => (
            <p key={i} className="text-xs text-[#6b4820] mb-1">{msg}</p>
          ))}
        </div>
      </VictoryScreen>
    </div>
  );
}
