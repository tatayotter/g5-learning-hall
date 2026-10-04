import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPasscode } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Stores a blog photo in the public `blog-images` bucket. The editor has already resized it,
// re-encoded it (which drops EXIF, including phone GPS) and compressed it in the browser
// (components/admin/blog/optimizeImage.ts), so this only checks the file and saves it.
// Vercel caps request bodies at about 4.5 MB, which is why the shrinking happens client-side.
const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const authError = requireAdminPasscode(formData.get('passcode'));
  if (authError) return authError;

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ success: false, error: 'Unsupported image type' }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: 'Photo is too large even after optimizing (max 4 MB).' }, { status: 400 });
  }

  const month = new Date().toISOString().slice(0, 7);
  const path = `${month}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from('blog-images')
    .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, cacheControl: '31536000' });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from('blog-images').getPublicUrl(path);
  return NextResponse.json({ success: true, url: data.publicUrl });
}
