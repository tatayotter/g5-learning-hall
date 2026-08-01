// lib/offlineState.ts
//
// Synchronous "are we offline right now" check for the shared lib functions
// (guildEngine.ts, useWeeklyData.ts, etc.) that both the online main app and
// the offline shell import. A real Supabase call before falling back to the
// cache would make every offline screen feel laggy, so callers check this
// first and skip straight to the local cache when true.
//
// Self-initializing: the first call to isAppOffline() starts a Network
// listener that keeps a module-level flag up to date. Native-only — on
// web/desktop this always reports "online" (never native, so never Capacitor
// local storage, so no offline path to take).
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

let lastKnownConnected = true;
let initialized = false;

function ensureInitialized() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;
  Network.getStatus().then(status => { lastKnownConnected = status.connected; });
  Network.addListener('networkStatusChange', status => { lastKnownConnected = status.connected; });
}

export function isAppOffline(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  ensureInitialized();
  return !lastKnownConnected;
}
