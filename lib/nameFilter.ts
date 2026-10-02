// lib/nameFilter.ts
// Sign-up forms check usernames, display names and school names against the
// blocked-words list before submitting (see
// supabase/migrations/20261002220000_block_offensive_names.sql). The list
// itself stays server-side; this only learns which field to fix. A DB
// trigger enforces the same rule on every write, so this is the friendly
// path, not the only one.
import { supabase } from './supabase';

export type NameField = 'username' | 'full_name' | 'school_name';

const FIELD_MESSAGES: Record<NameField, string> = {
  username: "That username isn't allowed. Please choose a different one.",
  full_name: "That name isn't allowed. Please use your real name.",
  school_name: "That school name isn't allowed. Please type your school's real name.",
};

/** Message for the first offending field, or null if all three are fine (or the check couldn't run). */
export async function checkSignupNames(username: string, fullName: string, schoolName: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('check_signup_names', {
    p_username: username,
    p_full_name: fullName,
    p_school_name: schoolName,
  });
  // Fail open here — the DB trigger still rejects a blocked name on save.
  if (error || !data) return null;
  return FIELD_MESSAGES[data as NameField] ?? null;
}

/** Turns the trigger's "NAME_NOT_ALLOWED:<field>" error into the same friendly message. */
export function friendlyNameError(message: string): string | null {
  const match = message.match(/NAME_NOT_ALLOWED:(username|full_name|school_name)/);
  return match ? FIELD_MESSAGES[match[1] as NameField] : null;
}
