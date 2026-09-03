'use client';
// Full-screen "Tutor roll" ceremony — fired from CompendiumPanel once the
// tutor_curio RPC has already resolved. Mirrors DailyBonusModal's charge ->
// reveal beat, but branches the reveal on success/fail: a success flashes the
// glow color of the NEW tier and bursts a CelebrationOverlay; a fail stays
// muted with no burst, since it's the common outcome (68.8%+ base chance)
// and shouldn't feel punishing for a Grade 5 audience with no pity system.
import { useEffect, useState } from 'react';
import { QUALITY_LABEL, getQualityGlowClass } from '@/lib/curioQuality';
import { TutorOutcome } from '@/lib/tutorCurio';
import { MonsterDef, getScaledStats } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { playRerollSpin, playCurioLevelUp, playMiss } from '@/lib/sounds';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface TutorRollModalProps {
  outcome: TutorOutcome;
  monsterName: string;
  def: MonsterDef;
  monsterLevel: number;
  userId: string;
  onClose: () => void;
}

type Phase = 'charge' | 'reveal';

export default function TutorRollModal({ outcome, monsterName, def, monsterLevel, userId, onClose }: TutorRollModalProps) {
  const isTala = userId === 'tala';
  const [phase, setPhase] = useState<Phase>('charge');
  const [burst, setBurst] = useState(false);

  const success = outcome.success && outcome.new_quality;
  // The glow shown on the curio's sprite here — its NEW quality on a
  // success, its unchanged current quality on a fail (never blank), so the
  // reveal always shows the real, present state of the actual curio.
  const displayedQuality = success ? outcome.new_quality! : outcome.previous_quality!;
  const beforeStats = getScaledStats(def, monsterLevel, outcome.previous_quality);
  const afterStats = success ? getScaledStats(def, monsterLevel, outcome.new_quality) : null;

  useEffect(() => {
    playRerollSpin();
    const t = setTimeout(() => {
      setPhase('reveal');
      if (success) {
        playCurioLevelUp();
        setBurst(true);
      } else {
        playMiss();
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onClose();
  };

  const accentClass = success ? getQualityGlowClass(outcome.new_quality!) : '';
  const flashColorClass = success
    ? outcome.new_quality === 'good' ? 'bg-green-400'
      : outcome.new_quality === 'outstanding' ? 'bg-cyan-400'
      : 'bg-orange-400'
    : 'bg-neutral-500';
  // Ring color signals the outcome the same way the old border-color swap
  // did, just moved onto the wood panel's gold-ring boxShadow layer instead.
  const ringColor = success
    ? outcome.new_quality === 'good' ? '#16a34a'
      : outcome.new_quality === 'outstanding' ? '#06b6d4'
      : '#f97316'
    : isTala ? '#f472b6' : '#a8a29e';
  const headlineColor = success ? '#f5c542' : (isTala ? '#f9a8d4' : '#d6d3d1');

  return (
    <>
      {success && <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />}
      <div
        className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in"
          style={{ boxShadow: `0 0 0 3px ${ringColor}, ${questButtonDropShadow}`, ...woodTextureStyle }}
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
              <span aria-hidden style={questTextShadowStyle}>Curio Tutoring</span>
              <span style={{ ...questTextStyle, color: headlineColor }}>Curio Tutoring</span>
            </span>
          </p>

          <div className="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
            {phase === 'charge' && (
              <div className="absolute inset-0 rounded-full claim-orb-pulse bg-indigo-500/60" />
            )}
            {phase === 'reveal' && (
              <div className={`absolute inset-0 rounded-full graduation-glow-flash ${flashColorClass}`} />
            )}
            <div className={`relative w-16 h-16 transition-opacity duration-200 ${phase === 'charge' ? 'opacity-0' : `opacity-100 battle-float ${getQualityGlowClass(displayedQuality)}`}`}>
              <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-5xl" />
            </div>
          </div>

          {phase !== 'reveal' ? (
            <p className="text-white font-bold text-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              Consulting the tutor...
            </p>
          ) : success ? (
            <div className="space-y-4">
              <div>
                <p className="text-white font-bold text-xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{monsterName}</p>
                <p className="text-2xl font-bold mt-1 text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                  → {QUALITY_LABEL[outcome.new_quality!]}!
                </p>
                <p className="text-[#e8d0a0] text-xs mt-1">HP and Attack permanently increased.</p>
                {afterStats && (
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                      <img src="/icons/stats/hp.svg" alt="" className="w-3.5 h-3.5 object-contain" />
                      {beforeStats.hp} <span className="text-green-400">→ {afterStats.hp}</span>
                    </span>
                    <span className="flex items-center gap-1 text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                      <img src="/icons/stats/atk.svg" alt="" className="w-3.5 h-3.5 object-contain" />
                      {beforeStats.attack} <span className="text-green-400">→ {afterStats.attack}</span>
                    </span>
                  </div>
                )}
              </div>
              <GameButton variant="quest" color="#d97706" onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
                Awesome!
              </GameButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-white font-bold text-lg" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>No change this time</p>
                <p className="text-[#e8d0a0] text-xs mt-1">{monsterName} stays {QUALITY_LABEL[outcome.previous_quality!]}. Try again anytime.</p>
              </div>
              <GameButton variant="quest" color="#78716c" onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
                Okay
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
