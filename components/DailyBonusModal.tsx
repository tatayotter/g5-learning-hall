'use client';
// Full-screen "daily to-do bonus claimed" ceremony — fired from
// DailyChecklist.handleClaim once claim_daily_checklist_bonus has already
// succeeded. Mirrors the other claim ceremonies' charge -> flash -> reveal
// beat, but the reveal is a gold count-up plus the 5-day streak ladder
// (STREAK_GOLD_LADDER) so a streak's value is legible right at the moment
// it pays off, not just as a number in the panel.
import { useEffect, useState } from 'react';
import { STREAK_GOLD_LADDER, goldForStreak } from '@/lib/dailyChecklist';
import { playCoins } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface DailyBonusModalProps {
  streak: number;
  gold: number;
  userId: string;
  onClose: () => void;
}

type Phase = 'charge' | 'reveal';

export default function DailyBonusModal({ streak, gold, userId, onClose }: DailyBonusModalProps) {
  const isTala = userId === 'tala';
  const [phase, setPhase] = useState<Phase>('charge');
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('reveal');
      playCoins();
      setBurst(true);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onClose();
  };

  const isMaxed = streak >= STREAK_GOLD_LADDER.length;

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />
      <div
        className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in"
          style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
          onClick={e => e.stopPropagation()}
        >
          {/* Same wood-plank + gold trim + corner-nail frame as the battle
              screen's MonsterHpPanel/PostBattleSummary, reusing its exported
              style pieces rather than re-deriving them. */}
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <p
            className="text-sm tracking-wide mb-4"
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>DAILY BONUS CLAIMED</span>
              <span style={{ ...questTextStyle, color: isTala ? '#f9a8d4' : '#f5c542' }}>DAILY BONUS CLAIMED</span>
            </span>
          </p>

          <div className="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
            {phase === 'charge' && (
              <div className={`absolute inset-0 rounded-full claim-orb-pulse ${isTala ? 'bg-pink-500/60' : 'bg-amber-500/60'}`} />
            )}
            {phase === 'reveal' && (
              <div className={`absolute inset-0 rounded-full graduation-glow-flash ${isTala ? 'bg-pink-400' : 'bg-amber-400'}`} />
            )}
            <img
              src="/icons/rewards/gold_coin.svg"
              alt=""
              className={`relative w-14 h-14 object-contain transition-opacity duration-200 ${phase === 'charge' ? 'opacity-0' : 'opacity-100 battle-float'}`}
            />
          </div>

          {phase !== 'reveal' ? (
            <p className="text-white font-bold text-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              Tallying today's work...
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-white font-bold text-2xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>+{gold} Gold</p>
                <p className={`text-sm font-bold mt-1 ${isTala ? 'text-pink-300' : 'text-amber-300'}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                  {streak}-day streak{isMaxed ? ' · MAX' : ''}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                {STREAK_GOLD_LADDER.map((tierGold, i) => {
                  const day = i + 1;
                  const reached = streak >= day;
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                          reached
                            ? isTala
                              ? 'bg-pink-600 border-pink-400 text-white'
                              : 'bg-amber-600 border-amber-400 text-white'
                            : 'bg-black/25 border-[#8a6a3a] text-[#c9a87a]'
                        }`}
                      >
                        {day}
                      </div>
                      <span className={`text-[9px] ${reached ? 'text-[#f5f0e8]' : 'text-[#c9a87a]'}`}>{tierGold}g</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#e8d0a0]">
                {isMaxed
                  ? 'Streak bonus maxed out — keep it alive to keep earning 90 gold a day!'
                  : `Come back tomorrow for a ${goldForStreak(streak + 1)}-gold streak day. Miss a day and it resets to 50.`}
              </p>

              <GameButton variant="quest" color={isTala ? '#db2777' : '#d97706'} onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
                Sweet!
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
