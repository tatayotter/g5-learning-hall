'use client';
// A Tracking Scroll's icon: Rowil's parchment scroll (public/items/tracking_scroll.png) with a wax-seal emblem
// showing the face of the curio it tracks, the seal tinted by that curio's
// element. Used everywhere a scroll appears (map slots, bag, Shop, Compendium)
// so each of the 27 scrolls is recognisable at a glance.
import { useId, useState } from 'react';
import type { Element, MonsterDef } from '@/lib/monsterConfig';

const SEAL: Record<Element, { fill: string; rim: string }> = {
  fire:   { fill: '#dc2626', rim: '#7f1d1d' },
  water:  { fill: '#2563eb', rim: '#1e3a8a' },
  leaf:   { fill: '#16a34a', rim: '#14532d' },
  storm:  { fill: '#eab308', rim: '#854d0e' },
  shadow: { fill: '#7c3aed', rim: '#3b0764' },
  light:  { fill: '#f59e0b', rim: '#92400e' },
};

// Where each curio's face is in its sprite: [sprite width, sprite height, crop x, crop y, crop size]
// in sprite pixels (picked by eye from public/monsters/<id>.webp). A curio missing here shows its
// whole sprite.
const FACE: Record<string, [number, number, number, number, number]> = {
  shadrak: [624, 736, 50, -10, 374],
  torrenth: [748, 755, 307, 175, 374],
  voltmane: [769, 735, 235, 24, 423],
  fernix: [659, 790, 260, 10, 297],
  solarch: [579, 776, 29, 1, 463],
  pyravex: [632, 743, 228, -3, 303],
  embrak: [765, 648, 436, -31, 321],
  coralyn: [793, 782, 258, 56, 357],
  mosshorn: [514, 779, 126, 186, 283],
  galestrik: [787, 731, 275, 0, 394],
  duskral: [749, 688, 206, 55, 412],
  luminos: [682, 685, 321, 56, 341],
  emberpaw: [612, 653, 199, 93, 337],
  magmarox: [653, 722, 163, -1, 392],
  bubbloon: [705, 693, 70, 9, 564],
  coralune: [685, 712, 154, 25, 377],
  luminibee: [557, 755, 112, 60, 334],
  solaraffe: [473, 640, 175, 4, 236],
  zapkit: [749, 703, 183, 19, 412],
  thundrake: [800, 728, 384, -14, 320],
  gloombat: [586, 678, 117, 109, 352],
  umbraven: [759, 720, 220, -3, 395],
  darkkor: [500, 388, 48, -27, 325],
  sproutle: [481, 699, 36, 85, 361],
  platydew: [758, 800, 114, -10, 531],
  brambleon: [666, 766, 140, 75, 386],
  kasagbon: [628, 379, 78, -65, 471],
};

export default function TrackingScrollIcon({ monster, className = 'w-12 h-12' }: {
  monster: Pick<MonsterDef, 'id' | 'name' | 'element' | 'emoji'> & { spriteId?: string };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const clip = useId().replace(/:/g, '');
  const seal = SEAL[monster.element] ?? SEAL.fire;
  const face = FACE[monster.spriteId ?? monster.id];
  return (
    <span className={`relative inline-block shrink-0 ${className}`} role="img" aria-label={`Tracking Scroll: ${monster.name}`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full drop-shadow-[0_2px_2px_rgba(42,21,5,0.45)]" aria-hidden>
        {/* the scroll (Rowil's art), its plain middle left for the seal */}
        <image href="/items/tracking_scroll.png" x="0" y="0" width="64" height="64" style={{ imageRendering: 'pixelated' }} />
        {/* wax seal */}
        <circle cx="32" cy="28.5" r="13" fill={seal.fill} stroke={seal.rim} strokeWidth="2" />
        <circle cx="32" cy="28.5" r="10.5" fill="#fff7e6" stroke={seal.rim} strokeWidth="1" />
        <clipPath id={clip}><circle cx="32" cy="28.5" r="10" /></clipPath>
        {failed ? (
          <text x="32" y="33" textAnchor="middle" fontSize="12">{monster.emoji}</text>
        ) : (
          <g clipPath={`url(#${clip})`}>
            <svg x="22" y="18.5" width="20" height="20" viewBox={face ? `${face[2]} ${face[3]} ${face[4]} ${face[4]}` : '0 0 100 100'} preserveAspectRatio="xMidYMid slice">
              <image
                href={`/monsters/${monster.spriteId ?? monster.id}.webp`}
                width={face ? face[0] : 100} height={face ? face[1] : 100}
                preserveAspectRatio="xMidYMid meet"
                onError={() => setFailed(true)}
              />
            </svg>
          </g>
        )}
      </svg>
    </span>
  );
}
