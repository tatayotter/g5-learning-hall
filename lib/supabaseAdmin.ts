import { createClient } from '@supabase/supabase-js';

// Server-only client using the service-role key — bypasses RLS entirely.
// Never import this from a 'use client' component or anything bundled to
// the browser. Only use it from API routes that have already verified the
// caller themselves (e.g. via lib/adminAuth's requireAdminPasscode) — RLS
// isn't there to catch mistakes for requests made with this client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
