// lib/userSession.ts
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { isOfflineStorageAvailable, setActiveUserLocal } from '@/lib/localDataSource';

export type UserId = string;

// DepEd elementary grade levels this app covers.
export const GRADE_LEVELS = [2, 3, 4, 5, 6] as const;

export interface UserProfile {
  id: UserId;
  name: string;
  fullName: string;
  grade: string;
  avatar: string;
  // Currently-equipped THEME_CATALOG key (lib/themeShop.ts). Hardcoded here
  // is just the pre-DB-load fallback default — loadThemeOverrides() replaces
  // it with whatever's actually saved in user_themes once that resolves.
  theme: string;
  gender: 'boy' | 'girl';
  isFamily: boolean;
  // children.school_name / classmates.school_name — undefined for the two
  // hardcoded family profiles below, which aren't enrolled anywhere.
  school?: string;
}

export const USERS: Record<UserId, UserProfile> = {
  damien: {
    id: 'damien',
    name: 'Damien',
    fullName: 'Damien Zamir Ruelo',
    grade: 'Grade 5',
    avatar: '/userpics/Spr_RS_School_Kid_M.png',
    theme: 'theme_default',
    gender: 'boy',
    isFamily: true,
  },
  tala: {
    id: 'tala',
    name: 'Tala',
    fullName: 'Tala Ruelo',
    grade: 'Grade 2',
    avatar: '/tala-avatar.png',
    theme: 'theme_tala',
    gender: 'girl',
    isFamily: true,
  },
};

// Extracts the numeric grade level out of a "Grade N" string (or a bare
// number). Falls back to 5 for anything unparseable so old data/typos degrade
// to the original grade instead of crashing a query.
export function gradeToNumber(grade: string | number | undefined): number {
  if (typeof grade === 'number') return grade;
  const match = /(\d+)/.exec(grade || '');
  return match ? parseInt(match[1], 10) : 5;
}

// Classmates are admin-managed (Admin Dashboard → Classmates) and login with a
// username/password, unlike the two family profiles above. This loads them
// into USERS once so every existing USERS[id] lookup across the app keeps
// working synchronously without an async refactor.
let classmatesLoaded = false;
let classmateIds: Set<UserId> = new Set();

export async function loadClassmates(): Promise<void> {
  if (classmatesLoaded) return;
  const { data } = await supabase
    .from('classmates')
    .select('id, full_name, grade, gender, school_name')
    .eq('is_active', true);

  (data || []).forEach((c: any) => {
    USERS[c.id] = {
      id: c.id,
      name: c.full_name.split(' ')[0],
      fullName: c.full_name,
      grade: c.grade,
      avatar: '/userpics/Spr_RS_School_Kid_M.png',
      theme: 'theme_default',
      gender: c.gender === 'girl' ? 'girl' : 'boy',
      isFamily: false,
      school: c.school_name || undefined,
    };
    classmateIds.add(c.id);
  });
  classmatesLoaded = true;
}

// Filtered against classmateIds (not just `!isFamily`) because children are
// also non-family — without this, a child loaded via loadChildren() would be
// swept into this list too (isFamily: false on both), duplicating them
// alongside getChildIds() wherever both are combined into one roster.
export function getClassmateIds(): UserId[] {
  return Array.from(classmateIds);
}

// Children are parent-created (Parent Dashboard → Add Child) and log in with
// a username/PIN, same shape as classmates but sourced from the `children`
// table. Loaded into USERS once so every existing USERS[id] lookup across
// the app keeps working synchronously without an async refactor.
let childrenLoaded = false;
let childIds: Set<UserId> = new Set();

export async function loadChildren(): Promise<void> {
  if (childrenLoaded) return;
  const { data } = await supabase
    .from('children')
    .select('id, full_name, grade, gender, avatar, school_name')
    .eq('is_active', true);

  (data || []).forEach((c: any) => {
    USERS[c.id] = {
      id: c.id,
      name: c.full_name.split(' ')[0],
      fullName: c.full_name,
      grade: c.grade,
      avatar: c.avatar,
      theme: 'theme_default',
      gender: c.gender === 'girl' ? 'girl' : 'boy',
      isFamily: false,
      school: c.school_name || undefined,
    };
    childIds.add(c.id);
  });
  childrenLoaded = true;
}

export function getChildIds(): UserId[] {
  return Array.from(childIds);
}

// Avatars are user-chosen (Admin excluded) via the avatar picker and stored
// per user_id so the choice follows them across devices/browsers, same as
// their stats do. Falls back to each profile's built-in default until a
// choice is saved.
let avatarsLoaded = false;

export async function loadAvatarOverrides(): Promise<void> {
  if (avatarsLoaded) return;
  const { data } = await supabase.from('user_avatars').select('user_id, avatar');
  (data || []).forEach((row: any) => {
    if (USERS[row.user_id]) USERS[row.user_id].avatar = row.avatar;
  });
  avatarsLoaded = true;
}

export async function saveAvatar(userId: UserId, avatar: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_avatars')
    .upsert({ user_id: userId, avatar }, { onConflict: 'user_id' });
  if (error) return false;
  if (USERS[userId]) USERS[userId].avatar = avatar;
  return true;
}

// Equipped color theme (Curio Arena Shop → Themes tab) is purchased/owned
// like a userpic but, unlike avatars, only takes effect once explicitly
// equipped — see saveTheme. Falls back to each profile's built-in default
// (currently only Tala defaults to non-default) until a choice is saved.
let themesLoaded = false;

export async function loadThemeOverrides(): Promise<void> {
  if (themesLoaded) return;
  const { data } = await supabase.from('user_themes').select('user_id, theme_key');
  (data || []).forEach((row: any) => {
    if (USERS[row.user_id]) USERS[row.user_id].theme = row.theme_key;
  });
  themesLoaded = true;
}

export async function saveTheme(userId: UserId, themeKey: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_themes')
    .upsert({ user_id: userId, theme_key: themeKey }, { onConflict: 'user_id' });
  if (error) return false;
  if (USERS[userId]) USERS[userId].theme = themeKey;
  return true;
}

// Damien and Tala only need a password once one has been set from the Admin
// Dashboard — until then their splash-screen cards log in instantly like
// before, so this never locks anyone out on its own.
let protectedFamilyIds: Set<UserId> = new Set();
let familyProtectionLoaded = false;

export async function loadFamilyProtection(): Promise<void> {
  if (familyProtectionLoaded) return;
  const { data } = await supabase.from('family_credentials').select('id');
  protectedFamilyIds = new Set((data || []).map((row: any) => row.id));
  familyProtectionLoaded = true;
}

export function isFamilyProtected(id: UserId): boolean {
  return protectedFamilyIds.has(id);
}

const SESSION_KEY = 'g5_active_user';

export function getActiveUser(): UserId | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY) || null;
}

export function setActiveUser(id: UserId) {
  localStorage.setItem(SESSION_KEY, id);
  // Mirror into SQLite (best-effort) — the offline shell runs from a
  // different origin than the live site, so it can't read localStorage,
  // but it can read the same native SQLite file via the Capacitor bridge.
  if (isOfflineStorageAvailable()) {
    setActiveUserLocal(id, gradeToNumber(USERS[id]?.grade)).catch(e => {
      console.error('Offline cache write failed (non-fatal):', e);
    });
  }
}

export function clearActiveUser() {
  localStorage.removeItem(SESSION_KEY);
}

// Bridges this browser's anonymous-auth identity (auth.uid()) to whichever
// app user is currently logged in, so RLS policies that key on auth.uid()
// (e.g. user_monsters, weekly_packages/gold, player_inventory, live_battles)
// can resolve back to the app's text-based user ids.
//
// Routed through the link_verified_identity RPC (SECURITY DEFINER) rather
// than a direct table upsert — the RPC re-checks the same password/PIN used
// at login before it will (re)claim an app_user_id for this browser, and
// direct INSERT/UPDATE on user_identity_map is revoked for anon/authenticated.
// Without that check, any browser could self-attest any known app_user_id
// (e.g. "damien") and inherit full RLS access to that account's gold/monsters.
//
// `credential` is only required the first time a given browser links to a
// given id, or when switching which id it claims — reconfirming an existing
// claim (e.g. on page reload, same browser/session) is a free no-op inside
// the RPC, so omitting it is safe for that case.
export async function linkIdentity(userId: UserId, credential?: string): Promise<boolean> {
  const authUid = await ensureAnonymousSession();
  if (!authUid) return false;
  const { data, error } = await supabase.rpc('link_verified_identity', {
    p_id: userId,
    p_credential: credential ?? null,
  });
  return !error && data === true;
}

// Records when a user last logged in, so the splash screen can show a
// "last seen" indicator on each player card.
export async function recordLastLogin(userId: UserId): Promise<void> {
  await supabase
    .from('user_last_login')
    .upsert({ user_id: userId, last_login: new Date().toISOString() }, { onConflict: 'user_id' });
}

// Demo accounts never come from `children`/`classmates` (see app/api/demo-login
// and the create_demo_account RPC), so they're added to USERS directly here
// instead of through a loader — which also keeps them out of every other
// loader-driven surface (leaderboard, online-players list, etc.) by construction.
export function registerDemoUser(userId: UserId): void {
  USERS[userId] = {
    id: userId,
    name: 'Guest',
    fullName: 'Guest Explorer',
    grade: '',
    avatar: '/userpics/Spr_RS_School_Kid_M.png',
    theme: 'theme_default',
    gender: 'boy',
    isFamily: false,
  };
}

// Self-registered children (create_unclaimed_child_account) are real rows
// in `children`, unlike demo accounts — a later full page load will pick
// them up naturally through loadChildren(). This just makes the brand new
// account usable immediately in the current session, mirroring
// registerDemoUser but with the child's actual chosen profile instead of a
// generic "Guest" placeholder.
export function registerChildUser(profile: {
  id: UserId;
  fullName: string;
  grade: string;
  gender: 'boy' | 'girl';
  avatar: string;
}): void {
  USERS[profile.id] = {
    id: profile.id,
    name: profile.fullName.split(' ')[0],
    fullName: profile.fullName,
    grade: profile.grade,
    avatar: profile.avatar,
    theme: 'theme_default',
    gender: profile.gender,
    isFamily: false,
  };
  childIds.add(profile.id);
}

export function getOtherPlayers(currentUserId: UserId): UserProfile[] {
  return (Object.keys(USERS) as UserId[])
    .filter(id => id !== currentUserId)
    .map(id => USERS[id]);
}
