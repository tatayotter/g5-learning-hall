'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilePlus2, Search } from 'lucide-react';
import { callAdminApi } from '@/lib/adminApi';
import { BLOG_TOPICS, type BlogPostRow } from '@/lib/blogPosts';
import { BLOG_TEMPLATES, getTemplate } from '@/lib/blogTemplates';
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Segmented, Skeleton, cx } from '@/components/admin/ui';
import BlogEditor, { StatusBadge } from '@/components/admin/blog/BlogEditor';
import { blankPost, displayStatus, formatManila, rowToEditor, type EditorPost } from '@/components/admin/blog/editorModel';

// Admin Blog section: every post (drafts and scheduled included) with a filter and search,
// a template picker for new posts, and the editor (components/admin/blog/BlogEditor.tsx).
// Reads and writes go through the passcode-gated /api/admin-blog route.

type ListRow = Pick<BlogPostRow, 'id' | 'slug' | 'title' | 'description' | 'guild_key' | 'grade' | 'status' | 'published_at' | 'template' | 'updated_at'>;
type Filter = 'all' | 'published' | 'scheduled' | 'draft';

export default function BlogSection({ passcode }: { passcode: string }) {
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<{ kind: 'list' } | { kind: 'pick' } | { kind: 'edit'; post: EditorPost }>({ kind: 'list' });
  const [opening, setOpening] = useState<string | null>(null);

  // Bumped to reload the list (after closing the editor, or on Retry).
  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    callAdminApi<{ posts: ListRow[] }>('/api/admin-blog', { passcode, action: 'list' }).then((result) => {
      if (cancelled) return;
      if (!result.success) return setError(result.error || 'Could not load posts.');
      setError(null);
      setRows(result.posts ?? []);
    });
    return () => { cancelled = true; };
  }, [passcode, reloadKey]);

  const withStatus = useMemo(
    () => (rows ?? []).map((r) => ({ ...r, display: displayStatus(r.status, r.published_at) })),
    [rows],
  );
  const counts = useMemo(() => ({
    all: withStatus.length,
    published: withStatus.filter((r) => r.display === 'published').length,
    scheduled: withStatus.filter((r) => r.display === 'scheduled').length,
    draft: withStatus.filter((r) => r.display === 'draft').length,
  }), [withStatus]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus
      .filter((r) => filter === 'all' || r.display === filter)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.slug.includes(q))
      .sort((a, b) => {
        // Drafts first, then scheduled (soonest first), then published (newest first).
        const rank = { draft: 0, scheduled: 1, published: 2 } as const;
        if (rank[a.display] !== rank[b.display]) return rank[a.display] - rank[b.display];
        if (a.display === 'draft') return b.updated_at.localeCompare(a.updated_at);
        if (a.display === 'scheduled') return (a.published_at ?? '').localeCompare(b.published_at ?? '');
        return (b.published_at ?? '').localeCompare(a.published_at ?? '');
      });
  }, [withStatus, filter, query]);

  const open = async (id: string) => {
    setOpening(id);
    const result = await callAdminApi<{ post: BlogPostRow }>('/api/admin-blog', { passcode, action: 'get', id });
    setOpening(null);
    if (!result.success || !result.post) return setError(result.error || 'Could not open the post.');
    setMode({ kind: 'edit', post: rowToEditor(result.post, getTemplate(result.post.template)) });
  };

  if (mode.kind === 'edit') {
    return (
      <BlogEditor
        key={mode.post.id ?? 'new'}
        passcode={passcode}
        initial={mode.post}
        onClose={() => { setMode({ kind: 'list' }); load(); }}
      />
    );
  }

  if (mode.kind === 'pick') {
    return (
      <div>
        <PageHeader
          title="New post"
          description="Pick the kind of post. The editor pre-fills its structure, with hints in every empty field."
          actions={<Button variant="ghost" onClick={() => setMode({ kind: 'list' })}>Cancel</Button>}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {BLOG_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode({ kind: 'edit', post: blankPost(t) })}
              className={cx(
                'rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5 text-left transition-colors',
                'hover:border-[var(--a-accent)] hover:bg-[var(--a-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)]',
              )}
            >
              <p className="text-sm font-semibold text-[var(--a-ink)]">{t.name}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--a-ink-2)]">{t.summary}</p>
              <p className="mt-3 text-[11px] text-[var(--a-muted)]">e.g. {t.example}</p>
              <p className="mt-2 text-[11px] text-[var(--a-muted)]">
                {t.sections.length} sections{t.faq ? ' · FAQ' : ''}{t.curriculumNote ? ' · curriculum note' : ''}
              </p>
            </button>
          ))}
          <button
            onClick={() => setMode({ kind: 'edit', post: blankPost() })}
            className="rounded-xl border border-dashed border-[var(--a-border-strong)] p-5 text-left hover:border-[var(--a-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)]"
          >
            <p className="text-sm font-semibold text-[var(--a-ink)]">Blank post</p>
            <p className="mt-1 text-xs text-[var(--a-ink-2)]">One empty section, no hints.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Write, schedule and edit posts on learninghallph.com/blog."
        actions={<Button variant="primary" icon={FilePlus2} onClick={() => setMode({ kind: 'pick' })}>New post</Button>}
      />

      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={load} /></div>}

      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--a-border)] px-5 py-3">
          <Segmented
            ariaLabel="Filter posts"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All ${counts.all}` },
              { value: 'published', label: `Published ${counts.published}` },
              { value: 'scheduled', label: `Scheduled ${counts.scheduled}` },
              { value: 'draft', label: `Drafts ${counts.draft}` },
            ]}
          />
          <label className="relative ml-auto w-full sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--a-muted)]" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles"
              aria-label="Search posts"
              className="h-8 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-page)] pl-8 pr-3 text-sm text-[var(--a-ink)] placeholder:text-[var(--a-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--a-accent)]"
            />
          </label>
        </div>

        {rows === null && error ? (
          <EmptyState title="Posts could not be loaded" description="See the error above." />
        ) : rows === null ? (
          <div className="space-y-2 p-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState title="No posts here" description={query ? 'Nothing matches that search.' : 'Start one with New post.'} />
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {shown.map((r) => {
              const topic = BLOG_TOPICS[r.guild_key];
              return (
                <li key={r.id}>
                  <button
                    onClick={() => open(r.id)}
                    disabled={opening !== null}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left hover:bg-[var(--a-surface-2)] focus-visible:bg-[var(--a-surface-2)] focus-visible:outline-none disabled:opacity-60"
                  >
                    <div className="min-w-0 flex-1 basis-72">
                      <p className="truncate text-sm font-medium text-[var(--a-ink)]">{opening === r.id ? 'Opening...' : r.title}</p>
                      <p className="truncate text-xs text-[var(--a-muted)]">
                        {topic?.skill}{r.grade ? ` · Grade ${r.grade}` : ''} · /blog/{r.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-[var(--a-muted)]">
                        {r.display === 'draft' ? `Edited ${formatManila(r.updated_at)}` : formatManila(r.published_at)}
                      </span>
                      <StatusBadge status={r.display} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
