import type { Metadata } from 'next';
import { Suspense } from 'react';
import LinkParentConfirm from '@/components/LinkParentConfirm';

export const metadata: Metadata = {
  title: 'Link Your Child — Learning Hall',
  robots: { index: false, follow: false },
};

export default function LinkParentPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-[#ffffff] border border-stone-200 rounded-2xl p-6 shadow-sm">
        <Suspense fallback={<p className="text-center text-gray-500 text-sm">Loading…</p>}>
          <LinkParentConfirm />
        </Suspense>
      </div>
    </main>
  );
}
