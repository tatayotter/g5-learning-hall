'use client'; // Error boundaries must be Client Components
import { useEffect } from 'react';
import { trackClientError } from '@/lib/analytics';

// Fallback for any render crash below the root layout. Reports the crash to
// analytics_events (`client_error`, source 'boundary') so launch-day bugs
// show up in data instead of only on a child's screen.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    trackClientError('boundary', error, { digest: error.digest ?? null });
  }, [error]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center space-y-3">
        <img src="/learning_hall_full_logo.webp" alt="Learning Hall" className="h-16 w-auto mx-auto mb-4 object-contain" />
        <h1 className="text-xl font-bold text-slate-800">Something went wrong</h1>
        <p className="text-sm text-slate-600">
          We&apos;ve logged the problem. Try again, and if it keeps happening, reload the page.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-2 rounded-full bg-[#c9781a] px-6 py-2.5 text-sm font-semibold text-white shadow active:scale-95 transition"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
