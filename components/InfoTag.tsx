'use client';
// components/InfoTag.tsx
// A small "ℹ" badge that shows an explanatory tooltip on hover (native title
// attribute — same lightweight pattern already used by GMBadge/map badges in
// components/MonsterGuild.tsx, rather than introducing a heavier popover
// system for what's meant to be a quick one-line hint).
export default function InfoTag({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span
      title={text}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-500 text-gray-400 text-[10px] font-bold leading-none cursor-help select-none ${className}`}
    >
      i
    </span>
  );
}
