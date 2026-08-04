'use client';
// Full-screen "new skill learned" ceremony — fired from the Compendium's
// Teach a Skill action (see CompendiumPanel.handleLearn) once
// learnMonsterSkill has already succeeded. Mirrors StarterClaimModal's
// charge -> flash -> reveal beat, scaled down to a single skill icon
// instead of a whole monster sprite.
import { useEffect, useState } from 'react';
import { Skill, MonsterDef, getSkillIconSrc } from '@/lib/monsterConfig';
import { playCurioLevelUp } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import CelebrationOverlay from '@/components/CelebrationOverlay';

interface TeachSkillModalProps {
  monster: MonsterDef;
  skill: Skill;
  userId: string;
  onClose: () => void;
}

type Phase = 'charge' | 'reveal';

export default function TeachSkillModal({ monster, skill, userId, onClose }: TeachSkillModalProps) {
  const isTala = userId === 'tala';
  const [phase, setPhase] = useState<Phase>('charge');
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('reveal');
      playCurioLevelUp();
      setBurst(true);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const handleBackdropClick = () => {
    if (phase === 'reveal') onClose();
  };

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="levelup" />
      <div
        className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className={`relative bg-neutral-900 border-2 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in ${
            isTala ? 'border-pink-500' : 'border-amber-500'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-400' : 'text-amber-400'}`}>
            📜 NEW SKILL LEARNED 📜
          </p>

          <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            {phase === 'charge' && (
              <div className={`absolute inset-0 rounded-full claim-orb-pulse ${isTala ? 'bg-pink-500/60' : 'bg-amber-500/60'}`} />
            )}
            {phase === 'reveal' && (
              <div className={`absolute inset-0 rounded-full graduation-glow-flash ${isTala ? 'bg-pink-400' : 'bg-amber-400'}`} />
            )}
            <img
              src={getSkillIconSrc(skill)}
              alt=""
              className={`relative w-14 h-14 object-contain transition-opacity duration-200 ${phase === 'charge' ? 'opacity-0' : 'opacity-100 battle-float'}`}
            />
          </div>

          {phase !== 'reveal' ? (
            <p className="text-white font-bold text-lg">Inscribing the scroll...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-white font-bold text-xl">{skill.name}</p>
                <p className="text-xs text-gray-500 mt-1">{skill.description}</p>
              </div>
              <p className="text-sm text-gray-400">
                <span className="font-bold text-white">{monster.name}</span> learned{' '}
                <span className={`font-bold ${isTala ? 'text-pink-400' : 'text-amber-400'}`}>{skill.name}</span>!
              </p>
              <div className="flex justify-center">
                <MonsterImage monster={monster} className="w-16 h-16" emojiClassName="text-5xl" />
              </div>
              <button
                onClick={onClose}
                className={`w-full py-3 rounded-xl font-bold text-white btn-tactile battle-panel-in ${
                  isTala ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Nice!
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
