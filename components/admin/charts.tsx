'use client';
// Lightweight SVG charts for the admin. Follows the dataviz method: thin 2px
// lines, 4px rounded bar ends anchored to the baseline, 2px gaps, hairline
// solid grid, one y-axis, legend for 2+ series, hover tooltip on every chart,
// and a table view so no number is color-only.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/components/admin/ui';

/* ── Shared ─────────────────────────────────────────────────────────────── */

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Round the axis max up to 1/2/5 x 10^k so ticks land on friendly numbers.
function niceScale(max: number, tickCount = 4) {
  if (max <= 0) return { max: tickCount, step: 1 };
  const raw = max / tickCount;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { max: Math.max(step * Math.ceil(max / step), step), step: Math.max(step, 1) };
}

const fmt = (n: number) => n.toLocaleString();

export interface Series {
  id: string;
  label: string;
  color: string;
  values: number[];
  /** Comparison series (e.g. previous period): drawn thinner in muted ink. */
  muted?: boolean;
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5 text-xs text-[var(--a-ink-2)]">
          <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function DataTable({ labels, series, formatLabel }: { labels: string[]; series: Series[]; formatLabel: (l: string) => string }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-[var(--a-border)]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[var(--a-surface-2)] text-[var(--a-muted)]">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            {series.map((s) => <th key={s.id} className="px-3 py-2 text-right font-medium">{s.label}</th>)}
          </tr>
        </thead>
        <tbody className="tabular-nums text-[var(--a-ink-2)]">
          {labels.map((l, i) => (
            <tr key={l} className="border-t border-[var(--a-border)]">
              <td className="px-3 py-1.5">{formatLabel(l)}</td>
              {series.map((s) => <td key={s.id} className="px-3 py-1.5 text-right">{fmt(s.values[i] ?? 0)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tooltip({ x, containerWidth, title, rows }: {
  x: number; containerWidth: number; title: string; rows: { label: string; value: number; color: string }[];
}) {
  const flip = x > containerWidth - 170;
  return (
    <div
      className="pointer-events-none absolute top-1 z-10 min-w-[140px] rounded-lg border border-[var(--a-border-strong)] bg-[var(--a-surface-2)] px-3 py-2 shadow-lg"
      style={flip ? { right: containerWidth - x + 12 } : { left: x + 12 }}
    >
      <p className="mb-1 text-[11px] font-medium text-[var(--a-muted)]">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[var(--a-ink-2)]">
            <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden />
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-[var(--a-ink)]">{fmt(r.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Wraps a chart with its legend and a chart/table switch. */
export function ChartFrame({
  showTable, labels, series, formatLabel, children,
}: {
  showTable: boolean; labels: string[]; series: Series[]; formatLabel: (l: string) => string; children: ReactNode;
}) {
  if (showTable) return <DataTable labels={labels} series={series} formatLabel={formatLabel} />;
  return (
    <>
      <Legend series={series} />
      {children}
    </>
  );
}

const PAD = { top: 8, right: 8, bottom: 24, left: 36 };

function YGrid({ width, height, scale }: { width: number; height: number; scale: { max: number; step: number } }) {
  const plotH = height - PAD.top - PAD.bottom;
  const ticks: number[] = [];
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) ticks.push(v);
  return (
    <g>
      {ticks.map((v) => {
        const y = PAD.top + plotH - (v / scale.max) * plotH;
        return (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={v === 0 ? 'var(--a-axis)' : 'var(--a-grid)'} strokeWidth={1} />
            <text x={PAD.left - 8} y={y} dy="0.32em" textAnchor="end" className="fill-[var(--a-muted)] text-[11px] tabular-nums">
              {fmt(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({ labels, xAt, height, formatLabel, maxTicks = 6 }: {
  labels: string[]; xAt: (i: number) => number; height: number; formatLabel: (l: string) => string; maxTicks?: number;
}) {
  if (labels.length === 0) return null;
  const every = Math.max(1, Math.ceil(labels.length / maxTicks));
  return (
    <g>
      {labels.map((l, i) =>
        i % every === 0 || i === labels.length - 1 ? (
          <text
            key={l}
            x={xAt(i)}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            className="fill-[var(--a-muted)] text-[11px]"
          >
            {/* skip a tick that would crowd the final label */}
            {i !== labels.length - 1 && labels.length - 1 - i < every * 0.6 ? '' : formatLabel(l)}
          </text>
        ) : null,
      )}
    </g>
  );
}

/* ── Line chart ─────────────────────────────────────────────────────────── */

export function LineChart({
  labels, series, height = 220, formatLabel = (l) => l, ariaLabel,
}: {
  labels: string[]; series: Series[]; height?: number; formatLabel?: (l: string) => string; ariaLabel: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const scale = useMemo(() => niceScale(Math.max(0, ...series.flatMap((s) => s.values))), [series]);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const n = labels.length;
  const xAt = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => PAD.top + plotH - (v / scale.max) * plotH;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / Math.max(1, box.width);
    setHover(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };

  // Draw comparison series first so the primary ones sit on top.
  const ordered = [...series].sort((a, b) => Number(!!b.muted) - Number(!!a.muted));
  const single = series.filter((s) => !s.muted).length === 1;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <YGrid width={width} height={height} scale={scale} />
          {single && series.filter((s) => !s.muted).map((s) => (
            <path
              key={`${s.id}-area`}
              d={`M ${xAt(0)} ${yAt(0)} ${s.values.map((v, i) => `L ${xAt(i)} ${yAt(v)}`).join(' ')} L ${xAt(n - 1)} ${yAt(0)} Z`}
              fill={s.color}
              opacity={0.12}
            />
          ))}
          {ordered.map((s) => (
            <path
              key={s.id}
              d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ')}
              fill="none"
              stroke={s.muted ? 'var(--a-muted)' : s.color}
              strokeWidth={s.muted ? 1.5 : 2}
              strokeOpacity={s.muted ? 0.7 : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          <XLabels labels={labels} xAt={xAt} height={height} formatLabel={formatLabel} />
          {hover !== null && (
            <g>
              <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--a-axis)" strokeWidth={1} />
              {series.map((s) => (
                <circle
                  key={s.id}
                  cx={xAt(hover)}
                  cy={yAt(s.values[hover] ?? 0)}
                  r={4}
                  fill={s.muted ? 'var(--a-muted)' : s.color}
                  stroke="var(--a-surface)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
          <rect
            x={PAD.left}
            y={0}
            width={plotW}
            height={height}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip
          x={xAt(hover)}
          containerWidth={width}
          title={formatLabel(labels[hover])}
          rows={series.map((s) => ({ label: s.label, value: s.values[hover] ?? 0, color: s.muted ? 'var(--a-muted)' : s.color }))}
        />
      )}
    </div>
  );
}

/* ── Vertical bar chart (one series) ────────────────────────────────────── */

export function BarChart({
  labels, values, color, seriesLabel, height = 200, formatLabel = (l) => l, ariaLabel,
}: {
  labels: string[]; values: number[]; color: string; seriesLabel: string; height?: number;
  formatLabel?: (l: string) => string; ariaLabel: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const scale = useMemo(() => niceScale(Math.max(0, ...values)), [values]);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const n = Math.max(1, values.length);
  const band = plotW / n;
  const gap = Math.min(Math.max(2, band * 0.25), 12);
  const barW = Math.max(1, band - gap);
  const xAt = (i: number) => PAD.left + i * band + band / 2;
  const base = PAD.top + plotH;

  const barPath = (i: number, v: number) => {
    const h = (v / scale.max) * plotH;
    if (h <= 0) return '';
    const x = xAt(i) - barW / 2;
    const r = Math.min(4, barW / 2, h);
    // Rounded at the data end only; square on the baseline.
    return `M ${x} ${base} V ${base - h + r} Q ${x} ${base - h} ${x + r} ${base - h} H ${x + barW - r} Q ${x + barW} ${base - h} ${x + barW} ${base - h + r} V ${base} Z`;
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <YGrid width={width} height={height} scale={scale} />
          {values.map((v, i) => (
            <path key={labels[i]} d={barPath(i, v)} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
          ))}
          <XLabels labels={labels} xAt={xAt} height={height} formatLabel={formatLabel} />
          {values.map((_, i) => (
            <rect
              key={`hit-${labels[i]}`}
              x={PAD.left + i * band}
              y={PAD.top}
              width={band}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip
          x={xAt(hover)}
          containerWidth={width}
          title={formatLabel(labels[hover])}
          rows={[{ label: seriesLabel, value: values[hover] ?? 0, color }]}
        />
      )}
    </div>
  );
}

/* ── Horizontal bar list (ranked categories) ────────────────────────────── */

export function BarList({
  items, color, valueLabel, emptyLabel = 'No data yet',
}: {
  items: { label: string; value: number; hint?: string }[]; color: string; valueLabel: string; emptyLabel?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="py-6 text-center text-xs text-[var(--a-muted)]">{emptyLabel}</p>;
  return (
    <ul className="space-y-2" aria-label={valueLabel}>
      {items.map((item) => (
        <li key={item.label} className="group" title={`${item.label}: ${fmt(item.value)} ${valueLabel}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-[var(--a-ink-2)] group-hover:text-[var(--a-ink)]">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--a-ink)]">
              {fmt(item.value)}
              {item.hint && <span className="ml-1.5 font-normal text-[var(--a-muted)]">{item.hint}</span>}
            </span>
          </div>
          <div className="h-2 w-full rounded-r-[4px] bg-[var(--a-surface-2)]">
            <div
              className={cx('h-2 rounded-r-[4px] transition-[width]')}
              style={{ width: `${(item.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
