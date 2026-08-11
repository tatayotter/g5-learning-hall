'use client';
import type { CSSProperties } from 'react';
// components/BossMistOverlay.tsx
// Game-wide animated mist that thins as the player defeats more term-boss
// personas — the CSS drift/scale layers approved in the earlier design demo,
// styled via app/globals.css (.boss-mist-layer*) to match this codebase's
// existing convention of battle/effect CSS living in globals.css rather than
// styled-jsx, which has no precedent elsewhere here. Only rendered while the
// boss event is active AND the player hasn't cleared everyone — unmounts
// entirely on full clear, per the locked "ends per-player" decision.
//
// Mounted from app/page.tsx rather than app/layout.tsx: this codebase has no
// React Context anywhere, and page.tsx is the single SPA shell every tab
// renders inside, so this still reads as "game-wide" for the whole play
// experience without introducing a new architectural pattern.
export default function BossMistOverlay({ defeated, total }: { defeated: number; total: number }) {
  if (total <= 0 || defeated >= total) return null;

  const density = Math.max(0.08, 1 - defeated / total);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[72] overflow-hidden"
      style={{ '--mist-density': density } as CSSProperties}
      aria-hidden="true"
    >
      <div className="boss-mist-layer boss-mist-layer--a" />
      <div className="boss-mist-layer boss-mist-layer--b" />
      <div className="boss-mist-layer boss-mist-layer--c" />
    </div>
  );
}
