-- Blog posts move out of lib/blogPosts.ts into the database so they can be written, scheduled
-- and edited from the admin Blog section (components/admin/BlogSection.tsx).
--
-- Reads: anyone may read a post once it is published and its publish time has passed, which is
-- also how scheduled posts go live on their own (the public blog pages revalidate every few
-- minutes). Drafts and future-dated posts are invisible to anon/authenticated.
-- Writes: none for anon/authenticated. Every write goes through the passcode-gated
-- /api/admin-blog route with the service-role client, which bypasses RLS.
--
-- Photos uploaded from the editor go to the public `blog-images` storage bucket, written only by
-- the passcode-gated /api/admin-blog-image route (service role). Photos that shipped with the
-- original posts stay where they are, under /public/blog-images.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  guild_key text not null default 'resources',
  -- null = all grades
  grade smallint,
  status text not null default 'draft',
  -- When the post goes (or went) live. Null only for drafts that were never given a date.
  published_at timestamptz,
  intro text not null default '',
  -- [{ heading, paragraphs: string[], image?: { url, alt, width, height, caption? } }]
  sections jsonb not null default '[]'::jsonb,
  takeaways jsonb not null default '[]'::jsonb,
  curriculum_note text,
  -- [{ label, url }]
  external_links jsonb not null default '[]'::jsonb,
  -- { url, alt, width, height, credit } or null
  image jsonb,
  -- [{ question, answer }]
  faq jsonb not null default '[]'::jsonb,
  -- lib/blogTemplates.ts id the post was started from; informational only
  template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_slug_format' and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table only public.blog_posts
      add constraint blog_posts_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_guild_key_valid' and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table only public.blog_posts
      add constraint blog_posts_guild_key_valid check (guild_key in (
        'lorekeeper', 'spellcaster', 'numberrealm', 'logiclabyrinth', 'lexiconarena', 'resources'
      ));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_grade_valid' and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table only public.blog_posts
      add constraint blog_posts_grade_valid check (grade is null or grade between 2 and 6);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_status_valid' and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table only public.blog_posts
      add constraint blog_posts_status_valid check (status in ('draft', 'published'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'blog_posts_published_has_date' and conrelid = 'public.blog_posts'::regclass
  ) then
    alter table only public.blog_posts
      add constraint blog_posts_published_has_date check (status = 'draft' or published_at is not null);
  end if;
end $$;

create index if not exists blog_posts_published_idx on public.blog_posts (published_at desc) where status = 'published';

alter table public.blog_posts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'blog_posts: public read published'
  ) then
    create policy "blog_posts: public read published" on public.blog_posts
      for select to anon, authenticated
      using (status = 'published' and published_at <= now());
  end if;
end $$;

-- Public bucket for editor uploads. Public buckets serve objects by URL without a SELECT policy;
-- no INSERT/UPDATE/DELETE policies, so only the service role can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 4194304, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
