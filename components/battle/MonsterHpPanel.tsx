// components/battle/MonsterHpPanel.tsx
// HP card for the battle stage's hp-row — trainer, name/level, status, HP bar.
// The curios themselves are drawn by the Phaser stage (BattleCanvas); this
// card only answers "how are they doing".
import { STATUS_DEFINITIONS, StatusEffect } from '@/lib/monsterConfig';
import { QUALITY_LABEL, QUALITY_NAME_COLOR, type QualityTier } from '@/lib/curioQuality';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

interface MonsterHpPanelProps {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
  // Trainer/player name, shown small beside the curio name (replaces the
  // stage's old separate corner name tags).
  trainerName?: string;
  side?: 'left' | 'right';
  // One entry per curio on this side's team, in team order — drawn as dots
  // beside the HP bar (filled = can still fight, ringed = on the field,
  // hollow = fainted). Omit to hide.
  team?: { fainted: boolean; active: boolean }[];
  // Curio quality tier, shown as the name's fill color (QUALITY_NAME_COLOR)
  // — the battle stage has no quality glow behind the sprite anymore.
  // Absent for NPC-trainer curios, which render as 'normal' (white).
  quality?: QualityTier;
}

// Pill tint per status — debuffs lean warm/hostile, buffs lean cool/positive,
// each keyed to the effect's own emoji/theme rather than one flat neutral.
// Text colors are dark/saturated (not the usual dark-mode pastel) since the
// pill sits on a solid light fill rather than a dark or transparent one.
const STATUS_PILL_COLORS: Record<NonNullable<StatusEffect>, { bg: string; border: string; text: string }> = {
  burn:      { bg: '#fecaca', border: '#ef4444', text: '#b91c1c' },
  paralyze:  { bg: '#fef08a', border: '#eab308', text: '#a16207' },
  curse:     { bg: '#ddd6fe', border: '#8b5cf6', text: '#6d28d9' },
  blessed:   { bg: '#fef9c3', border: '#facc15', text: '#a16207' },
  def_boost: { bg: '#bfdbfe', border: '#3b82f6', text: '#1d4ed8' },
  atk_boost: { bg: '#fed7aa', border: '#f97316', text: '#c2410c' },
  revive:    { bg: '#bbf7d0', border: '#22c55e', text: '#15803d' },
};

// CSS-only wood grain: two layers of fine repeating streaks (dark + a
// lighter one offset in spacing so they don't just cancel out) over a warm
// brown gradient base — no image asset needed. Exported (alongside Nail
// below) so other battle-adjacent surfaces (e.g. PostBattleSummary) can
// reuse the exact same wood/gold-nail frame instead of re-deriving it
// (2026-08-29).
export const woodTextureStyle: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(94deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 4px), ' +
    'repeating-linear-gradient(94deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 9px), ' +
    'linear-gradient(160deg, #a5713f 0%, #8a5a2e 45%, #6b431e 100%)',
};

// A small flat metal nail head — solid fill, thin outline, tiny off-center
// dot for the screw detail — deliberately flat (no gradient/bevel) to read
// as a 2D icon rather than a 3D stud. Exported — see woodTextureStyle above.
export function Nail({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-2.5 h-2.5 rounded-full bg-[#d4a017] border border-[#8a6a0e] ${className}`}
    >
      <span className="absolute top-[3px] left-[3px] w-[3px] h-[3px] rounded-full bg-[#8a6a0e]" />
    </span>
  );
}

export default function MonsterHpPanel({ name, level, currentHp, maxHp, status, trainerName, side = 'left', team, quality }: MonsterHpPanelProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const nameLabel = `${name} Lv.${level}`;
  const mirrored = side === 'right';
  // Compact single-row HUD (2026-09-26): name + status on one line over a
  // thin bar, ~44px tall, pinned to the stage's top edge — the old two-row
  // card (plus a separate trainer-name tag row) reached y≈97 and covered
  // the heads of large/huge curios. The trainer's name folds into this card.
  // The right card mirrors its row order so both read outward-in.
  return (
    <div
      className="bstage-hp-card relative border-2 border-[#4a2f18] rounded-lg px-3 pt-[5px] pb-[6px]"
      style={{
        fontSize: 16,
        boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`,
        ...woodTextureStyle,
      }}
    >
      <Nail className="top-1 left-1" />
      <Nail className="top-1 right-1" />
      <Nail className="bottom-1 left-1" />
      <Nail className="bottom-1 right-1" />
      <div className={`flex items-center gap-1.5 mb-[3px] px-2 min-w-0 ${mirrored ? 'flex-row-reverse' : ''}`}>
        {trainerName && (
          <span className="shrink-0 max-w-[40%] truncate text-[10px] font-bold uppercase tracking-wide text-[#f3dfb4]">
            {trainerName}
          </span>
        )}
        <p
          className={`min-w-0 flex-1 truncate leading-tight ${mirrored ? 'text-right' : 'text-left'}`}
          style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 13 }}
          title={quality && quality !== 'normal' ? `${QUALITY_LABEL[quality]} quality` : undefined}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>{nameLabel}</span>
            <span style={{ ...questTextStyle, color: QUALITY_NAME_COLOR[quality ?? 'normal'] }}>{nameLabel}</span>
          </span>
          {quality && quality !== 'normal' && <span className="sr-only"> ({QUALITY_LABEL[quality]} quality)</span>}
        </p>
        {status && (
          <span
            className="shrink-0 flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] border"
            style={{
              fontFamily: questButtonFontFamily,
              letterSpacing: questButtonLetterSpacing,
              background: STATUS_PILL_COLORS[status].bg,
              borderColor: STATUS_PILL_COLORS[status].border,
              color: STATUS_PILL_COLORS[status].text,
            }}
          >
            <img src={STATUS_DEFINITIONS[status].iconSrc} alt="" className="w-3 h-3 object-contain" />
            {STATUS_DEFINITIONS[status].label}
          </span>
        )}
      </div>
      <div className={`flex items-center gap-1.5 ${mirrored ? 'flex-row-reverse' : ''}`}>
      {team && team.length > 1 && <TeamDots team={team} mirrored={mirrored} />}
      <div className="relative flex-1 h-[15px] bg-[#0a0807] border-2 border-[#ffffff] rounded-full overflow-hidden">
        {/* Trail: lags behind the real bar so a hit reads as a chunk being lost */}
        <div className="absolute inset-y-0 left-0 bg-[#fde68a]/80 hp-trail" style={{ width: `${pct}%` }} />
        <div
          className="absolute inset-y-0 left-0 hp-fill"
          style={{
            width: `${pct}%`,
            background: pct > 50
              ? 'linear-gradient(180deg,#86efac 0%,#22c55e 55%,#15803d 100%)'
              : pct > 25
                ? 'linear-gradient(180deg,#fde047 0%,#eab308 55%,#a16207 100%)'
                : 'linear-gradient(180deg,#fca5a5 0%,#ef4444 55%,#991b1b 100%)',
          }}
        />
        {/* Gloss highlight */}
        <div className="absolute inset-x-1 top-[2px] h-[3px] rounded-full bg-white/35 pointer-events-none" />
        <p
          className="absolute inset-0 flex items-center justify-center text-[#ffffff] text-[9px] leading-none"
          style={{
            fontFamily: questButtonFontFamily,
            letterSpacing: questButtonLetterSpacing,
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          {Math.max(0, currentHp)}/{maxHp} HP
        </p>
      </div>
      </div>
    </div>
  );
}

// Team roster dots. Order runs outward-in like the rest of the card, so on
// the right card the first team slot sits at the far right edge.
function TeamDots({ team, mirrored }: { team: { fainted: boolean; active: boolean }[]; mirrored: boolean }) {
  const left = team.filter(t => !t.fainted).length;
  return (
    <span
      className={`shrink-0 flex items-center gap-[3px] ${mirrored ? 'flex-row-reverse' : ''}`}
      role="img"
      aria-label={`${left} of ${team.length} curios left`}
      title={`${left} of ${team.length} curios left`}
    >
      {team.map((t, i) => (
        <span
          key={i}
          className={`block rounded-full border ${
            t.fainted
              ? 'w-[8px] h-[8px] border-[#c9a87a]/70 bg-transparent'
              : t.active
                ? 'w-[10px] h-[10px] border-[#ffffff] bg-[#f5c542] shadow-[0_0_0_1px_#4a2f18]'
                : 'w-[8px] h-[8px] border-[#4a2f18] bg-[#f5c542]'
          }`}
        />
      ))}
    </span>
  );
}
