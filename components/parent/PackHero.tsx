'use client';
// Gradient hero strip for an SEC pack card / product page in the parent
// area's Liquid Glass styling. Color comes from the pack's grade → category
// (same derivation the old shop used), so a new pack is branded with no
// extra config. A big faded line icon replaces the old emoji watermark.
import { Icon, IOS, type IconName } from '@/components/parent/ios';

const CATEGORY_GLYPH: Record<string, IconName> = {
  math_enrichment: 'chart',
};

interface PackHeroProps {
  grade: number;
  category: string;
  eyebrow: string;
  from: string;
  to: string;
  owned?: boolean;
  tall?: boolean;
}

export default function PackHero({ category, eyebrow, from, to, owned, tall }: PackHeroProps) {
  const glyph = CATEGORY_GLYPH[category] ?? 'book';
  return (
    <div
      className={`relative overflow-hidden shrink-0 ${tall ? 'h-36' : 'h-24'}`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* soft light bloom so the hero reads as lit glass, not a flat swatch */}
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(80% 90% at 15% 0%, rgba(255,255,255,0.35), transparent 60%)' }} />
      <span aria-hidden className="absolute -right-3 -bottom-5 opacity-25">
        <Icon name={glyph} size={tall ? 150 : 104} color="#FFFFFF" strokeWidth={2.4} />
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
        <span
          className="text-[12px] font-semibold text-[#ffffff] rounded-full px-3 py-1 border border-[#ffffff]/40"
          style={{ background: 'rgba(255,255,255,0.18)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
        >
          {eyebrow}
        </span>
      </div>
      {owned && (
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 text-[12px] font-semibold rounded-full pl-2 pr-2.5 py-1"
          style={{ background: 'rgba(255,255,255,0.9)', color: IOS.green }}
        >
          <Icon name="check" size={13} color={IOS.green} strokeWidth={3} />
          Owned
        </span>
      )}
    </div>
  );
}
