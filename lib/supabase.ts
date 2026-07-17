import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Notice the "export" keyword right here! This is what the error was looking for.
export const supabase = createClient(supabaseUrl, supabaseKey);

// The app's login system (lib/userSession.ts) is a custom localStorage session,
// not Supabase Auth, so RLS policies have no auth.uid() to key on by default.
// Anonymous auth gives each browser a real auth.uid() to bridge to the app's
// text-based user ids (see user_identity_map / lib/userSession.ts:linkIdentity),
// which live-battle RLS policies rely on.
let anonSessionPromise: Promise<string | null> | null = null;

export function ensureAnonymousSession(): Promise<string | null> {
  if (!anonSessionPromise) {
    anonSessionPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) return session.user.id;
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        anonSessionPromise = null;
        return null;
      }
      return data.user?.id ?? null;
    })();
  }
  return anonSessionPromise;
}