'use client';
// Full-screen "you got a new curio" reveal — fired the first time a species
// is ever added to a player's collection (wild catch, guild companion grant,
// or event reward), never for a duplicate/already-owned species.
import { useEffect, useState } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { playCurioCaught } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface CurioRevealModalProps {
  monster: MonsterDef;
  userId: string;
  onClose: () => void;
}

export default function CurioRevealModal({ monster, userId, onClose }: CurioRevealModalProps) {
  const isTala = userId === 'tala';
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    playCurioCaught();
    setBurst(true);
  }, []);

  return (
    <>
      <CelebrationOverlay userId={userId} trigger={burst} type="curio" />
      <div
        className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
        onClick={onClose}
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
              <span aria-hidden style={questTextShadowStyle}>NEW CURIO OBTAINED!</span>
              <span style={{ ...questTextStyle, color: isTala ? '#f9a8d4' : '#f5c542' }}>NEW CURIO OBTAINED!</span>
            </span>
          </p>
          <div className="flex justify-center mb-4">
            <MonsterImage monster={monster} className="w-28 h-28 battle-float" emojiClassName="text-8xl" />
          </div>
          <p className="text-white font-bold text-xl mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{monster.name}</p>
          <p className="text-xs text-[#e8d0a0] capitalize mb-6">{monster.element} · {monster.archetype}</p>
          <p className="text-sm text-[#f5f0e8] mb-6" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Added to your Curio Arena collection!</p>
          <GameButton variant="quest" color={isTala ? '#db2777' : '#d97706'} onClick={onClose} className="w-full" style={{ fontSize: 15 }}>
            Awesome!
          </GameButton>
        </div>
      </div>
    </>
  );
}
