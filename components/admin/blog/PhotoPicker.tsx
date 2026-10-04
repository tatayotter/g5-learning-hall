'use client';
import { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { Field, SelectInput, TextInput } from '@/components/admin/blog/fields';
import { optimizeImage } from '@/components/admin/blog/optimizeImage';
import type { BlogPostImage, BlogSectionImage } from '@/lib/blogPosts';

// Upload-and-describe control for a post's main photo or a section photo. The file is shrunk
// and stripped of metadata in the browser (optimizeImage), then stored via /api/admin-blog-image.

async function uploadPhoto(passcode: string, input: File) {
  const optimized = await optimizeImage(input);
  const form = new FormData();
  form.append('passcode', passcode);
  form.append('file', optimized.file);
  const res = await fetch('/api/admin-blog-image', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed.');
  return { url: json.url as string, width: optimized.width, height: optimized.height, before: optimized.originalBytes, after: optimized.file.size };
}

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

function useUpload(passcode: string) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (file: File) => {
    setBusy(true); setError(null); setNote(null);
    try {
      const r = await uploadPhoto(passcode, file);
      setNote(`Optimized ${kb(r.before)} to ${kb(r.after)}, ${r.width}x${r.height}, location data removed.`);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, note, error, run };
}

function PickButton({ busy, hasPhoto, onFile }: { busy: boolean; hasPhoto: boolean; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
      <Button size="sm" icon={hasPhoto ? RefreshCw : ImagePlus} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Optimizing...' : hasPhoto ? 'Replace photo' : 'Upload photo'}
      </Button>
    </>
  );
}

function Thumb({ url }: { url: string }) {
  // Plain <img>: the admin preview shouldn't depend on the image optimizer's allow-list.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="max-h-44 w-full rounded-lg border border-[var(--a-border)] object-contain bg-[var(--a-page)]" />;
}

export function HeroPhotoPicker({ passcode, value, onChange, hint }: {
  passcode: string; value: BlogPostImage | null; onChange: (v: BlogPostImage | null) => void; hint?: string;
}) {
  const { busy, note, error, run } = useUpload(passcode);
  const credit = value?.credit;
  const stock = credit && credit.source !== 'Learning Hall PH' ? credit : null;

  return (
    <div className="space-y-3">
      {value ? <Thumb url={value.url} /> : <p className="text-xs text-[var(--a-muted)]">{hint || 'No photo. Skill posts fall back to the topic photo.'}</p>}
      <div className="flex flex-wrap gap-2">
        <PickButton busy={busy} hasPhoto={!!value} onFile={async (f) => {
          const r = await run(f);
          if (r) onChange({ url: r.url, width: r.width, height: r.height, alt: value?.alt ?? '', credit: value?.credit ?? { source: 'Learning Hall PH' } });
        }} />
        {value && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange(null)}>Remove</Button>}
      </div>
      {note && <p className="text-[11px] text-[var(--a-good)]">{note}</p>}
      {error && <p role="alert" className="text-[11px] text-[var(--a-critical)]">{error}</p>}
      {value && (
        <>
          <Field label="Alt text" hint="Describe the photo for screen readers and Google, e.g. who is doing what, where.">
            <TextInput value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
          </Field>
          <Field label="Photo credit">
            <SelectInput
              value={stock ? stock.source : 'Learning Hall PH'}
              onChange={(e) => {
                const source = e.target.value;
                onChange({
                  ...value,
                  credit: source === 'Learning Hall PH'
                    ? { source: 'Learning Hall PH' }
                    : { source: source as 'Pexels' | 'Unsplash' | 'Pixabay', name: stock?.name ?? '', sourceUrl: stock?.sourceUrl ?? '' },
                });
              }}
            >
              <option value="Learning Hall PH">Our own photo</option>
              <option value="Pexels">Pexels</option>
              <option value="Unsplash">Unsplash</option>
              <option value="Pixabay">Pixabay</option>
            </SelectInput>
          </Field>
          {stock && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Photographer">
                <TextInput value={stock.name} onChange={(e) => onChange({ ...value, credit: { ...stock, name: e.target.value } })} />
              </Field>
              <Field label="Photo page URL">
                <TextInput value={stock.sourceUrl} onChange={(e) => onChange({ ...value, credit: { ...stock, sourceUrl: e.target.value } })} />
              </Field>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SectionPhotoPicker({ passcode, value, onChange }: {
  passcode: string; value: BlogSectionImage | null; onChange: (v: BlogSectionImage | null) => void;
}) {
  const { busy, note, error, run } = useUpload(passcode);
  return (
    <div className="space-y-3">
      {value && <Thumb url={value.url} />}
      <div className="flex flex-wrap gap-2">
        <PickButton busy={busy} hasPhoto={!!value} onFile={async (f) => {
          const r = await run(f);
          if (r) onChange({ url: r.url, width: r.width, height: r.height, alt: value?.alt ?? '', caption: value?.caption });
        }} />
        {value && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange(null)}>Remove photo</Button>}
      </div>
      {note && <p className="text-[11px] text-[var(--a-good)]">{note}</p>}
      {error && <p role="alert" className="text-[11px] text-[var(--a-critical)]">{error}</p>}
      {value && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Alt text">
            <TextInput value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
          </Field>
          <Field label="Caption (optional)">
            <TextInput value={value.caption ?? ''} onChange={(e) => onChange({ ...value, caption: e.target.value || undefined })} />
          </Field>
        </div>
      )}
    </div>
  );
}
