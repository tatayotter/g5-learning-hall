// lib/deviceHeroes.ts
//
// Heroes who have logged in on this device, so siblings sharing one phone can switch accounts
// with no connection. Logging in normally checks the PIN on the server (verify_child_login,
// link_verified_identity); that can't happen offline, so each online login also leaves a
// slow, salted hash of the PIN here (PBKDF2, never the PIN itself) that an offline login is
// checked against.
//
// What an offline login unlocks is only this device's copy: play saves to that hero's own
// outboxes, and none of it reaches the server until the hero is linked again online, which
// takes the real PIN checked by the server (Dashboard sends them to the PIN prompt when the
// connection is back). So guessing a PIN offline can't touch anyone's account; the wrong-PIN
// lockout below just stops a sibling trying PINs on the login screen.
import { offlinePlayEnabled } from '@/lib/offlineQuests';
import { loadOfflineProfile } from '@/lib/offlineSnapshot';
import { USERS, type UserId } from '@/lib/userSession';

const VERIFIER = (id: string) => `lh_device_hero_${id}`;
const LOCKOUT = (id: string) => `lh_device_hero_lockout_${id}`;
const RELINK = 'lh_relink_hero';
const ITERATIONS = 150_000;
const MAX_TRIES = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

interface Verifier { salt: string; hash: string; iterations: number; savedAt: string }
interface Lockout { tries: number; until: number }

function read<T>(key: string, storage: Storage = localStorage): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown, storage: Storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* best-effort */ }
}

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array((hex.match(/../g) ?? []).map(h => parseInt(h, 16)));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return toHex(bits);
}

/** After the server accepted this PIN: remember the hero for offline logins on this device. */
export async function rememberHeroOnDevice(id: UserId, pin: string): Promise<void> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(pin, salt, ITERATIONS);
    write(VERIFIER(id), { salt: toHex(salt), hash, iterations: ITERATIONS, savedAt: new Date().toISOString() } satisfies Verifier);
    localStorage.removeItem(LOCKOUT(id));
  } catch {
    // No WebCrypto (very old WebView): this hero just can't log in offline.
  }
}

/** Heroes who can log in here with no connection: logged in here before, with offline play on. */
export function offlineHeroIds(): UserId[] {
  const ids: UserId[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const id = key?.startsWith('lh_device_hero_') && !key.startsWith('lh_device_hero_lockout_') ? key.slice('lh_device_hero_'.length) : null;
      if (id && offlinePlayEnabled(id) && loadOfflineProfile(id)) ids.push(id);
    }
  } catch { /* storage unavailable */ }
  return ids;
}

/** The offline roster: offlineHeroIds() with their saved profiles put into USERS, by name. */
export function loadOfflineHeroes(): UserId[] {
  const ids = offlineHeroIds();
  for (const id of ids) if (!USERS[id]) { const p = loadOfflineProfile(id); if (p) USERS[id] = p; }
  return ids.filter(id => USERS[id]).sort((a, b) => USERS[a].name.localeCompare(USERS[b].name));
}

/** Minutes left on a wrong-PIN lockout, or 0. */
export function offlineLockoutMinutes(id: UserId): number {
  const lock = read<Lockout>(LOCKOUT(id));
  return lock && lock.until > Date.now() ? Math.ceil((lock.until - Date.now()) / 60000) : 0;
}

export type OfflineUnlock = 'ok' | 'wrong' | 'locked' | 'unavailable';

export async function unlockHeroOffline(id: UserId, pin: string): Promise<OfflineUnlock> {
  const verifier = read<Verifier>(VERIFIER(id));
  if (!verifier || !offlinePlayEnabled(id) || !loadOfflineProfile(id)) return 'unavailable';
  if (offlineLockoutMinutes(id) > 0) return 'locked';
  let hash: string;
  try {
    hash = await derive(pin, fromHex(verifier.salt), verifier.iterations);
  } catch {
    return 'unavailable';
  }
  if (hash === verifier.hash) {
    localStorage.removeItem(LOCKOUT(id));
    return 'ok';
  }
  const tries = (read<Lockout>(LOCKOUT(id))?.tries ?? 0) + 1;
  write(LOCKOUT(id), { tries: tries >= MAX_TRIES ? 0 : tries, until: tries >= MAX_TRIES ? Date.now() + LOCKOUT_MS : 0 } satisfies Lockout);
  return tries >= MAX_TRIES ? 'locked' : 'wrong';
}

// Back online after an offline login: the server hasn't linked this device to the hero, so the
// login screen asks for their PIN once, then the offline play syncs. Kept for this tab only.
export function askToRelink(id: UserId) { write(RELINK, id, sessionStorage); }
export function takeRelinkRequest(): UserId | null {
  const id = read<UserId>(RELINK, sessionStorage);
  try { sessionStorage.removeItem(RELINK); } catch { /* best-effort */ }
  return id;
}
