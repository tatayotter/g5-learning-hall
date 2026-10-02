'use client';
import { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile bot check for child self-registration only. Deliberately
// NOT Supabase Auth's built-in CAPTCHA setting: that would demand a token on
// every signInAnonymously() call, and the app starts anonymous sessions
// silently in the background (PIN login, prefetch), which has no widget.
// The token is verified server-side in /api/child-signup.

// Real site key only on the hostnames registered with the Turnstile widget
// (the Android app loads learninghall.vercel.app). Everywhere else — localhost,
// Vercel previews — uses Cloudflare's public always-pass test key.
const PRODUCTION_SITE_KEY = '0x4AAAAAAFL2HKawr1GJgtfB';
const TEST_SITE_KEY = '1x00000000000000000000AA';

function siteKeyForHost(hostname: string): string {
  const isProduction =
    hostname === 'learninghallph.com' ||
    hostname.endsWith('.learninghallph.com') ||
    hostname === 'learninghall.vercel.app';
  return isProduction ? PRODUCTION_SITE_KEY : TEST_SITE_KEY;
}

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      reject(new Error('turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface TurnstileWidgetProps {
  // Called with a fresh token, or '' when the token expires or the check errors.
  onToken: (token: string) => void;
}

// Tokens are single-use: remount this (change its `key`) after every submit
// attempt so a retry gets a fresh one.
export default function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKeyForHost(window.location.hostname),
          theme: 'light',
          size: 'flexible',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  if (loadFailed) {
    return (
      <p className="text-sm text-amber-700 text-center">
        Couldn&apos;t load the security check. Check your connection and refresh the page.
      </p>
    );
  }

  return <div ref={containerRef} className="w-full min-h-[65px]" />;
}
