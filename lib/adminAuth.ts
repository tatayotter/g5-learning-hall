import { NextResponse } from 'next/server';

// Shared by every admin-gated API route (app/api/admin-*, family-admin,
// classmate-admin) — was previously copy-pasted verbatim into each one,
// which meant a new admin route could easily forget it and ship unauthenticated.
export function requireAdminPasscode(passcode: unknown): NextResponse | null {
  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 401 });
  }
  return null;
}
