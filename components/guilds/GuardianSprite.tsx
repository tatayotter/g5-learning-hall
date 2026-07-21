'use client';
import { useState, useEffect } from 'react';

export type GuardianGuild = 'lorekeeper' | 'spellcaster' | 'numberrealm' | 'logiclabyrinth' | 'lexiconarena';
export type GuardianPose = 'idle' | 'hurt' | 'defeated';

const POSE_SUFFIX: Record<GuardianPose, string> = {
  idle: '',
  hurt: '_damage',
  defeated: '_lose',
};

interface GuardianSpriteProps {
  guild: GuardianGuild;
  pose: GuardianPose;
  className?: string;
  animate?: boolean;
}

export default function GuardianSprite({ guild, pose, className = '', animate = true }: GuardianSpriteProps) {
  const [failed, setFailed] = useState(false);
  const src = `/sidequests/${guild}${POSE_SUFFIX[pose]}.webp`;

  // Reset the broken-image fallback whenever we switch sprite source
  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-neutral-950 text-neutral-700 text-4xl ${className}`}>
        ?
      </div>
    );
  }

  const poseClass = !animate ? '' : pose === 'hurt' ? 'battle-hit' : pose === 'idle' ? 'battle-float' : '';

  return (
    <img
      key={pose}
      src={src}
      alt={`${guild} guardian — ${pose}`}
      className={`object-contain ${poseClass} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
