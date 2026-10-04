'use client';
import { useEffect } from 'react';
import { trackClientError } from '@/lib/analytics';

// Browser noise that carries no actionable information: cross-origin script
// failures (e.g. the FB pixel) surface only as "Script error.", and the
// ResizeObserver warning is benign.
const IGNORED = [/^Script error\.?$/, /ResizeObserver loop/];

/**
 * Logs uncaught errors and unhandled promise rejections to analytics_events
 * as `client_error`. Render crashes are reported by app/error.tsx and
 * app/global-error.tsx instead.
 */
export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const message = e.error?.message ?? e.message ?? '';
      if (IGNORED.some((re) => re.test(message))) return;
      trackClientError('window', e.error ?? message, { filename: e.filename || null, line: e.lineno || null });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const message = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
      if (IGNORED.some((re) => re.test(message))) return;
      trackClientError('promise', e.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
