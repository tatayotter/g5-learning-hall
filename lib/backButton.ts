// lib/backButton.ts
//
// The phone's Back button for the new navigation (docs/nav-redesign.md).
// Without this, Back leaves the game from any screen: in a phone browser it
// goes to the previous site, and in the Android app it closes the app.
//
// Screens register what Back should do with useBackHandler; the handler with
// the highest priority that says "handled" wins (a menu sheet above a tab).
// When nothing handles it, Back leaves the game as before.
'use client';

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { hasNativePlugin } from '@/lib/platform';

type Handler = () => boolean;
interface Entry { priority: number; handler: { current: Handler } }

const entries = new Set<Entry>();

// Runs the handlers top-first. True when one of them dealt with Back.
export function handleBack(): boolean {
  const ordered = [...entries].sort((a, b) => b.priority - a.priority);
  for (const e of ordered) if (e.handler.current()) return true;
  return false;
}

// Register what Back does on this screen. The handler returns true when it
// did something, false to let a lower one (or leaving the game) have it.
export function useBackHandler(enabled: boolean, priority: number, handler: Handler) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    if (!enabled) return;
    const entry: Entry = { priority, handler: ref };
    entries.add(entry);
    return () => { entries.delete(entry); };
  }, [enabled, priority]);
}

const MARK = 'lhBack';

// Listens for the Back button. Mount once, while the new nav is on.
export function useBackButton(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Android app: the shell's own Back event. Once anything listens to it,
    // Capacitor no longer closes the app by itself, so when nothing handles
    // Back we put the game in the background, like Home, keeping its place.
    if (hasNativePlugin('App')) {
      const sub = App.addListener('backButton', () => {
        if (!handleBack()) App.minimizeApp().catch(() => {});
      });
      return () => { sub.then(s => s.remove()).catch(() => {}); };
    }

    // Browser: keep one extra history entry on top of the game. Back pops it;
    // if a screen handled Back we put it back, otherwise we leave it popped
    // so the next Back leaves the game as usual.
    const arm = () => {
      const state = window.history.state as Record<string, unknown> | null;
      if (!state?.[MARK]) window.history.pushState({ ...(state ?? {}), [MARK]: true }, '');
    };
    arm();
    const onPop = () => {
      const state = window.history.state as Record<string, unknown> | null;
      if (state?.[MARK]) return; // moved forward onto our entry again
      if (handleBack()) arm();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [enabled]);
}
