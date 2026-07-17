// lib/userSession.ts
import { supabase, ensureAnonymousSession } from '@/lib/supabase';

export type UserId = string;

export interface UserProfile {
  id: UserId;
  name: string;
  fullName: string;
  grade: string;
  avatar: string;
  theme: 'damien' | 'tala';
  gender: 'boy' | 'girl';
  isFamily: boolean;
  // Which user's Main Quest package (weekly_packages.package_data) this player
  // reads questions from. Lets classmates share a grade's question pool while
  // keeping their own stats/journal/achievements/quiz history independent.
  // Defaults to the player's own id if omitted.
  contentSourceId?: UserId;
}

export const USERS: Record<UserId, UserProfile> = {
  damien: {
    id: 'damien',
    name: 'Damien',
    fullName: 'Damien Zamir Ruelo',
    grade: 'Grade 5',
    avatar: '/avatar.png',
    theme: 'damien',
    gender: 'boy',
    isFamily: true,
  },
  tala: {
    id: 'tala',
    name: 'Tala',
    fullName: 'Tala Ruelo',
    grade: 'Grade 2',
    avatar: '/tala-avatar.png',
    theme: 'tala',
    gender: 'girl',
    isFamily: true,
  },
};

// Classmates are admin-managed (Admin Dashboard → Classmates) and login with a
// username/password, unlike the two family profiles above. This loads them
// into USERS once so every existing USERS[id] lookup across the app keeps
// working synchronously without an async refactor.
let classmatesLoaded = false;

export async function loadClassmates(): Promise<void> {
  if (classmatesLoaded) return;
  const { data } = await supabase
    .from('classmates')
    .select('id, full_name, grade, gender')
    .eq('is_active', true);

  (data || []).forEach((c: any) => {
    USERS[c.id] = {
      id: c.id,
      name: c.full_name.split(' ')[0],
      fullName: c.full_name,
      grade: c.grade,
      avatar: '/avatar.png',
      theme: 'damien',
      gender: c.gender === 'girl' ? 'girl' : 'boy',
      isFamily: false,
      contentSourceId: 'damien',
    };
  });
  classmatesLoaded = true;
}

export function getClassmateIds(): UserId[] {
  return (Object.keys(USERS) as UserId[]).filter(id => !USERS[id].isFamily);
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
}

export function clearActiveUser() {
  localStorage.removeItem(SESSION_KEY);
}

// Bridges this browser's anonymous-auth identity (auth.uid()) to whichever
// app user is currently logged in, so RLS policies that key on auth.uid()
// (e.g. live_battles) can resolve back to the app's text-based user ids.
// Safe to call on every login — it's an upsert keyed by auth_uid.
export async function linkIdentity(userId: UserId): Promise<void> {
  const authUid = await ensureAnonymousSession();
  if (!authUid) return;
  await supabase
    .from('user_identity_map')
    .upsert({ auth_uid: authUid, app_user_id: userId }, { onConflict: 'auth_uid' });
}

export function getOtherPlayers(currentUserId: UserId): UserProfile[] {
  return (Object.keys(USERS) as UserId[])
    .filter(id => id !== currentUserId)
    .map(id => USERS[id]);
}
