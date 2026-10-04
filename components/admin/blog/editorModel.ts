import {
  BLOG_TOPICS, manilaDate, type BlogGuildKey, type BlogPost, type BlogPostImage, type BlogPostRow,
  type BlogSectionImage, type BlogStatus,
} from '@/lib/blogPosts';
import type { BlogTemplate } from '@/lib/blogTemplates';

// The editor's working copy of a post, and conversions to and from the database row
// (BlogPostRow), the save payload and the preview (BlogPost). Section text is one textarea per
// section, with a blank line between paragraphs; takeaways are one per line.

export type EditorSection = {
  heading: string;
  body: string;
  image: BlogSectionImage | null;
  headingHint?: string;
  bodyHint?: string;
};

export type EditorPost = {
  id: string | null;
  slug: string;
  /** Once the slug is edited by hand (or the post exists), it stops following the title. */
  slugLocked: boolean;
  title: string;
  description: string;
  guildKey: BlogGuildKey;
  grade: 'all' | '2' | '3' | '4' | '5' | '6';
  status: BlogStatus;
  publishedAt: string | null;
  intro: string;
  curriculumNote: string;
  sections: EditorSection[];
  takeaways: string;
  links: { label: string; url: string }[];
  faq: { question: string; answer: string }[];
  image: BlogPostImage | null;
  template: string | null;
};

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function blankPost(template?: BlogTemplate): EditorPost {
  const sections: EditorSection[] = (template?.sections ?? [{ heading: '', headingHint: 'Section heading', bodyHint: 'Write the section. Leave a blank line between paragraphs.' }])
    .map((s) => ({ heading: s.heading, body: '', image: null, headingHint: s.headingHint, bodyHint: s.bodyHint }));
  const preset = template?.presets?.lastSectionParagraphs;
  if (preset && sections.length) sections[sections.length - 1].body = preset.join('\n\n');
  return {
    id: null,
    slug: '',
    slugLocked: false,
    title: '',
    description: '',
    guildKey: template?.guildKey ?? 'resources',
    grade: template?.grade === undefined ? 'all' : template.grade === 'all' ? 'all' : (String(template.grade) as EditorPost['grade']),
    status: 'draft',
    publishedAt: null,
    intro: '',
    curriculumNote: '',
    sections,
    takeaways: '',
    links: [],
    faq: template?.faq ? [{ question: '', answer: '' }] : [],
    image: null,
    template: template?.id ?? null,
  };
}

export function rowToEditor(row: BlogPostRow, template?: BlogTemplate): EditorPost {
  return {
    id: row.id,
    slug: row.slug,
    slugLocked: true,
    title: row.title,
    description: row.description,
    guildKey: row.guild_key,
    grade: row.grade == null ? 'all' : (String(row.grade) as EditorPost['grade']),
    status: row.status,
    publishedAt: row.published_at,
    intro: row.intro,
    curriculumNote: row.curriculum_note ?? '',
    sections: (row.sections ?? []).map((s, i) => ({
      heading: s.heading,
      body: (s.paragraphs ?? []).join('\n\n'),
      image: s.image ?? null,
      headingHint: template?.sections[i]?.headingHint,
      bodyHint: template?.sections[i]?.bodyHint,
    })),
    takeaways: (row.takeaways ?? []).join('\n'),
    links: row.external_links ?? [],
    faq: row.faq ?? [],
    image: row.image,
    template: row.template,
  };
}

const paragraphs = (body: string) => body.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

/** The save payload for /api/admin-blog (same shape as a blog_posts row). Also the JSON export format. */
export function editorToPayload(p: EditorPost) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    guild_key: p.guildKey,
    grade: p.grade === 'all' ? null : Number(p.grade),
    status: p.status,
    published_at: p.publishedAt,
    intro: p.intro,
    curriculum_note: p.curriculumNote || null,
    sections: p.sections.map((s) => ({ heading: s.heading.trim(), paragraphs: paragraphs(s.body), ...(s.image ? { image: s.image } : {}) })),
    takeaways: lines(p.takeaways),
    external_links: p.links.filter((l) => l.label.trim() && l.url.trim()),
    faq: p.faq.filter((f) => f.question.trim() && f.answer.trim()),
    image: p.image,
    template: p.template,
  };
}

/** Accepts the export format (or a bare blog_posts row) and turns it into an editor post. */
export function importJson(text: string, current: EditorPost): EditorPost {
  const raw = JSON.parse(text) as Partial<BlogPostRow> & { slug?: string };
  if (!raw || typeof raw !== 'object' || !raw.title) throw new Error('That JSON has no "title".');
  const row = {
    ...raw,
    id: current.id ?? '',
    slug: raw.slug || slugify(raw.title),
    description: raw.description ?? '',
    guild_key: raw.guild_key && raw.guild_key in BLOG_TOPICS ? raw.guild_key : 'resources',
    grade: raw.grade ?? null,
    status: current.status,
    published_at: current.publishedAt,
    intro: raw.intro ?? '',
    sections: raw.sections ?? [],
    takeaways: raw.takeaways ?? [],
    curriculum_note: raw.curriculum_note ?? null,
    external_links: raw.external_links ?? [],
    image: raw.image ?? null,
    faq: raw.faq ?? [],
    template: raw.template ?? current.template,
  } as BlogPostRow;
  return { ...rowToEditor(row), id: current.id, slugLocked: current.id ? true : !!raw.slug };
}

export function editorToPreview(p: EditorPost): BlogPost {
  const payload = editorToPayload(p);
  const topic = BLOG_TOPICS[p.guildKey];
  return {
    slug: p.slug || 'preview',
    title: p.title || 'Untitled post',
    description: p.description,
    guildKey: p.guildKey,
    guildName: topic.name,
    skill: topic.skill,
    grade: p.grade === 'all' ? 'all' : (Number(p.grade) as BlogPost['grade']),
    publishedAt: manilaDate(p.publishedAt),
    updatedAt: manilaDate(null),
    intro: p.intro,
    sections: payload.sections,
    takeaways: payload.takeaways,
    curriculumNote: p.curriculumNote || undefined,
    externalLinks: payload.external_links.length ? payload.external_links : undefined,
    image: p.image ?? undefined,
    faq: payload.faq.length ? payload.faq : undefined,
  };
}

export type DisplayStatus = 'draft' | 'scheduled' | 'published';

export function displayStatus(status: BlogStatus, publishedAt: string | null): DisplayStatus {
  if (status === 'draft') return 'draft';
  return publishedAt && new Date(publishedAt).getTime() > Date.now() ? 'scheduled' : 'published';
}

/** "Oct 4, 2026, 7:00 PM" in Manila time. */
export function formatManila(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in Manila, for <input type="datetime-local">. */
export function toManilaInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** "YYYY-MM-DDTHH:mm" read as Manila time -> ISO timestamp. */
export function fromManilaInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(`${value}:00+08:00`).toISOString();
}

export type CheckItem = { ok: boolean; label: string };

/** Non-blocking pre-publish checks, from the house rules in docs/blog/README.md. */
export function runChecks(p: EditorPost, template?: BlogTemplate): CheckItem[] {
  const payload = editorToPayload(p);
  const photos = [p.image, ...p.sections.map((s) => s.image)].filter(Boolean) as { alt: string }[];
  const checks: CheckItem[] = [
    { ok: !!p.title.trim(), label: 'Has a title' },
    { ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug), label: 'Has a valid address (slug)' },
    { ok: p.description.length >= 120 && p.description.length <= 170, label: 'Description is 120 to 170 characters (what Google shows)' },
    { ok: p.intro.trim().split(/\s+/).length >= 30, label: 'Intro is at least 30 words' },
    { ok: payload.sections.length > 0 && payload.sections.every((s) => s.heading && s.paragraphs.length), label: 'Every section has a heading and text' },
    { ok: payload.takeaways.length >= 3, label: 'At least 3 takeaways' },
    { ok: photos.every((ph) => ph.alt.trim().length > 0), label: 'Every photo has alt text' },
    { ok: !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(JSON.stringify(payload)), label: 'No emojis' },
  ];
  if (template?.curriculumNote) checks.push({ ok: !!p.curriculumNote.trim(), label: 'Curriculum note filled in (or deliberately empty)' });
  if (template?.faq) checks.push({ ok: payload.faq.length >= 3, label: 'At least 3 FAQ questions' });
  return checks;
}
