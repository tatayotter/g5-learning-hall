'use client';
// Admin authoring for the Student Enrichment Content (SEC) Shop catalog —
// docs/sec-shop-design.md open item #5, "admin_* + passcode pattern the
// rest of the admin surface already uses." Mirrors EggChainsSection.tsx's
// shape (inline create/edit form + list below). No delete: unpublishing via
// the Active toggle is the only removal path, since sec_packs.id is FK'd
// from real purchase history in sec_entitlements.
import { useEffect, useState } from 'react';
import { callAdminApi } from '@/lib/adminApi';

interface SecPack {
  id: string;
  grade: number;
  category: string;
  title: string;
  description: string;
  price_php: number;
  content_ref: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

const GRADES = [2, 3, 4, 5, 6];

const emptyForm = () => ({
  id: '', grade: 2, category: 'math_enrichment', title: '', description: '', pricePhp: 99, contentRef: '{"grade": 2}',
});

export default function SecPacksSection({ passcode }: { passcode: string }) {
  const [packs, setPacks] = useState<SecPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    const result = await callAdminApi<{ packs: SecPack[] }>('/api/admin-sec-packs', { passcode, action: 'list_packs' });
    if (result.success) setPacks(result.packs || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Editing an existing pack loads its row into the form (id becomes
  // read-only via the disabled input below — id is the primary key AND the
  // sec_entitlements.pack_id FK target, so changing it here would silently
  // orphan any real purchases rather than update them).
  const startEdit = (pack: SecPack) => {
    setEditingId(pack.id);
    setForm({
      id: pack.id, grade: pack.grade, category: pack.category, title: pack.title,
      description: pack.description, pricePhp: pack.price_php, contentRef: JSON.stringify(pack.content_ref),
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  // Grade is the whole purchase boundary for v1 (docs/sec-shop-design.md:
  // "one SEC pack per grade per category") so content_ref defaults to
  // matching the picked grade — still editable for a future category whose
  // content isn't a flat grade filter.
  const handleGradeChange = (grade: number) => {
    setForm((f) => ({ ...f, grade, contentRef: JSON.stringify({ grade }) }));
  };

  const handleSave = async () => {
    setError('');
    let parsedContentRef: Record<string, unknown>;
    try {
      parsedContentRef = JSON.parse(form.contentRef);
    } catch {
      setError('Content ref must be valid JSON, e.g. {"grade": 2}');
      return;
    }
    if (!form.id || !form.title || !form.description) {
      setError('Id, title, and description are required.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-sec-packs', {
      passcode, action: 'upsert_pack',
      id: form.id, grade: form.grade, category: form.category, title: form.title,
      description: form.description, pricePhp: Number(form.pricePhp), contentRef: parsedContentRef,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Save failed.');
      return;
    }
    cancelEdit();
    reload();
  };

  const handleToggleActive = async (pack: SecPack) => {
    const verb = pack.active ? 'unpublish' : 'republish';
    if (!confirm(`${verb === 'unpublish' ? 'Unpublish' : 'Republish'} "${pack.title}"? ${pack.active ? 'Existing owners keep access; it just disappears from the Shop.' : 'It reappears in the Shop for new purchases.'}`)) return;
    const result = await callAdminApi('/api/admin-sec-packs', { passcode, action: 'set_active', id: pack.id, active: !pack.active });
    if (!result.success) {
      alert(`❌ ${verb} failed: ${result.error}`);
      return;
    }
    reload();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">🛍️ SEC Packs</h2>
      <p className="text-[#8a7c66] text-sm mb-6">
        Student Enrichment Content catalog — one-time paid quest-line packs sold in the parent Shop.
        Unpublishing keeps existing buyers&apos; access; it just stops new sales.
      </p>

      <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4 mb-8 space-y-3">
        <p className="text-xs text-[#8a7c66] uppercase tracking-widest">{editingId ? `Editing: ${editingId}` : 'New pack'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Id (slug)</label>
            <input
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              disabled={!!editingId}
              placeholder="g2-math-enrichment"
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Grade</label>
            <select
              value={form.grade}
              onChange={(e) => handleGradeChange(Number(e.target.value))}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            >
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="math_enrichment"
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Price (₱)</label>
            <input
              type="number"
              value={form.pricePhp}
              onChange={(e) => setForm((f) => ({ ...f, pricePhp: Number(e.target.value) }))}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Grade 2 Math Enrichment (MTAP-level)"
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Description (shown on the Shop card)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">
              Content ref (JSON — how the app picks this pack&apos;s questions; auto-fills from Grade)
            </label>
            <input
              value={form.contentRef}
              onChange={(e) => setForm((f) => ({ ...f, contentRef: e.target.value }))}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3] font-mono"
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-[#ede4d3] text-sm font-bold px-4 py-2 rounded-lg"
          >
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Pack'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="bg-[#2a2119] hover:bg-[#3d3225] text-[#a89c86] text-sm px-4 py-2 rounded-lg">
              Cancel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm">Loading...</p>
      ) : packs.length === 0 ? (
        <p className="text-gray-600 text-sm">No packs yet — the Shop will show an empty catalog until one exists.</p>
      ) : (
        <div className="space-y-2">
          {packs.map((pack) => (
            <div key={pack.id} className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[#ede4d3] font-bold text-sm flex items-center gap-2">
                  {pack.title}
                  {!pack.active && <span className="text-[10px] font-normal uppercase tracking-widest text-orange-400 bg-orange-950 border border-orange-800 rounded-full px-2 py-0.5">Unpublished</span>}
                </p>
                <p className="text-xs text-[#8a7c66]">Grade {pack.grade} · {pack.category} · ₱{pack.price_php} · <span className="font-mono">{pack.id}</span></p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(pack)} className="text-xs bg-[#2a2119] hover:bg-[#3d3225] text-[#a89c86] px-3 py-1.5 rounded-lg">
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(pack)}
                  className={`text-xs px-3 py-1.5 rounded-lg ${pack.active ? 'bg-[#2a2119] hover:bg-[#4a0e0c] text-[#a89c86] hover:text-red-300' : 'bg-cyan-900 hover:bg-cyan-800 text-cyan-200'}`}
                >
                  {pack.active ? 'Unpublish' : 'Republish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
