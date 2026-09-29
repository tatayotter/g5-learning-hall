'use client';
// components/battle/CoinToss.tsx
// Speed-tie coin toss shown over the battle stage (inside .bstage-stage, so
// it sits over the curios in both layouts, under the HP cards). Purely
// presentational — the screens decide the winner (lib/coinToss.ts) and show
// this for one battle beat (BATTLE_BEAT_MS). Timeline (CSS, .bcoin-* in
// app/globals.css): title pops in, the coin arcs up spinning with each
// curio on a face, lands on the winner's face (~1.4s), result text follows.
import type { CSSProperties } from 'react';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { COIN_TOSS_TITLE } from '@/lib/coinToss';

// Set to null between tosses, so each toss mounts fresh and replays the
// animation.
export interface CoinTossState {
  leftSpriteUrl: string;
  rightSpriteUrl: string;
  winner: 'left' | 'right';
  resultText: string;
}

function Outlined({ text, size, color = '#ffffff' }: { text: string; size: number; color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: size, lineHeight: 1.15 }}>
      <span aria-hidden style={questTextShadowStyle}>{text}</span>
      <span style={{ ...questTextStyle, color }}>{text}</span>
    </span>
  );
}

function Face({ src, back, mirrored }: { src: string; back?: boolean; mirrored?: boolean }) {
  return (
    <span className={`bcoin-face ${back ? 'bcoin-face-back' : ''}`}>
      <img src={src} alt="" draggable={false} style={mirrored ? { transform: 'scaleX(-1)' } : undefined} />
    </span>
  );
}

export default function CoinToss({ toss }: { toss: CoinTossState }) {
  // Five full turns, then land on the winner's face (back face = +180deg).
  const end = toss.winner === 'left' ? 1800 : 1980;
  return (
    <div className="bcoin" role="status" aria-live="polite" aria-label={toss.resultText}>
      <div className="bcoin-title"><Outlined text={COIN_TOSS_TITLE} size={22} color="#fcd34d" /></div>
      <div className="bcoin-arc">
        <div className="bcoin-coin" style={{ '--bc-end': `${end}deg` } as CSSProperties}>
          <Face src={toss.leftSpriteUrl} />
          <Face src={toss.rightSpriteUrl} back mirrored />
        </div>
      </div>
      <div className="bcoin-shadow" />
      <div className="bcoin-result"><Outlined text={toss.resultText} size={16} /></div>
    </div>
  );
}
