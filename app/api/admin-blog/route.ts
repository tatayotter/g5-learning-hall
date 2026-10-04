import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminPasscode } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { BLOG_CACHE_TAG } from '@/lib/blogData';
import { BLOG_TOPICS, type BlogPostImage, type BlogPostRow, type BlogSection } from '@/lib/blogPosts';

// Passcode-gated writes (and draft-inclusive reads) for public.blog_posts, used by the admin
// Blog section (components/admin/BlogSection.tsx). The table has no write policies, so the
// service-role client here is the only way in. Every write drops the public blog cache so the
// change is live on the next visit instead of after the 5-minute refresh.

const LIST_COLUMNS = 'id, slug, title, description, guild_key, grade, status, published_at, template, updated_at';

const str = (v: unknown, max = 20000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function cleanImage(v: unknown): BlogPostImage | null {
  if (!v || typeof v !== 'object') return null;
  const i = v as Record<string, unknown>;
  const url = str(i.url, 1000);
  if (!url || !(url.startsWith('/') || url.startsWith('https://'))) return null;
  const width = Math.round(Number(i.width)) || 1200;
  const height = Math.round(Number(i.height)) || 675;
  const c = (i.credit ?? {}) as Record<string, unknown>;
  const stock = c.source === 'Pexels' || c.source === 'Unsplash' || c.source === 'Pixabay';
  return {
    url, alt: str(i.alt, 300), width, height,
    credit: stock
      ? { name: str(c.name, 120), source: c.source as 'Pexels' | 'Unsplash' | 'Pixabay', sourceUrl: str(c.sourceUrl, 1000) }
      : { source: 'Learning Hall PH' },
  };
}

function cleanSections(v: unknown): BlogSection[] {
  return arr(v).flatMap((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const heading = str(s.heading, 300);
    const paragraphs = arr(s.paragraphs).map((p) => str(p)).filter(Boolean);
    if (!heading && paragraphs.length === 0) return [];
    const img = s.image && typeof s.image === 'object' ? (s.image as Record<string, unknown>) : null;
    const url = img ? str(img.url, 1000) : '';
    const section: BlogSection = { heading, paragraphs };
    if (img && url && (url.startsWith('/') || url.startsWith('https://'))) {
      section.image = {
        url, alt: str(img.alt, 300),
        width: Math.round(Number(img.width)) || 1200,
        height: Math.round(Number(img.height)) || 800,
        ...(str(img.caption, 300) ? { caption: str(img.caption, 300) } : {}),
      };
    }
    return [section];
  });
}

/** Validates and normalizes a post from the editor. Returns an error message or the row to write. */
function cleanPost(raw: Record<string, unknown>): { error: string } | { row: Omit<BlogPostRow, 'id' | 'created_at' | 'updated_at'> } {
  const slug = str(raw.slug, 120).toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { error: 'The address (slug) can only use lowercase letters, numbers and single hyphens.' };
  const title = str(raw.title, 200);
  if (!title) return { error: 'A title is required.' };
  const guild_key = str(raw.guild_key) as BlogPostRow['guild_key'];
  if (!(guild_key in BLOG_TOPICS)) return { error: 'Pick a topic.' };
  const gradeNum = raw.grade == null || raw.grade === '' || raw.grade === 'all' ? null : Number(raw.grade);
  if (gradeNum !== null && !(Number.isInteger(gradeNum) && gradeNum >= 2 && gradeNum <= 6)) return { error: 'Grade must be 2 to 6, or all grades.' };
  const status = raw.status === 'published' ? 'published' : 'draft';
  let published_at: string | null = null;
  if (raw.published_at) {
    const d = new Date(String(raw.published_at));
    if (Number.isNaN(d.getTime())) return { error: 'The publish date is not a valid date.' };
    published_at = d.toISOString();
  }
  if (status === 'published' && !published_at) published_at = new Date().toISOString();

  return {
    row: {
      slug, title, guild_key, grade: gradeNum, status, published_at,
      description: str(raw.description, 400),
      intro: str(raw.intro),
      sections: cleanSections(raw.sections),
      takeaways: arr(raw.takeaways).map((t) => str(t, 1000)).filter(Boolean),
      curriculum_note: str(raw.curriculum_note, 2000) || null,
      external_links: arr(raw.external_links).flatMap((l) => {
        const o = (l ?? {}) as Record<string, unknown>;
        const label = str(o.label, 200);
        const url = str(o.url, 1000);
        return label && url && (url.startsWith('/') || /^https?:\/\//i.test(url)) ? [{ label, url }] : [];
      }),
      image: cleanImage(raw.image),
      faq: arr(raw.faq).flatMap((f) => {
        const o = (f ?? {}) as Record<string, unknown>;
        const question = str(o.question, 400);
        const answer = str(o.answer, 3000);
        return question && answer ? [{ question, answer }] : [];
      }),
      template: str(raw.template, 60) || null,
    },
  };
}

function dropBlogCache() {
  revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
  revalidatePath('/blog', 'layout');
  revalidatePath('/sitemap.xml');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { passcode, action } = body;

  const authError = requireAdminPasscode(passcode);
  if (authError) return authError;

  if (action === 'list') {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select(LIST_COLUMNS)
      .order('published_at', { ascending: false, nullsFirst: true })
      .range(0, 999);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, posts: data });
  }

  if (action === 'get') {
    const { data, error } = await supabaseAdmin.from('blog_posts').select('*').eq('id', str(body.id)).maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
    return NextResponse.json({ success: true, post: data });
  }

  if (action === 'save') {
    const cleaned = cleanPost((body.post ?? {}) as Record<string, unknown>);
    if ('error' in cleaned) return NextResponse.json({ success: false, error: cleaned.error }, { status: 400 });
    const id = str(body.post?.id, 60);
    const values = { ...cleaned.row, updated_at: new Date().toISOString() };
    const query = id
      ? supabaseAdmin.from('blog_posts').update(values).eq('id', id).select('*').single()
      : supabaseAdmin.from('blog_posts').insert(values).select('*').single();
    const { data, error } = await query;
    if (error) {
      const message = error.code === '23505'
        ? 'Another post already uses this address (slug). Change the slug and save again.'
        : error.message;
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }
    dropBlogCache();
    return NextResponse.json({ success: true, post: data });
  }

  if (action === 'delete') {
    const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', str(body.id));
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    dropBlogCache();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}
