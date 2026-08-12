-- Every *_public view in this schema is owned by postgres (a superuser
-- that bypasses RLS unconditionally) and is a simple single-table SELECT,
-- which Postgres treats as automatically updatable. The project's default
-- privileges grant anon/authenticated ALL (not just SELECT) on new public-
-- schema relations, so every one of these views ended up with
-- INSERT/UPDATE/DELETE grants nobody intended and nothing legitimately
-- uses. Regardless of the exact Postgres semantics for how RLS interacts
-- with auto-updatable-view writes through a superuser-owned view, there is
-- no reason for that surface to exist at all -- these views exist purely
-- to be read. Revoking write grants closes it outright rather than relying
-- on it being merely theoretical.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.content_questions_public,
  public.children_public,
  public.classmates_public,
  public.event_quests_public,
  public.weekly_packages_public,
  public.draft_questions_public
FROM anon, authenticated;
