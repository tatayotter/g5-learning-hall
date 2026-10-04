'use client'; // Error boundaries must be Client Components
import { useEffect } from 'react';
import { trackClientError } from '@/lib/analytics';

// Last-resort fallback for crashes in the root layout itself. Replaces the
// whole document, so it carries its own <html>/<body> and inline styles.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    trackClientError('global_boundary', error, { digest: error.digest ?? null });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffaf2', fontFamily: 'system-ui, sans-serif', color: '#1e293b', padding: 16 }}>
        <title>Something went wrong | Learning Hall PH</title>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px' }}>
            We&apos;ve logged the problem. Try again, and if it keeps happening, reload the page.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ border: 0, borderRadius: 999, background: '#c9781a', color: '#ffffff', padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
