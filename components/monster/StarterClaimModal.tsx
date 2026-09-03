'use client';
// Full-screen "first curio claimed" ceremony — fired once from
// StarterSelection right after the chosen starter's insert succeeds.
// Mirrors GraduationCeremonyModal's shell (backdrop/panel/theming/
// CelebrationOverlay) but scripts a bonding-orb beat (charge -> flash ->
// reveal) instead of the graduation scroll/flicker sequence, since there's
// no "from" form here — just a single monster being claimed for the first time.
import { useEffect, useState } from 'react';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { playCurioCaught } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface StarterClaimModalProps {
  monster: MonsterDef;
  userId: string;
  onComplete: () => void;
}

type Phase = 'charge' | 'flash' | 'reveal';

const STAT_ROWS: { label: string; icon: string; key: 'hp' | 'attack' | 'defense' | 'speed' }[] = [
  { label: 'HP', icon: '/icons/stats/hp.svg', key: 'hp' },
  { label: 'Attack', icon: '/icons/stats/atk.svg', key: 'attack' },
  { label: 'Defense', icon: '/icons/stats/def.svg', key: 'defense' },
  { label: 'Speed', icon: '/icons/stats/spd.svg', key: 'speed' },
];

export default function StarterClaimModal({ monster, userId, onComplete }: StarterClaimModalProps) {
  const isTala = userId === 'tala';
  const [phase, setPhase] = useState<Phase>('charge');
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('flash'), 1400));
    timers.push(setTimeout(() => {
      setPhase('reveal');
      playCurioCaught();
      setBurst(true);
    }, 1700));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onComplete();
  };

  const scaled = getScaledStats(monster, 1);

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
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
              <span aria-hidden style={questTextShadowStyle}>YOUR FIRST CURIO</span>
              <span style={{ ...questTextStyle, color: isTala ? '#f9a8d4' : '#f5c542' }}>YOUR FIRST CURIO</span>
            </span>
          </p>

          <div className="relative w-28 h-28 mx-auto mb-4">
            {phase === 'flash' && (
              <div
                className={`absolute inset-0 rounded-full graduation-glow-flash ${isTala ? 'bg-pink-400' : 'bg-amber-400'}`}
              />
            )}
            {phase === 'charge' && (
              <div
                className={`absolute inset-0 rounded-full claim-orb-pulse ${isTala ? 'bg-pink-500/60' : 'bg-amber-500/60'}`}
              />
            )}
            <div className={`relative w-full h-full transition-opacity duration-200 ${phase === 'charge' ? 'opacity-0' : 'opacity-100'}`}>
              <MonsterImage monster={monster} className={`w-full h-full ${phase === 'reveal' ? 'battle-float' : ''}`} emojiClassName="text-8xl" />
            </div>
          </div>

          {phase !== 'reveal' ? (
            <p className="text-white font-bold text-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Sealing the bond...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-white font-bold text-xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{monster.name}</p>
                <p className="text-xs text-[#e8d0a0] capitalize mt-1">{monster.element} · {monster.archetype.replace('_', ' ')}</p>
              </div>

              <p className="text-sm text-[#f5f0e8]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                <span className={`font-bold ${isTala ? 'text-pink-300' : 'text-amber-300'}`}>{monster.name}</span> has chosen you! Added to your Curio Arena collection.
              </p>

              <div className="space-y-1.5 text-left max-w-[200px] mx-auto">
                {STAT_ROWS.map((row, i) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between text-xs battle-panel-in"
                    style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'backwards' }}
                  >
                    <span className="text-[#e8d0a0] flex items-center gap-1">
                      <img src={row.icon} alt="" className="w-3.5 h-3.5 object-contain" /> {row.label}
                    </span>
                    <span className="text-white font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{scaled[row.key]}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onComplete}
                className={`w-full py-3 rounded-xl font-bold text-white btn-tactile battle-panel-in ${
                  isTala ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
                style={{ animationDelay: `${STAT_ROWS.length * 120}ms`, animationFillMode: 'backwards' }}
              >
                Begin Your Adventure!
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
