// components/battle/MonsterHpPanel.tsx
// HP card for the battle stage's hp-row — name/level, HP bar, status badge.
// Sprite rendering lives in BattleStage's Creature (positioned on the stage,
// not the card) since the redesigned layout separates "who's fighting" (the
// stage) from "how are they doing" (this card).
import { STATUS_DEFINITIONS, StatusEffect } from '@/lib/monsterConfig';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

interface MonsterHpPanelProps {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  status: StatusEffect;
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
// brown gradient base — no image asset needed.
const woodTextureStyle: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(94deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 4px), ' +
    'repeating-linear-gradient(94deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 9px), ' +
    'linear-gradient(160deg, #a5713f 0%, #8a5a2e 45%, #6b431e 100%)',
};

// A small flat metal nail head — solid fill, thin outline, tiny off-center
// dot for the screw detail — deliberately flat (no gradient/bevel) to read
// as a 2D icon rather than a 3D stud.
function Nail({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-2.5 h-2.5 rounded-full bg-[#d4a017] border border-[#8a6a0e] ${className}`}
    >
      <span className="absolute top-[3px] left-[3px] w-[3px] h-[3px] rounded-full bg-[#8a6a0e]" />
    </span>
  );
}

export default function MonsterHpPanel({ name, level, currentHp, maxHp, status }: MonsterHpPanelProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const nameLabel = `${name} Lv.${level}`;
  return (
    <div
      className="bstage-hp-card relative border-2 border-[#4a2f18] rounded-lg px-3 py-2"
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
      <p
        className="text-center leading-tight mb-1 truncate"
        style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 15 }}
      >
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>{nameLabel}</span>
          <span style={questTextStyle}>{nameLabel}</span>
        </span>
      </p>
      <div className="relative h-[18px] bg-[#0a0807] border-2 border-[#ffffff] rounded-full overflow-hidden">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        <p
          className="absolute inset-0 flex items-center justify-center text-[#ffffff] text-[10px] leading-none"
          style={{
            fontFamily: questButtonFontFamily,
            letterSpacing: questButtonLetterSpacing,
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          {Math.max(0, currentHp)}/{maxHp} HP
        </p>
      </div>
      {status && (
        <div className="flex justify-center mt-1">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border"
            style={{
              fontFamily: questButtonFontFamily,
              letterSpacing: questButtonLetterSpacing,
              background: STATUS_PILL_COLORS[status].bg,
              borderColor: STATUS_PILL_COLORS[status].border,
              color: STATUS_PILL_COLORS[status].text,
            }}
          >
            <img src={STATUS_DEFINITIONS[status].iconSrc} alt={status} className="w-3.5 h-3.5 object-contain" />
            {STATUS_DEFINITIONS[status].label}
          </span>
        </div>
      )}
    </div>
  );
}
