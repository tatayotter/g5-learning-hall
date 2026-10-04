-- pgTAP tests for 20261004160000_blog_posts: anon/authenticated see a post only once it is
-- published and its publish time has passed (drafts and scheduled posts stay hidden), and
-- neither role can write posts directly.

begin;
create extension if not exists pgtap;
select plan(7);

insert into public.blog_posts (slug, title, status, published_at) values
  ('pgtap-live-post', 'Live', 'published', now() - interval '1 hour'),
  ('pgtap-scheduled-post', 'Scheduled', 'published', now() + interval '1 day'),
  ('pgtap-draft-post', 'Draft', 'draft', null);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, status) values ('pgtap-bad', 'Bad', 'published') $$,
  '23514', null,
  'a published post must have a publish date'
);
select throws_ok(
  $$ insert into public.blog_posts (slug, title) values ('Not A Slug', 'Bad') $$,
  '23514', null,
  'slugs must be lowercase words joined by hyphens'
);

set local role anon;

select results_eq(
  $$ select slug from public.blog_posts where slug like 'pgtap-%' order by slug $$,
  array['pgtap-live-post'],
  'anon sees only the published post whose time has passed'
);
select throws_ok(
  $$ insert into public.blog_posts (slug, title) values ('pgtap-anon-insert', 'Nope') $$,
  '42501', null,
  'anon cannot insert posts'
);
select is_empty(
  $$ update public.blog_posts set title = 'Hacked' where slug = 'pgtap-live-post' returning id $$,
  'anon cannot update posts'
);

reset role;
select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
set local role authenticated;

select results_eq(
  $$ select slug from public.blog_posts where slug like 'pgtap-%' order by slug $$,
  array['pgtap-live-post'],
  'authenticated sees only the published post whose time has passed'
);
select is_empty(
  $$ delete from public.blog_posts where slug = 'pgtap-live-post' returning id $$,
  'authenticated cannot delete posts'
);

reset role;
select * from finish();
rollback;
