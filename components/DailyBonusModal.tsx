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
import GameButton from '@/components/GameButton';

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
          className={`relative bg-[#f0ddb8] border-2 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in ${
            isTala ? 'border-pink-500' : 'border-amber-600'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-700' : 'text-amber-700'}`}>
            🔥 DAILY BONUS CLAIMED 🔥
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
            <p className="text-[#2a1505] font-bold text-lg">Tallying today's work...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[#2a1505] font-bold text-2xl">+{gold} Gold</p>
                <p className={`text-sm font-bold mt-1 ${isTala ? 'text-pink-700' : 'text-amber-700'}`}>
                  🔥 {streak}-day streak{isMaxed ? ' · MAX' : ''}
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
                            : 'bg-[#e8d0a0]/60 border-[#c9a87a] text-[#a89c86]'
                        }`}
                      >
                        {day}
                      </div>
                      <span className={`text-[9px] ${reached ? 'text-[#3a2610]' : 'text-[#a89c86]'}`}>{tierGold}g</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#6b4820]">
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
