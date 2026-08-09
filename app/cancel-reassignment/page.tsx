import type { Metadata } from 'next';
import { Suspense } from 'react';
import CancelReassignmentAction from '@/components/CancelReassignmentAction';

export const metadata: Metadata = {
  title: 'Cancel Reassignment — Learning Hall',
  robots: { index: false, follow: false },
};

export default function CancelReassignmentPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-6">
        <Suspense fallback={<p className="text-center text-gray-500 text-sm">Loading…</p>}>
          <CancelReassignmentAction />
        </Suspense>
      </div>
    </main>
  );
}
