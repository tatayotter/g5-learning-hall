// components/quest/VisualAid.tsx
//
// Renders an optional `visual_aid` spec (lib/visualAid.ts) attached to a
// quest's questData as themed inline SVG. Renders nothing when `spec` is
// absent/undefined — every existing content package has no `visual_aid` key
// and must keep rendering exactly as before.
//
// Colors/layout are owned entirely by this file (parchment tokens from
// docs/STYLE_GUIDE.md) — the spec only ever supplies content (labels, order,
// counts), never coordinates or colors. That's what keeps every generated
// diagram on-theme regardless of what the LLM produces.
import type { VisualAid as VisualAidSpec, CycleAid, StepsAid, BarCompareAid } from '@/lib/visualAid';

const CARD_FILL = '#f0ddb8';
const HEAVY_BORDER = '#8b5e2a';
const BORDER = '#c9a87a';
const GOLD = '#c9781a';
const INSET = '#e8d0a0';
const TEXT_DARK = '#2a1505';
const TEXT_BODY = '#3a2610';
const TEXT_MUTED = '#6b4820';
const BAR_COLORS = [GOLD, '#2f7a3d', '#3a6ea5'];

function ArrowMarker({ id }: { id: string }) {
  return (
    <marker id={id} markerWidth="9" markerHeight="9" refX="5" refY="4" orient="auto">
      <path d="M0,0 L9,4 L0,8 z" fill={GOLD} />
    </marker>
  );
}

function renderCycle(spec: CycleAid) {
  const n = Math.max(3, Math.min(6, spec.nodes.length));
  const nodes = spec.nodes.slice(0, n);
  const width = 640;
  const height = n <= 4 ? 380 : 440;
  const cx = width / 2;
  const cy = height / 2 + 10;
  const radius = n <= 4 ? 150 : 170;
  const nodeR = 56;

  const positions = nodes.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // start at top
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height + 40}`} className="w-full h-auto">
      <defs><ArrowMarker id="cycle-arrow" /></defs>
      <text x={cx} y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill={TEXT_DARK}>{spec.title}</text>

      {positions.map((p, i) => {
        const next = positions[(i + 1) % n];
        // Pull the curve control point toward the center so arrows read as a loop, not straight chords.
        const midX = (p.x + next.x) / 2 + (cx - (p.x + next.x) / 2) * 0.25;
        const midY = (p.y + next.y) / 2 + (cy - (p.y + next.y) / 2) * 0.25;
        // Shorten the path so it starts/ends at each node's edge, not its center.
        const dx1 = midX - p.x, dy1 = midY - p.y;
        const len1 = Math.hypot(dx1, dy1) || 1;
        const startX = p.x + (dx1 / len1) * nodeR;
        const startY = p.y + (dy1 / len1) * nodeR;
        const dx2 = next.x - midX, dy2 = next.y - midY;
        const len2 = Math.hypot(dx2, dy2) || 1;
        const endX = next.x - (dx2 / len2) * nodeR;
        const endY = next.y - (dy2 / len2) * nodeR;
        return (
          <path key={`arrow-${i}`} d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
            fill="none" stroke={GOLD} strokeWidth="3" markerEnd="url(#cycle-arrow)" />
        );
      })}

      {positions.map((p, i) => (
        <g key={`node-${i}`}>
          <circle cx={p.x} cy={p.y} r={nodeR} fill="#ffffff" stroke={BORDER} strokeWidth="2" />
          {nodes[i].icon && <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="26">{nodes[i].icon}</text>}
          <text x={p.x} y={p.y + (nodes[i].icon ? 20 : 6)} textAnchor="middle" fontSize="13" fontWeight="bold" fill={TEXT_DARK}>
            {i + 1}. {nodes[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function renderSteps(spec: StepsAid) {
  const steps = spec.steps.slice(0, 6);
  const boxH = 64;
  const gap = 20;
  const width = 640;
  const topPad = spec.expression ? 84 : 56;
  const height = topPad + steps.length * (boxH + gap);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs><ArrowMarker id="steps-arrow" /></defs>
      <text x={width / 2} y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill={TEXT_DARK}>{spec.title}</text>
      {spec.expression && (
        <text x={width / 2} y="54" textAnchor="middle" fontSize="14" fill={TEXT_BODY}>{spec.expression}</text>
      )}

      {steps.map((s, i) => {
        const y = topPad + i * (boxH + gap);
        return (
          <g key={i}>
            <rect x={40} y={y} width={width - 80} height={boxH} rx={8} fill="#ffffff" stroke={BORDER} strokeWidth="2" />
            <circle cx={70} cy={y + boxH / 2} r={16} fill={GOLD} />
            <text x={70} y={y + boxH / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#ffffff">{i + 1}</text>
            <text x={100} y={y + boxH / 2 - 6} fontSize="14" fontWeight="bold" fill={TEXT_DARK}>{s.label}</text>
            <text x={100} y={y + boxH / 2 + 16} fontSize="13" fill={TEXT_BODY}>{s.detail}</text>
            {i < steps.length - 1 && (
              <path d={`M ${width / 2} ${y + boxH + 2} L ${width / 2} ${y + boxH + gap - 2}`}
                stroke={GOLD} strokeWidth="3" markerEnd="url(#steps-arrow)" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderBarCompare(spec: BarCompareAid) {
  const bars = spec.bars.slice(0, 3);
  const width = 640;
  const barH = 36;
  const rowGap = 60;
  const topPad = 56;
  const height = topPad + bars.length * rowGap + 70;
  const barStartX = 160;
  const barMaxWidth = 380;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <text x={width / 2} y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill={TEXT_DARK}>{spec.title}</text>

      {bars.map((bar, i) => {
        const y = topPad + i * rowGap;
        const parts = Math.max(1, bar.totalParts);
        const segW = barMaxWidth / parts;
        const color = BAR_COLORS[i % BAR_COLORS.length];
        return (
          <g key={i}>
            <text x={barStartX - 20} y={y + barH / 2 + 5} textAnchor="end" fontSize="15" fontWeight="bold" fill={TEXT_BODY}>
              {bar.label}
            </text>
            {Array.from({ length: parts }).map((_, seg) => (
              <rect key={seg}
                x={barStartX + seg * segW} y={y}
                width={segW} height={barH}
                fill={seg < bar.filledParts ? color : '#ffffff'}
                stroke={HEAVY_BORDER} strokeWidth="2" />
            ))}
            <text x={barStartX + barMaxWidth + 16} y={y + barH / 2 + 5} fontSize="12" fill={TEXT_MUTED}>
              {bar.filledParts} of {parts} parts
            </text>
          </g>
        );
      })}

      <rect x={60} y={topPad + bars.length * rowGap + 4} width={width - 120} height={54} rx={8}
        fill={INSET} fillOpacity="0.6" stroke={BORDER} strokeWidth="2" />
      <text x={width / 2} y={topPad + bars.length * rowGap + 36} textAnchor="middle" fontSize="16" fontWeight="bold" fill={TEXT_DARK}>
        {spec.verdict}
      </text>
    </svg>
  );
}

export default function VisualAid({ spec }: { spec?: VisualAidSpec | null }) {
  if (!spec) return null;

  let content: React.ReactNode;
  switch (spec.type) {
    case 'cycle': content = renderCycle(spec); break;
    case 'steps': content = renderSteps(spec); break;
    case 'bar-compare': content = renderBarCompare(spec); break;
    default: return null;
  }

  return (
    <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: CARD_FILL, border: `1px solid ${HEAVY_BORDER}` }}>
      {content}
    </div>
  );
}
