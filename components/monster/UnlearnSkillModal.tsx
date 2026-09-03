'use client';
// Lightweight "skill forgotten" beat — fired from the Compendium's Unlearn
// action (see CompendiumPanel.handleUnlearn) once unlearnMonsterSkill has
// already succeeded. Deliberately quieter than TeachSkillModal/
// StarterClaimModal (no charge/reveal stagger, no CelebrationOverlay burst)
// since losing a skill isn't a triumphant beat — just a dissolve animation
// on the old skill's icon so the loss still registers as an event.
import { useEffect, useState } from 'react';
import { Skill, MonsterDef, getSkillIconSrc } from '@/lib/monsterConfig';
import { playSkillForget } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface UnlearnSkillModalProps {
  monster: MonsterDef;
  skill: Skill;
  userId: string;
  onClose: () => void;
}

export default function UnlearnSkillModal({ monster, skill, userId, onClose }: UnlearnSkillModalProps) {
  const isTala = userId === 'tala';
  const [dissolved, setDissolved] = useState(false);

  useEffect(() => {
    playSkillForget();
    const t = setTimeout(() => setDissolved(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative border-2 border-[#4a2f18] rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in"
        style={{ boxShadow: `0 0 0 3px #8a6a3a, ${questButtonDropShadow}`, ...woodTextureStyle }}
        onClick={e => e.stopPropagation()}
      >
        {/* Same wood-plank + gold trim + corner-nail frame as the battle
            screen's MonsterHpPanel/PostBattleSummary, reusing its exported
            style pieces rather than re-deriving them — ring is muted brass
            rather than bright gold, matching this beat's deliberately
            quieter (non-celebratory) tone. */}
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <Nail className="bottom-2 left-2" />
        <Nail className="bottom-2 right-2" />
        <p
          className="text-sm tracking-wide mb-4"
          style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>SKILL FORGOTTEN</span>
            <span style={{ ...questTextStyle, color: '#d6d3d1' }}>SKILL FORGOTTEN</span>
          </span>
        </p>

        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <img
            src={getSkillIconSrc(skill)}
            alt=""
            className={`w-12 h-12 object-contain transition-all duration-700 ease-out ${
              dissolved ? 'opacity-0 scale-50 -translate-y-3 blur-sm' : 'opacity-100 scale-100'
            }`}
          />
        </div>

        <div className="space-y-4">
          <p className="text-sm text-[#f5f0e8]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
            <span className="font-bold text-white">{monster.name}</span> forgot{' '}
            <span className="font-bold text-[#e8d0a0]">{skill.name}</span>. That slot is open again.
          </p>
          <div className="flex justify-center">
            <MonsterImage monster={monster} className="w-16 h-16" emojiClassName="text-5xl" />
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-white btn-tactile bg-neutral-700 hover:bg-neutral-600"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
