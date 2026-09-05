// lib/userSession.ts
import { supabase, ensureAnonymousSession } from '@/lib/supabase';

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
    avatar: '/userpics/userpics_premium/ssb3.png',
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

// Supabase caps a single select response at 1000 rows by default — fine for
// today's handful of classmates, but a silent, hard-to-notice truncation
// once the roster crosses that line (splash screen + leaderboard would just
// quietly drop everyone past row 1000). Page through with .range() so the
// full roster always loads regardless of size; see Phase 0 of
// buzzing-rolling-engelbart.md — this doesn't scope the query down, it just
// stops it from silently truncating until scoping (Phase 1+) lands.
const ROSTER_PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + ROSTER_PAGE_SIZE - 1);
    if (error) {
      console.error(`Failed to page ${table}:`, error);
      break;
    }
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < ROSTER_PAGE_SIZE) break;
    from += ROSTER_PAGE_SIZE;
  }
  return rows;
}

export async function loadClassmates(): Promise<void> {
  if (classmatesLoaded) return;
  // classmates itself denies all direct client reads (RLS) — it has no
  // owner concept to scope a policy by, and carries password_hash. This
  // safe-column view is the only public read path for the account-select
  // roster; the admin dashboard's need for username goes through a
  // separate passcode-gated route instead (see classmate-admin/route.ts).
  const data = await fetchAllRows<any>('classmates_public', 'id, full_name, grade, gender, school_name');

  (data || []).forEach((c: any) => {
    const gender = c.gender === 'girl' ? 'girl' : 'boy';
    USERS[c.id] = {
      id: c.id,
      name: c.full_name.split(' ')[0],
      fullName: c.full_name,
      grade: c.grade,
      avatar: gender === 'girl'
        ? '/userpics/userpics_premium/ssg3.png'
        : '/userpics/userpics_premium/ssb3.png',
      theme: 'theme_default',
      gender,
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
  // children itself only allows a parent to read their own rows now (RLS) —
  // pin_plain/pin_hash/username live there and shouldn't be readable
  // outside that. This safe-column view (already scoped to active children
  // of approved parents) is the public account-select roster's read path.
  const data = await fetchAllRows<any>('children_public', 'id, full_name, grade, gender, avatar, school_name');

  (data || []).forEach((c: any) => {
    const gender = c.gender === 'girl' ? 'girl' : 'boy';
    const defaultAvatar = gender === 'girl'
      ? '/userpics/userpics_premium/ssg3.png'
      : '/userpics/userpics_premium/ssb3.png';
    USERS[c.id] = {
      id: c.id,
      name: c.full_name.split(' ')[0],
      fullName: c.full_name,
      grade: c.grade,
      avatar: c.avatar || defaultAvatar,
      theme: 'theme_default',
      gender,
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

// Populates USERS (classmates, children, family protection, avatar/theme
// overrides) the way Dashboard needs at hydration time.
export async function loadAllUsersData(): Promise<void> {
  await Promise.all([loadClassmates(), loadChildren(), loadFamilyProtection()]);
  await Promise.all([loadAvatarOverrides(), loadThemeOverrides()]);
}

const SESSION_KEY = 'g5_active_user';

export function getActiveUser(): UserId | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY) || null;
}

export function setActiveUser(id: UserId) {
  localStorage.setItem(SESSION_KEY, id);
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

// Self-registered children (create_unclaimed_child_account) are real rows
// in `children` — a later full page load will pick them up naturally through
// loadChildren(). This makes the brand new account usable immediately in the
// current session with the child's actual chosen profile.
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

// Normalizes a typed username into the same slug the DB derives as
// `children.id` (see create_child_account / create_unclaimed_child_account:
// `lower(regexp_replace(username, '[^a-zA-Z0-9_]', '', 'g'))`). Lets a
// returning-player login form take the username the child actually typed
// during signup and resolve it to the id verify_child_login expects.
export function usernameToChildId(username: string): UserId {
  return username.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

// Unclaimed (self-registered, parent_id IS NULL) children are permanently
// excluded from children_public (it requires an approved parent), so
// loadChildren() never loads them and they never appear on the SplashScreen
// roster past their first in-memory session. This is the fallback login
// path for that case: the child types their username + PIN directly instead
// of picking a roster row, verify_child_login (which already allows
// parent_id IS NULL, see docs/parent-child-linking-design.md) checks the
// PIN server-side, and on success this injects a full USERS entry the same
// way registerChildUser() does for a brand new signup — so the account
// becomes selectable/usable for this session regardless of roster
// membership. A later successful parent link (or any full page load, once
// linked) will pick the child up naturally via loadChildren() from then on.
export function loginReturningChild(profile: {
  id: UserId;
  fullName: string;
  grade: string;
  avatar: string;
  gender: 'boy' | 'girl';
  school?: string;
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
    school: profile.school,
  };
  childIds.add(profile.id);
}

export function getOtherPlayers(currentUserId: UserId): UserProfile[] {
  return (Object.keys(USERS) as UserId[])
    .filter(id => id !== currentUserId)
    .map(id => USERS[id]);
}
