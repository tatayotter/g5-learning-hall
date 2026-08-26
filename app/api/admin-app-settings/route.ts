import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminPasscode } from '@/lib/adminAuth';

// Passcode-gated write path for public.app_settings (currently just the Facebook Pixel ID —
// components/admin/SiteSettingsSection.tsx). Reads don't need this route: app_settings has a
// public SELECT policy (see the migration) since the pixel ID must be readable by anonymous
// visitors on every page, so both the admin UI and lib/facebookPixel.ts read it straight off
// `supabase`.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'set_facebook_pixel_id') {
    const pixelId = typeof body.pixelId === 'string' ? body.pixelId : '';
    const { error } = await supabase.rpc('admin_set_facebook_pixel_id', {
      p_passcode: process.env.ADMIN_PASSCODE,
      p_pixel_id: pixelId,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
