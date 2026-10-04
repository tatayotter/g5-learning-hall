/** A photo shown inside a section, below its paragraphs (e.g. event photos on a press-release post). */
export type BlogSectionImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type BlogSection = {
  heading: string;
  paragraphs: string[];
  image?: BlogSectionImage;
};

/**
 * A photographic hero/thumbnail image, self-hosted under /public/blog-images. Usually sourced
 * from a free-license stock site; `source: 'Learning Hall PH'` marks a photo we took ourselves
 * (e.g. at a school event), which needs no outbound credit link.
 */
export type BlogPostImage = {
  url: string;
  /** Descriptive, keyword-relevant alt text — also used as the OG/Twitter image alt. */
  alt: string;
  width: number;
  height: number;
  credit:
    | { name: string; source: 'Pexels' | 'Unsplash' | 'Pixabay'; sourceUrl: string }
    | { source: 'Learning Hall PH' };
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  guildKey: 'lorekeeper' | 'spellcaster' | 'numberrealm' | 'logiclabyrinth' | 'lexiconarena' | 'resources';
  guildName: string;
  skill: string;
  grade: 2 | 3 | 4 | 5 | 6 | 'all';
  publishedAt: string; // ISO date
  updatedAt: string; // ISO date
  intro: string;
  sections: BlogSection[];
  takeaways: string[];
  /**
   * What DepEd's own curriculum guide (MATATAG or the K-12 Curriculum Guide,
   * whichever is the current official source for that grade) actually asks
   * learners to do at this level, in plain language — grounds the post in a
   * verifiable source instead of a generic "developmentally appropriate" claim.
   * Left undefined where no DepEd subject/competency actually covers the skill
   * (e.g. typing, critical thinking) rather than inventing one.
   */
  curriculumNote?: string;
  /** Optional outbound links to third-party sites referenced in the post. */
  externalLinks?: { label: string; url: string }[];
  /**
   * Post-specific hero/thumbnail photo. Leave unset to fall back to
   * GUILD_HERO_IMAGES[guildKey] (see getPostImage) — used by the 25 skill/grade
   * guides that share one representative photo per skill. Set explicitly on
   * posts covering a unique topic (the "Resources" posts) that need their own art.
   */
  image?: BlogPostImage;
  /**
   * Optional Q&A pairs rendered as a visible FAQ section and FAQPage JSON-LD.
   * Only add these where the post genuinely answers questions people search —
   * forcing it onto a how-to guide just to get rich-result eligibility reads as
   * spammy to both Google and readers.
   */
  faq?: { question: string; answer: string }[];
};

// Types and pure helpers for blog posts. The posts themselves live in public.blog_posts and are
// written from the admin Blog section; server pages read them through lib/blogData.ts. This file
// stays free of data fetching so client components (the admin editor and its preview) can use it.

/** One representative photo per skill guild, shared across that guild's grade-specific posts. */
const GUILD_HERO_IMAGES: Partial<Record<BlogPost['guildKey'], BlogPostImage>> = {
  lorekeeper: {
    url: '/blog-images/child-reading-comprehension-practice.webp',
    alt: 'Grade school boy reading a book intently at home, practicing reading comprehension',
    width: 1200,
    height: 675,
    credit: { name: 'Timur Weber', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/a-boy-reading-a-book-9127063/' },
  },
  numberrealm: {
    url: '/blog-images/child-mental-math-number-sense.webp',
    alt: 'Child arranging colorful plastic numbers, practicing mental math and number sense',
    width: 1200,
    height: 675,
    credit: { name: 'Keira Burton', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/little-kid-playing-with-plastic-numbers-6623835/' },
  },
  spellcaster: {
    url: '/blog-images/child-typing-speed-practice.webp',
    alt: 'Grade school child typing on a laptop keyboard, building typing speed and accuracy',
    width: 1200,
    height: 675,
    credit: { name: 'Katerina Holmes', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/crop-adorable-schoolgirl-typing-on-wireless-laptop-at-wooden-desk-5905971/' },
  },
  logiclabyrinth: {
    url: '/blog-images/child-critical-thinking-puzzle.webp',
    alt: 'Child solving a jigsaw puzzle, building critical thinking and reasoning skills',
    width: 1200,
    height: 675,
    credit: { name: 'Kaboompics.com', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/overhead-shot-of-a-boy-in-a-brown-shirt-solving-a-jigsaw-puzzle-7269448/' },
  },
  lexiconarena: {
    url: '/blog-images/child-vocabulary-spelling-practice.webp',
    alt: 'Child writing in a notebook, practicing vocabulary and spelling',
    width: 1200,
    height: 675,
    credit: { name: 'Katerina Holmes', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/crop-ethnic-schoolkid-writing-in-notepad-5905888/' },
  },
};

/** Post's own image if set, otherwise the shared per-guild photo, otherwise null (caller falls back to the in-game sprite). */
export function getPostImage(post: BlogPost): BlogPostImage | null {
  return post.image ?? GUILD_HERO_IMAGES[post.guildKey] ?? null;
}

export const BLOG_POSTS_PER_PAGE = 10;

export type BlogGuildKey = BlogPost['guildKey'];
export type BlogStatus = 'draft' | 'published';

/** A post as stored in public.blog_posts (supabase/migrations/20261004170000_blog_posts.sql). */
export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  guild_key: BlogGuildKey;
  grade: number | null;
  status: BlogStatus;
  published_at: string | null;
  intro: string;
  sections: BlogSection[];
  takeaways: string[];
  curriculum_note: string | null;
  external_links: { label: string; url: string }[];
  image: BlogPostImage | null;
  faq: { question: string; answer: string }[];
  template: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns the public pages need, i.e. everything except bookkeeping. */
export const BLOG_POST_PUBLIC_COLUMNS =
  'slug, title, description, guild_key, grade, published_at, updated_at, intro, sections, takeaways, curriculum_note, external_links, image, faq';

/** The calendar date (YYYY-MM-DD) of a timestamp in Manila, which is what the blog shows. */
export function manilaDate(timestamp: string | null | undefined): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
}

type PublicRow = Pick<
  BlogPostRow,
  'slug' | 'title' | 'description' | 'guild_key' | 'grade' | 'published_at' | 'updated_at' | 'intro' | 'sections' | 'takeaways' | 'curriculum_note' | 'external_links' | 'image' | 'faq'
>;

export function rowToPost(row: PublicRow): BlogPost {
  const topic = BLOG_TOPICS[row.guild_key] ?? BLOG_TOPICS.resources;
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    guildKey: row.guild_key,
    guildName: topic.name,
    skill: topic.skill,
    grade: row.grade == null ? 'all' : (row.grade as BlogPost['grade']),
    publishedAt: manilaDate(row.published_at),
    updatedAt: manilaDate(row.updated_at),
    intro: row.intro,
    sections: row.sections ?? [],
    takeaways: row.takeaways ?? [],
    curriculumNote: row.curriculum_note || undefined,
    externalLinks: row.external_links?.length ? row.external_links : undefined,
    image: row.image ?? undefined,
    faq: row.faq?.length ? row.faq : undefined,
  };
}

export function sortNewestFirst(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.slug.localeCompare(b.slug)
  );
}

export function getRelatedPosts(posts: BlogPost[], post: BlogPost, limit = 3): BlogPost[] {
  const sameTopic = posts.filter((p) => p.slug !== post.slug && p.guildKey === post.guildKey);
  const others = posts.filter((p) => p.slug !== post.slug && p.guildKey !== post.guildKey);
  return [...sameTopic, ...others].slice(0, limit);
}

/**
 * Light formatting allowed in post text (rendered by components/blog/RichText.tsx):
 * **bold**, *italic* and [label](url). This strips it back to plain text for places that
 * can't render it: meta descriptions, JSON-LD, RSS.
 */
export function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

export const BLOG_TOPICS: Record<
  BlogPost['guildKey'],
  { name: string; skill: string; description: string }
> = {
  lorekeeper: {
    name: 'Lorekeeper',
    skill: 'Reading Comprehension',
    description: 'Guides for building reading comprehension in English and Filipino.',
  },
  spellcaster: {
    name: 'SpellCaster',
    skill: 'Typing Speed',
    description: 'Guides for building keyboarding speed and accuracy.',
  },
  numberrealm: {
    name: 'Number Realm',
    skill: 'Mental Math',
    description: 'Guides for building mental math fluency and number sense.',
  },
  logiclabyrinth: {
    name: 'Logic Labyrinth',
    skill: 'Critical Thinking & Reasoning',
    description: 'Guides for building critical thinking and reasoning skills.',
  },
  lexiconarena: {
    name: 'Lexicon Arena',
    skill: 'Spelling Recognition & Vocabulary',
    description: 'Guides for building spelling and vocabulary that lasts.',
  },
  resources: {
    name: 'Resources',
    skill: 'Resources',
    description: 'Where Learning Hall\'s own quizzes and lesson flow come from, and other resources worth knowing about.',
  },
};

/** Returns null for categories with no matching in-game guild sprite (e.g. "resources"). */
export function getGuildImage(guildKey: BlogPost['guildKey']): string | null {
  if (guildKey === 'resources') return null;
  return `/sidequests/${guildKey}.webp`;
}

/**
 * The 5 research-backed "authority" posts — one per guild — that expand each
 * guild's /guilds/[guild] "science" summary into a fully cited article. Kept
 * as an explicit slug list (rather than inferred from date or a tag) so this
 * set stays exactly these 5 even as newer posts get published later and stop
 * being the newest-by-date. Order matches BLOG_TOPICS (lorekeeper → spellcaster
 * → numberrealm → logiclabyrinth → lexiconarena), not publish date.
 */
export const SCIENCE_POST_SLUGS = [
  'testing-effect-why-quizzing-beats-rereading',
  'orthographic-mapping-why-spelling-practice-must-be-timed',
  'procedural-fluency-why-math-facts-need-to-be-automatic',
  'fluid-intelligence-why-puzzles-build-real-thinking-skills',
  'dual-coding-why-meaning-and-spelling-should-be-learned-together',
] as const;

