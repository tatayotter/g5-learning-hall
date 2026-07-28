import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPasscode } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

// Uploads go through this passcode-gated route with the service-role client
// instead of the browser calling supabase.storage directly — the bucket's
// old "authenticated can write" policy meant any logged-in player (every
// anon-auth session counts as `authenticated`), not just the admin, could
// upload/overwrite/delete event posters straight from the client.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const passcode = formData.get('passcode');
  const file = formData.get('file');

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: 'File is too large (max 8MB)' }, { status: 400 });
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ success: false, error: 'Unsupported image type' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'webp';
  const path = `${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage
    .from('event-posters')
    .upload(path, bytes, { upsert: true, contentType: file.type || undefined });

  if (uploadErr) {
    return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from('event-posters').getPublicUrl(path);
  return NextResponse.json({ success: true, url: data.publicUrl });
}
