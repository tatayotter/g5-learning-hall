'use client';
// components/guilds/GuildSessionResults.tsx
// The "Session Complete" screen shared by all five guild mini-games (Lexicon
// Arena, Logic Labyrinth, Lorekeeper, Number Realm, Spell Caster). They used
// to each carry a near-identical copy of this markup; now they differ only in
// the props below (guardian, background art, rank names, Play Again color).
// Built on VictoryScreen so it gets the same frame, stars, reward count-up.
import { ReactNode } from 'react';
import GameButton, {
  questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle,
} from '@/components/GameButton';
import VictoryScreen, { XpIcon, GoldIcon, XP_REWARD, GOLD_REWARD } from '@/components/VictoryScreen';
import GuardianSprite, { GuardianGuild } from '@/components/guilds/GuardianSprite';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface GuildSessionResultsProps {
  guild: GuardianGuild;
  bgUrl: string;                           // guild backdrop art (public/guilds/*-bg.png)
  rank: { label: string };                 // e.g. Lexicon Master
  correct: number;
  wrong: number;
  xp: number;                              // Subclass XP earned this session
  gold: number;
  playAgainColor: string;                  // guild accent for the Play Again button
  onPlayAgain: () => void;
  onExit: () => void;
  overlays?: ReactNode;                    // guild-specific modals (curio reveal, graduation)
}

// Same thresholds the old rank titles used (10+ = master, 5+ = adept).
function starsFor(correct: number) {
  return correct >= 10 ? 3 : correct >= 5 ? 2 : correct > 0 ? 1 : 0;
}

function StatWord({ children, color = '#ffffff', size = 34 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: size, lineHeight: 1 }}>
      <span aria-hidden style={questTextShadowStyle}>{children}</span>
      <span style={{ ...questTextStyle, color }}>{children}</span>
    </span>
  );
}

// Guardian + correct/wrong + accuracy bar, framed like the battle HP card.
function SessionStatsCard({ guild, correct, wrong }: { guild: GuardianGuild; correct: number; wrong: number }) {
  const total = correct + wrong;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div
      className="vs-rise relative mx-auto max-w-md rounded-lg border-2 border-[#4a2f18] px-4 py-4 text-center"
      style={{ animationDelay: '900ms', boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
    >
      <Nail className="top-1 left-1" />
      <Nail className="top-1 right-1" />
      <Nail className="bottom-1 left-1" />
      <Nail className="bottom-1 right-1" />

      <div className="w-32 h-32 mx-auto mb-2">
        <GuardianSprite guild={guild} pose="defeated" className="w-full h-full" />
      </div>

      <div className="flex items-end justify-center gap-10 mb-3">
        <div>
          <StatWord color="#86efac">{correct}</StatWord>
          <p className="mt-1"><StatWord color="#ffffff" size={12}>Correct</StatWord></p>
        </div>
        <div>
          <StatWord color="#fca5a5">{wrong}</StatWord>
          <p className="mt-1"><StatWord color="#ffffff" size={12}>Wrong</StatWord></p>
        </div>
      </div>

      {total > 0 && (
        <div className="relative h-[18px] max-w-xs mx-auto bg-[#0a0807] border-2 border-[#ffffff] rounded-full overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, background: 'linear-gradient(180deg,#86efac,#22c55e 55%,#15803d)' }} />
          <p
            className="absolute inset-0 flex items-center justify-center text-[#ffffff] text-[10px] leading-none"
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          >
            {pct}% ACCURACY
          </p>
        </div>
      )}
    </div>
  );
}

export default function GuildSessionResults({
  guild, bgUrl, rank, correct, wrong, xp, gold, playAgainColor, onPlayAgain, onExit, overlays,
}: GuildSessionResultsProps) {
  return (
    <div
      className="fixed inset-0 overflow-y-auto battle-panel-in"
      style={{ zIndex: 80, backgroundImage: `linear-gradient(rgba(10,8,7,.55), rgba(10,8,7,.7)), url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {overlays}
      <div className="max-w-xl mx-auto px-3 py-6 sm:py-10">
        <VictoryScreen
          title="Session Complete!"
          stars={starsFor(correct)}
          subtitle={rank.label}
          rewards={[
            { ...XP_REWARD, label: 'Subclass XP', value: xp, icon: <XpIcon /> },
            { ...GOLD_REWARD, value: gold, icon: <GoldIcon /> },
          ]}
          actions={
            <div className="flex flex-col items-center gap-3">
              <GameButton variant="quest" color={playAgainColor} onClick={onPlayAgain} style={{ fontSize: 20 }}>
                Play Again
              </GameButton>
              <GameButton variant="quest" color="#8b5e2a" onClick={onExit} style={{ fontSize: 16 }}>
                ← Return to Campaign Map
              </GameButton>
            </div>
          }
        >
          <SessionStatsCard guild={guild} correct={correct} wrong={wrong} />
        </VictoryScreen>
      </div>
    </div>
  );
}
