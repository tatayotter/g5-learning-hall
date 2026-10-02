// components/GrowthPillIcon.tsx
// Small inline capsule for showing Growth Pill rewards. There's no Growth
// Pill art in public/items yet, so this is a plain SVG in the same purple
// TeamPanel uses for the "Use Growth Pill" button (#7c3aed).
export default function GrowthPillIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <g transform="rotate(-40 12 12)">
        <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" fill="#f5c542" stroke="#2a1505" strokeWidth="1.4" />
        <path d="M12 7.5h4.5a4.5 4.5 0 0 1 0 9H12z" fill="#7c3aed" stroke="#2a1505" strokeWidth="1.4" />
        <rect x="5" y="9.2" width="5" height="1.6" rx="0.8" fill="#fff" opacity="0.7" />
      </g>
    </svg>
  );
}
