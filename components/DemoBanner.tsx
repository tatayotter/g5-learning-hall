// components/DemoBanner.tsx
'use client';

import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

export default function DemoBanner() {
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    // A plain <a> navigation races the fire-and-forget analytics insert and
    // aborts it mid-flight, so the click must wait for the write first.
    await trackEvent('demo_signup_cta_clicked');
    router.push('/register?ref=demo');
  };

  return (
    <div className="sticky top-0 z-40 bg-[#c9781a] text-white text-sm font-bold px-4 py-2 flex items-center justify-center gap-3 text-center">
      <span>👋 You&apos;re exploring a demo — progress here isn&apos;t saved long-term.</span>
      <a
        href="/register?ref=demo"
        onClick={handleClick}
        className="underline decoration-2 underline-offset-2 hover:text-[#1c1611] transition-colors whitespace-nowrap"
      >
        Create your real account →
      </a>
    </div>
  );
}
