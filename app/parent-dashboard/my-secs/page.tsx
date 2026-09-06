'use client';
// "My SECs" — a parent's owned Student Enrichment Content packs, grouped by
// child, with anytime reviewer access (confirmed decision in
// docs/sec-shop-design.md: "for parent, they can view the reviewer
// anytime... they will have a tab 'my SECs'"). Sibling to /parent-dashboard/shop.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MySecPackReviewer from '@/components/dashboard/MySecPackReviewer';

interface ChildRow {
  id: string;
  full_name: string;
  grade: string;
}

interface SecPack {
  id: string;
  grade: number;
  title: string;
}

interface EntitlementRow {
  child_id: string;
  pack_id: string;
  status: 'pending' | 'active';
  purchased_at: string | null;
}

export default function MySecsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [packs, setPacks] = useState<SecPack[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [openReviewer, setOpenReviewer] = useState<{ grade: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/parent-login');
        return;
      }
      const [{ data: children }, { data: packRows }, { data: entRows }] = await Promise.all([
        supabase.from('children').select('id, full_name, grade').eq('parent_id', user.id),
        supabase.from('sec_packs').select('id, grade, title'),
        supabase.from('sec_entitlements').select('child_id, pack_id, status, purchased_at').eq('parent_id', user.id).eq('status', 'active'),
      ]);
      setKids((children as ChildRow[]) || []);
      setPacks((packRows as SecPack[]) || []);
      setEntitlements((entRows as EntitlementRow[]) || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center text-stone-500">Loading…</main>;
  }

  if (openReviewer) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <MySecPackReviewer grade={openReviewer.grade} onClose={() => setOpenReviewer(null)} />
        </div>
      </main>
    );
  }

  const packById = new Map(packs.map((p) => [p.id, p]));
  const kidById = new Map(kids.map((k) => [k.id, k]));
  const owned = entitlements
    .map((e) => ({ ent: e, pack: packById.get(e.pack_id), kid: kidById.get(e.child_id) }))
    .filter((row) => row.pack && row.kid);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-slate-800">My SECs</h1>
          <a href="/parent-dashboard" className="text-sm text-stone-500 hover:text-slate-700 underline">Back to dashboard</a>
        </div>
        <p className="text-sm text-stone-500">
          Packs you&apos;ve bought for your kids. Play happens in their own Bonus Quests tab —
          this page is for you to study the material anytime, no timer.
        </p>

        {owned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center space-y-2">
            <p className="text-stone-500 text-sm">You haven&apos;t bought any packs yet.</p>
            <a href="/parent-dashboard/shop" className="text-orange-600 hover:text-orange-700 underline text-sm font-semibold">Visit the Shop</a>
          </div>
        ) : (
          <div className="space-y-3">
            {owned.map(({ ent, pack, kid }) => (
              <div key={`${ent.child_id}-${ent.pack_id}`} className="rounded-xl border border-stone-200 bg-[#ffffff] p-4 flex items-center justify-between gap-3 shadow-sm">
                <div>
                  <p className="font-bold text-slate-800">{pack!.title}</p>
                  <p className="text-sm text-stone-500">For {kid!.full_name}</p>
                  {ent.purchased_at && (
                    <p className="text-xs text-stone-400 mt-0.5">Purchased {new Date(ent.purchased_at).toLocaleDateString()}</p>
                  )}
                </div>
                <button
                  onClick={() => setOpenReviewer({ grade: pack!.grade })}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-[#ffffff] text-sm font-bold px-4 py-2 whitespace-nowrap transition-colors"
                >
                  Study
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
