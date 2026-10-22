'use client';
// Thumbnail of a curio's trading card (components/monster/CurioCard.tsx) for
// lists and grids: the curio picker, My Team, Training Missions and the
// Compendium. Same frame foil, element colors and quality symbol as the full
// card, cut down to name, art, level, HP and element. `mystery` draws the
// face-down version for a curio the player hasn't met yet: a black silhouette
// and "???", nothing that names the species.
import { useState } from 'react';
import { ELEMENT_ICON_SRC, MonsterDef } from '@/lib/monsterConfig';
import { QualityTier, QUALITY_LABEL, getQualityGlowClass } from '@/lib/curioQuality';
import { MonsterImage, LegendaryBadge } from '@/components/battle/shared';
import { ELEMENT_THEME, ELEMENT_NAME, QUALITY_FRAME, LEGENDARY_FRAME, QUALITY_SYMBOL } from '@/components/monster/CurioCard';
import { questButtonFontFamily, questButtonLetterSpacing } from '@/components/GameButton';

// Renders a monster's sprite as a flat black silhouette — deliberately
// bypasses MonsterImage so the emoji fallback can't leak a hint about the
// mystery species underneath. Callers overlay their own LegendaryBadge
// (isLegendary is safe to reveal — it doesn't identify the species).
export function MonsterSilhouette({ id, className = '' }: { id: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-neutral-950 text-neutral-700 text-2xl ${className}`}>
        ?
      </div>
    );
  }
  return (
    <img
      src={`/monsters/${id}.webp`}
      alt="???"
      className={`object-contain ${className}`}
      style={{ filter: 'brightness(0)', opacity: 0.55 }}
      onError={() => setFailed(true)}
    />
  );
}

const MYSTERY_FRAME = 'linear-gradient(135deg, #78716c 0%, #44403c 50%, #57534e 100%)';

export default function MiniCurioCard({
  def, mystery = false, level, quality, hp, name, tag, note, selected = false, dimmed = false,
}: {
  def: MonsterDef;
  mystery?: boolean;         // not met yet: silhouette + "???"
  level?: number;
  quality?: QualityTier;     // owned curios; drives the frame foil and the symbol
  hp?: number;
  name?: string;             // a nickname, if the curio has one
  tag?: string;              // small ribbon on top, e.g. "Active", "Slot 1"
  note?: string;             // small line under the card face, e.g. "Bench"
  selected?: boolean;
  dimmed?: boolean;          // e.g. a locked or away-on-mission curio
}) {
  const theme = ELEMENT_THEME[def.element];
  const tier = quality ?? 'normal';
  const frame = mystery ? MYSTERY_FRAME : def.isLegendary ? LEGENDARY_FRAME : QUALITY_FRAME[tier];
  const shownName = mystery ? '???' : (name || def.name);
  return (
    <div
      className={`mini-curio-card relative w-full rounded-[11px] p-[4px] ${dimmed ? 'opacity-60' : ''}`}
      style={{
        background: frame,
        boxShadow: selected
          ? '0 0 0 3px #22c55e, 0 6px 14px rgba(0,0,0,0.35)'
          : '0 0 0 1.5px #4a2f18, 0 4px 10px rgba(0,0,0,0.3)',
      }}
      data-testid={mystery ? 'mini-curio-card-mystery' : 'mini-curio-card'}
    >
      {tag && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap text-[9px] font-black uppercase tracking-wider px-2 py-px rounded-full bg-[#2a1505] text-[#fde68a] border border-[#f5c542]"
        >
          {tag}
        </span>
      )}
      <div
        className="relative rounded-[8px] overflow-hidden flex flex-col gap-1 px-1.5 pt-1.5 pb-1"
        style={{
          background: mystery
            ? 'linear-gradient(180deg, #e7e5e4 0%, #a8a29e 100%)'
            : `linear-gradient(180deg, ${theme.top} 0%, ${theme.bottom} 100%)`,
          boxShadow: 'inset 0 0 0 1px rgba(74,47,24,0.45)',
        }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <p
            className={`flex-1 min-w-0 truncate leading-tight text-[#2a1505] ${shownName.length > 9 ? 'text-[9px]' : 'text-[11px]'}`}
            style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
            title={shownName}
          >
            {shownName}
          </p>
          {!mystery && (
            <img src={ELEMENT_ICON_SRC[def.element]} alt={ELEMENT_NAME[def.element]} className="w-4 h-4 object-contain flex-shrink-0" />
          )}
        </div>
        <div
          className="relative rounded-[5px] overflow-hidden"
          style={{
            aspectRatio: '1 / 1',
            background: mystery
              ? 'radial-gradient(circle at 50% 60%, #fafaf9 0%, #d6d3d1 60%, #a8a29e 100%)'
              : `radial-gradient(circle at 50% 60%, #ffffff 0%, ${theme.art} 55%, ${theme.bottom} 100%)`,
            boxShadow: '0 0 0 1.5px #c9a24a, 0 0 0 2.5px #4a2f18',
          }}
        >
          <div className="absolute inset-[8%]">
            {mystery ? (
              <MonsterSilhouette id={def.spriteId ?? def.id} className="w-full h-full" />
            ) : (
              <div className={`w-full h-full ${getQualityGlowClass(tier)}`}>
                <MonsterImage monster={{ ...def, isLegendary: false }} className="w-full h-full" emojiClassName="text-4xl" />
              </div>
            )}
          </div>
          {def.isLegendary && <LegendaryBadge />}
          {selected && (
            <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white text-xs font-black flex items-center justify-center shadow">✔</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 text-[10px] font-black text-[#2a1505] min-h-[14px]">
          {mystery ? (
            <span className="w-full text-center text-[#3a2610]/70 font-bold">Not met yet</span>
          ) : (
            <>
              <span>{level !== undefined ? `Lv.${level}` : ''}</span>
              {quality && <span className="text-[9px]" title={`${QUALITY_LABEL[quality]} quality`}>{QUALITY_SYMBOL[quality]}</span>}
              <span style={{ color: theme.ink }}>{hp !== undefined ? `HP ${hp}` : ''}</span>
            </>
          )}
        </div>
      </div>
      {note && <p className="text-center text-[9px] font-bold text-[#2a1505] mt-0.5 truncate">{note}</p>}
    </div>
  );
}
