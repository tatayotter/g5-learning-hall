'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, CalendarClock, Check, Circle, ClipboardPaste, Copy, ExternalLink, ImagePlus, Plus, Save, Send, Trash2, Undo2, X,
} from 'lucide-react';
import { callAdminApi } from '@/lib/adminApi';
import { BLOG_TOPICS, type BlogGuildKey, type BlogPostRow } from '@/lib/blogPosts';
import { getTemplate } from '@/lib/blogTemplates';
import { Badge, Button, Card, Segmented, cx } from '@/components/admin/ui';
import { Field, SelectInput, TextArea, TextInput, charCount } from '@/components/admin/blog/fields';
import { HeroPhotoPicker, SectionPhotoPicker } from '@/components/admin/blog/PhotoPicker';
import BlogPreview from '@/components/admin/blog/BlogPreview';
import {
  displayStatus, editorToPayload, editorToPreview, formatManila, fromManilaInput, importJson, rowToEditor, runChecks, slugify,
  toManilaInput, type EditorPost, type EditorSection,
} from '@/components/admin/blog/editorModel';

const FORMAT_HINT = 'Formatting: **bold**, *italic*, [link text](/blog/some-post or https://...). Blank line = new paragraph.';

type Flash = { tone: 'good' | 'critical'; text: string } | null;

export default function BlogEditor({ passcode, initial, onClose }: {
  passcode: string; initial: EditorPost; onClose: () => void;
}) {
  const [post, setPost] = useState<EditorPost>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(editorToPayload(initial)));
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduleAt, setScheduleAt] = useState(() => toManilaInput(initial.publishedAt));
  const [jsonOpen, setJsonOpen] = useState(false);
  const [sectionPhotoOpen, setSectionPhotoOpen] = useState<Set<number>>(new Set());

  const template = getTemplate(post.template);
  const status = displayStatus(post.status, post.publishedAt);
  const dirty = JSON.stringify(editorToPayload(post)) !== saved;
  const checks = useMemo(() => runChecks(post, template), [post, template]);
  const preview = useMemo(() => editorToPreview(post), [post]);

  const set = <K extends keyof EditorPost>(key: K, value: EditorPost[K]) => setPost((p) => ({ ...p, [key]: value }));
  const setSection = (i: number, patch: Partial<EditorSection>) =>
    setPost((p) => ({ ...p, sections: p.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveSection = (i: number, dir: -1 | 1) => setPost((p) => {
    const next = [...p.sections];
    const j = i + dir;
    if (j < 0 || j >= next.length) return p;
    [next[i], next[j]] = [next[j], next[i]];
    return { ...p, sections: next };
  });

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const save = useCallback(async (next: Partial<Pick<EditorPost, 'status' | 'publishedAt'>>, success: string) => {
    const target = { ...post, ...next };
    setBusy(true);
    const result = await callAdminApi<{ post: BlogPostRow }>('/api/admin-blog', { passcode, action: 'save', post: editorToPayload(target) });
    setBusy(false);
    if (!result.success || !result.post) {
      setFlash({ tone: 'critical', text: result.error || 'Could not save.' });
      return;
    }
    const fresh = { ...rowToEditor(result.post, template), sections: rowToEditor(result.post, template).sections.map((s, i) => ({ ...s, headingHint: post.sections[i]?.headingHint ?? s.headingHint, bodyHint: post.sections[i]?.bodyHint ?? s.bodyHint })) };
    setPost(fresh);
    setSaved(JSON.stringify(editorToPayload(fresh)));
    setScheduleAt(toManilaInput(fresh.publishedAt));
    setFlash({ tone: 'good', text: success });
  }, [passcode, post, template]);

  const saveInPlace = useCallback(() => save({}, status === 'draft' ? 'Draft saved.' : 'Changes saved and live.'), [save, status]);

  // Ctrl/Cmd+S saves without changing the status.
  const saveRef = useRef(saveInPlace);
  useEffect(() => { saveRef.current = saveInPlace; }, [saveInPlace]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!busy) saveRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy]);

  const publish = () => {
    if (publishMode === 'now') return save({ status: 'published', publishedAt: new Date().toISOString() }, 'Published. It is live now.');
    const at = fromManilaInput(scheduleAt);
    if (!at) return setFlash({ tone: 'critical', text: 'Pick a date and time to schedule.' });
    if (new Date(at).getTime() <= Date.now()) return setFlash({ tone: 'critical', text: 'That time has already passed. Pick a future time or use Publish now.' });
    return save({ status: 'published', publishedAt: at }, `Scheduled for ${formatManila(at)}. It goes live on its own within 5 minutes of that time.`);
  };

  const remove = async () => {
    if (!post.id) return onClose();
    if (!confirm(`Delete "${post.title || 'this post'}" permanently? This can't be undone.`)) return;
    setBusy(true);
    const result = await callAdminApi('/api/admin-blog', { passcode, action: 'delete', id: post.id });
    setBusy(false);
    if (!result.success) return setFlash({ tone: 'critical', text: result.error || 'Could not delete.' });
    onClose();
  };

  const close = () => {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    onClose();
  };

  const copyJson = async () => {
    const { id: _id, status: _s, published_at: _p, ...exportable } = editorToPayload(post);
    void _id; void _s; void _p;
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportable, null, 2));
      setFlash({ tone: 'good', text: 'Post copied as JSON.' });
    } catch {
      setFlash({ tone: 'critical', text: 'Could not copy to the clipboard.' });
    }
  };

  const failing = checks.filter((c) => !c.ok).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={close}>All posts</Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-[var(--a-ink)]">{post.title || 'Untitled post'}</h1>
            <StatusBadge status={status} />
            {dirty && <span className="text-xs text-[var(--a-warning)]">Unsaved changes</span>}
          </div>
          {template && <p className="text-xs text-[var(--a-muted)]">Template: {template.name}</p>}
        </div>
        <Segmented ariaLabel="View" value={view} onChange={setView} options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]} />
        <Button size="sm" icon={Save} disabled={busy} onClick={saveInPlace}>{status === 'draft' ? 'Save draft' : 'Save changes'}</Button>
      </div>

      {flash && (
        <div
          role="status"
          className={cx(
            'mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
            flash.tone === 'good' ? 'border-[var(--a-good)]/40 bg-[var(--a-good)]/10' : 'border-[var(--a-critical)]/40 bg-[var(--a-critical)]/10',
          )}
        >
          <span>{flash.text}</span>
          <button onClick={() => setFlash(null)} aria-label="Dismiss" className="text-[var(--a-muted)] hover:text-[var(--a-ink)]"><X size={16} /></button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          {view === 'preview' ? (
            <BlogPreview post={preview} />
          ) : (
            <>
              <Card title="Basics">
                <div className="space-y-4">
                  <Field label="Title" hint={template?.titleHint}>
                    <TextInput
                      value={post.title}
                      placeholder={template?.example ?? 'Post title'}
                      onChange={(e) => {
                        const title = e.target.value;
                        setPost((p) => ({ ...p, title, slug: p.slugLocked ? p.slug : slugify(title) }));
                      }}
                    />
                  </Field>
                  <Field
                    label="Address (slug)"
                    hint={
                      <>
                        learninghallph.com/blog/<span className="text-[var(--a-ink-2)]">{post.slug || '...'}</span>
                        {status !== 'draft' && ' · Changing this on a live post breaks links people already shared.'}
                      </>
                    }
                  >
                    <TextInput
                      value={post.slug}
                      onChange={(e) => setPost((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'), slugLocked: true }))}
                    />
                  </Field>
                  <Field label="Description" counter={charCount(post.description, 120, 170)} hint={template?.descriptionHint ?? 'Shown in Google results and link previews.'}>
                    <TextArea rows={2} value={post.description} onChange={(e) => set('description', e.target.value.replace(/\n/g, ' '))} />
                  </Field>
                  <Field label="Intro" hint={FORMAT_HINT}>
                    <TextArea rows={5} value={post.intro} placeholder={template?.introHint} onChange={(e) => set('intro', e.target.value)} />
                  </Field>
                  {(template?.curriculumNote || post.curriculumNote) && (
                    <Field label="Curriculum note: what DepEd actually asks at this level" hint={template?.curriculumNoteHint}>
                      <TextArea rows={3} value={post.curriculumNote} onChange={(e) => set('curriculumNote', e.target.value)} />
                    </Field>
                  )}
                </div>
              </Card>

              {post.sections.map((section, i) => (
                <Card
                  key={i}
                  title={`Section ${i + 1}`}
                  actions={
                    <>
                      <Button size="sm" variant="ghost" icon={ArrowUp} aria-label="Move up" disabled={i === 0} onClick={() => moveSection(i, -1)} />
                      <Button size="sm" variant="ghost" icon={ArrowDown} aria-label="Move down" disabled={i === post.sections.length - 1} onClick={() => moveSection(i, 1)} />
                      <Button
                        size="sm" variant="ghost" icon={Trash2} aria-label="Delete section"
                        onClick={() => {
                          if ((section.heading || section.body) && !confirm('Delete this section?')) return;
                          setPost((p) => ({ ...p, sections: p.sections.filter((_, j) => j !== i) }));
                        }}
                      />
                    </>
                  }
                >
                  <div className="space-y-4">
                    <Field label="Heading">
                      <TextInput value={section.heading} placeholder={section.headingHint} onChange={(e) => setSection(i, { heading: e.target.value })} />
                    </Field>
                    <Field label="Text" hint={FORMAT_HINT}>
                      <TextArea rows={7} value={section.body} placeholder={section.bodyHint} onChange={(e) => setSection(i, { body: e.target.value })} />
                    </Field>
                    {section.image || sectionPhotoOpen.has(i) ? (
                      <SectionPhotoPicker passcode={passcode} value={section.image} onChange={(image) => setSection(i, { image })} />
                    ) : (
                      <Button size="sm" variant="ghost" icon={ImagePlus} onClick={() => setSectionPhotoOpen((s) => new Set(s).add(i))}>Add a photo to this section</Button>
                    )}
                  </div>
                </Card>
              ))}
              <Button
                icon={Plus}
                onClick={() => setPost((p) => ({ ...p, sections: [...p.sections, { heading: '', body: '', image: null, headingHint: 'Section heading', bodyHint: 'Write the section.' }] }))}
              >
                Add section
              </Button>

              <Card title="Quick takeaways" description={template?.takeawaysHint ?? 'One per line. Shown in a box at the end of the post.'}>
                <TextArea rows={5} value={post.takeaways} placeholder="One takeaway per line" onChange={(e) => set('takeaways', e.target.value)} />
              </Card>

              <Card title="FAQ" description={template?.faqHint ?? 'Optional. Questions people search; shown on the page and to Google as FAQ results.'}>
                <div className="space-y-4">
                  {post.faq.map((item, i) => (
                    <div key={i} className="space-y-2 rounded-lg border border-[var(--a-border)] p-3">
                      <div className="flex gap-2">
                        <TextInput
                          value={item.question}
                          placeholder="Question, as a parent would type it into Google"
                          onChange={(e) => set('faq', post.faq.map((f, j) => (j === i ? { ...f, question: e.target.value } : f)))}
                        />
                        <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove question" onClick={() => set('faq', post.faq.filter((_, j) => j !== i))} />
                      </div>
                      <TextArea
                        rows={3}
                        value={item.answer}
                        placeholder="Two or three sentence answer"
                        onChange={(e) => set('faq', post.faq.map((f, j) => (j === i ? { ...f, answer: e.target.value } : f)))}
                      />
                    </div>
                  ))}
                  <Button size="sm" icon={Plus} onClick={() => set('faq', [...post.faq, { question: '', answer: '' }])}>Add question</Button>
                </div>
              </Card>

              <Card title="Links" description={template?.linksHint ?? 'Shown as buttons after the last section. Use /path for pages on this site.'}>
                <div className="space-y-2">
                  {post.links.map((link, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                      <TextInput value={link.label} placeholder="Label" onChange={(e) => set('links', post.links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))} />
                      <TextInput value={link.url} placeholder="/curriculum or https://..." onChange={(e) => set('links', post.links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))} />
                      <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove link" onClick={() => set('links', post.links.filter((_, j) => j !== i))} />
                    </div>
                  ))}
                  <Button size="sm" icon={Plus} onClick={() => set('links', [...post.links, { label: '', url: '' }])}>Add link</Button>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card title="Publishing">
            <div className="space-y-4">
              <p className="text-sm text-[var(--a-ink-2)]">
                {status === 'draft' && 'Draft. Only visible here.'}
                {status === 'scheduled' && <>Scheduled for <strong className="text-[var(--a-ink)]">{formatManila(post.publishedAt)}</strong> (Manila time).</>}
                {status === 'published' && <>Live since <strong className="text-[var(--a-ink)]">{formatManila(post.publishedAt)}</strong>.</>}
              </p>

              {status === 'draft' ? (
                <>
                  <Segmented
                    ariaLabel="When to publish"
                    value={publishMode}
                    onChange={setPublishMode}
                    options={[{ value: 'now', label: 'Publish now' }, { value: 'schedule', label: 'Schedule' }]}
                  />
                  {publishMode === 'schedule' && (
                    <Field label="Go live at (Manila time)">
                      <TextInput type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                    </Field>
                  )}
                  {failing > 0 && <p className="text-xs text-[var(--a-warning)]">{failing} checklist item{failing > 1 ? 's' : ''} still open. You can still publish.</p>}
                  <Button variant="primary" className="w-full" icon={publishMode === 'now' ? Send : CalendarClock} disabled={busy} onClick={publish}>
                    {publishMode === 'now' ? 'Publish now' : 'Schedule'}
                  </Button>
                </>
              ) : (
                <>
                  <Field label={status === 'scheduled' ? 'Go live at (Manila time)' : 'Publish date (Manila time)'} hint="Changing this and saving moves the post's date.">
                    <TextInput type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                  </Field>
                  <Button
                    variant="primary" className="w-full" icon={Save} disabled={busy}
                    onClick={() => {
                      const at = fromManilaInput(scheduleAt);
                      if (!at) return setFlash({ tone: 'critical', text: 'Pick a valid date and time.' });
                      const nowLive = new Date(at).getTime() <= Date.now();
                      return save({ publishedAt: at }, nowLive ? 'Changes saved and live.' : `Saved. Goes live ${formatManila(at)}.`);
                    }}
                  >
                    {status === 'scheduled' ? 'Update schedule' : 'Update post'}
                  </Button>
                  {status === 'published' && post.slug && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-xs text-[var(--a-accent)] hover:underline"
                    >
                      View live post <ExternalLink size={12} aria-hidden />
                    </a>
                  )}
                  <Button className="w-full" variant="ghost" icon={Undo2} disabled={busy} onClick={() => save({ status: 'draft' }, 'Moved back to drafts. It is no longer on the blog.')}>
                    {status === 'scheduled' ? 'Cancel schedule (back to draft)' : 'Unpublish (back to draft)'}
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card title="Topic">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Topic">
                <SelectInput value={post.guildKey} onChange={(e) => set('guildKey', e.target.value as BlogGuildKey)}>
                  {Object.entries(BLOG_TOPICS).map(([key, t]) => (
                    <option key={key} value={key}>{t.skill === t.name ? t.name : `${t.skill} (${t.name})`}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Grade">
                <SelectInput value={post.grade} onChange={(e) => set('grade', e.target.value as EditorPost['grade'])}>
                  <option value="all">All grades</option>
                  {['2', '3', '4', '5', '6'].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </SelectInput>
              </Field>
            </div>
          </Card>

          <Card title="Main photo" description="Shown at the top of the post and in link previews.">
            <HeroPhotoPicker passcode={passcode} value={post.image} onChange={(image) => set('image', image)} hint={template?.photoHint} />
          </Card>

          <Card title="Checklist" description="House rules from docs/blog/README.md.">
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-xs">
                  {c.ok
                    ? <Check size={14} className="mt-px shrink-0 text-[var(--a-good)]" aria-label="Done" />
                    : <Circle size={14} className="mt-px shrink-0 text-[var(--a-muted)]" aria-label="Not yet" />}
                  <span className={c.ok ? 'text-[var(--a-ink-2)]' : 'text-[var(--a-ink)]'}>{c.label}</span>
                </li>
              ))}
              {template?.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs">
                  <Circle size={14} className="mt-px shrink-0 text-[var(--a-warning)]" aria-hidden />
                  <span className="text-[var(--a-ink)]">Check yourself: {item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Import / export" description="Paste a post Claude wrote for you, or copy this one.">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={ClipboardPaste} onClick={() => setJsonOpen(true)}>Paste JSON</Button>
              <Button size="sm" icon={Copy} onClick={copyJson}>Copy as JSON</Button>
            </div>
          </Card>

          {post.id && (
            <Button variant="ghost" className="w-full text-[var(--a-critical)]" icon={Trash2} disabled={busy} onClick={remove}>
              Delete post
            </Button>
          )}
        </div>
      </div>

      {jsonOpen && (
        <JsonImportDialog
          onClose={() => setJsonOpen(false)}
          onImport={(text) => {
            try {
              setPost((p) => importJson(text, p));
              setJsonOpen(false);
              setFlash({ tone: 'good', text: 'Imported. Review it, then save.' });
            } catch (e) {
              setFlash({ tone: 'critical', text: e instanceof Error ? `Could not import: ${e.message}` : 'Could not import that JSON.' });
            }
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'draft' | 'scheduled' | 'published' }) {
  if (status === 'published') return <Badge tone="good">Published</Badge>;
  if (status === 'scheduled') return <Badge tone="info">Scheduled</Badge>;
  return <Badge>Draft</Badge>;
}

export { StatusBadge };

function JsonImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#000000]/60" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Paste post JSON" className="relative w-full max-w-2xl rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5 shadow-2xl">
        <h2 className="text-sm font-semibold text-[var(--a-ink)]">Paste post JSON</h2>
        <p className="mt-1 mb-3 text-xs text-[var(--a-muted)]">
          Replaces this post&apos;s content (title, text, photos, links, FAQ). Its status and publish date stay as they are.
        </p>
        <TextArea rows={14} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!text.trim()} onClick={() => onImport(text)}>Import</Button>
        </div>
      </div>
    </div>
  );
}
