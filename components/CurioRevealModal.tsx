'use client';
// Full-screen "you got a new curio" reveal — fired the first time a species
// is ever added to a player's collection (wild catch, guild companion grant,
// or event reward), never for a duplicate/already-owned species.
import { useEffect, useState } from 'react';
import { MonsterDef } from '@/lib/monsterConfig';
import { playCurioCaught } from '@/lib/sounds';
import { MonsterImage } from '@/components/battle/shared';
import CelebrationOverlay from '@/components/CelebrationOverlay';

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
          className={`bg-neutral-900 border-2 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center battle-panel-in ${
            isTala ? 'border-pink-500' : 'border-amber-500'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <p className={`font-bold text-sm tracking-wide mb-4 ${isTala ? 'text-pink-400' : 'text-amber-400'}`}>
            ✨ NEW CURIO OBTAINED! ✨
          </p>
          <div className="flex justify-center mb-4">
            <MonsterImage monster={monster} className="w-28 h-28 battle-float" emojiClassName="text-8xl" />
          </div>
          <p className="text-white font-bold text-xl mb-1">{monster.name}</p>
          <p className="text-xs text-gray-500 capitalize mb-6">{monster.element} · {monster.archetype}</p>
          <p className="text-sm text-gray-400 mb-6">Added to your Curio Arena collection!</p>
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-bold text-white btn-tactile ${
              isTala ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            Awesome!
          </button>
        </div>
      </div>
    </>
  );
}
