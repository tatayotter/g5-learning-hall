'use client';
// app/dev/parent-dashboard/page.tsx
// Dev-only route: renders the real parent dashboard with the Supabase client
// stubbed by fixtures, so the layout can be reviewed without a parent login.
// ?plan=free shows the free-plan state; ?page=pricing|shop|pack|my-secs
// renders the other parent pages instead. Not linked anywhere in the real app.
// Patching the shared client is safe here only because this route never
// mounts alongside real app screens.
import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import ParentDashboardPage from '@/app/parent-dashboard/page';
import PricingPage from '@/app/parent-dashboard/pricing/page';
import ShopPage from '@/app/parent-dashboard/shop/page';
import ShopProductPage from '@/app/parent-dashboard/shop/[packId]/page';
import MySecsPage from '@/app/parent-dashboard/my-secs/page';

const PAGES = {
  dashboard: ParentDashboardPage,
  pricing: PricingPage,
  shop: ShopPage,
  pack: ShopProductPage,
  'my-secs': MySecsPage,
} as const;
type PageKey = keyof typeof PAGES;

const today = new Date();
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function fixtures(plan: 'premium' | 'free') {
  const tables: Record<string, unknown> = {
    parents: { status: 'approved', full_name: 'Maria Santos', marketing_opt_in: false },
    children: [
      { id: 'kid-1', full_name: 'Juan Dela Cruz', grade: 'Grade 5', gender: 'boy', school_name: 'Sample Elementary School', avatar: '/userpics/userpics_premium/ssb3.png', username: 'juan5' },
      { id: 'kid-2', full_name: 'Ana Dela Cruz', grade: 'Grade 3', gender: 'girl', school_name: 'Sample Elementary School', avatar: '/userpics/userpics_premium/ssg3.png', username: 'ana3' },
    ],
    subscriptions: plan === 'premium'
      ? { status: 'active', addon_children: 1, coin_pool_balance: 8450, current_period_end: iso(subDays(today, -210)) }
      : null,
    player_progress: { level: 7, xp: 1840, mastery_count: 12, perfect_quizzes_total: 5 },
    user_subclass_profiles: { lorekeeper_lvl: 4, spellcaster_lvl: 3, number_realm_lvl: 5, logic_labyrinth_lvl: 2, lexicon_arena_lvl: 3 },
    sec_packs: [5, 3, 2].map((g) => ({
      id: `g${g}-math-enrichment`, grade: g, category: 'math_enrichment',
      title: `Grade ${g} MTAP Math Enrichment`, description: 'Competition-level math practice.', price_php: 149,
    })),
    sec_entitlements: plan === 'premium'
      ? [{ child_id: 'kid-1', pack_id: 'g5-math-enrichment', status: 'active', purchased_at: iso(subDays(today, 12)) }]
      : [],
  };
  const rpcs: Record<string, unknown> = {
    max_children_for_parent: plan === 'premium' ? 3 : 1,
    get_child_last_active: [{ last_active: today.toISOString() }],
    get_child_streak: [0, 1, 2, 3].map((n) => ({ claim_date: iso(subDays(today, n)) })),
    get_child_pin: '4821',
    get_child_weak_topics: [
      { subject: 'Mathematics', wrong_count: 18, total_count: 32, wrong_pct: 56 },
      { subject: 'Filipino', wrong_count: 9, total_count: 26, wrong_pct: 35 },
      { subject: 'Science', wrong_count: 4, total_count: 30, wrong_pct: 13 },
    ],
    get_child_journal: [0, 1].map((n) => ({
      entry_date: iso(subDays(today, n)),
      done_today: 'Finished the fractions quest and beat the guild boss.',
      hardest_challenge: 'Adding fractions with different denominators.',
      gratitude: 'My classmate helped me with reading.',
      tomorrow_plan: 'Practice multiplication tables.',
    })),
  };
  return { tables, rpcs };
}

function installStubs(plan: 'premium' | 'free') {
  const { tables, rpcs } = fixtures(plan);
  const result = (table: string, single = false) => {
    if (table === 'user_completed_questions') return { data: null, count: 46, error: null };
    const data = tables[table] ?? null;
    return { data: single && Array.isArray(data) ? data[0] ?? null : data, error: null };
  };
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'in']) b[m] = () => b;
    b.single = b.maybeSingle = () => Promise.resolve(result(table, true));
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result(table)).then(res, rej);
    return b;
  };
  const s = supabase as unknown as Record<string, unknown>;
  s.from = (table: string) => builder(table);
  s.rpc = (name: string) => Promise.resolve({ data: rpcs[name] ?? null, error: null });
  const auth = supabase.auth as unknown as Record<string, unknown>;
  auth.getUser = () => Promise.resolve({ data: { user: { id: 'dev-parent' } }, error: null });
  auth.getSession = () => Promise.resolve({ data: { session: null }, error: null });
}

export default function DevParentDashboardPage() {
  const [page, setPage] = useState<PageKey | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    installStubs(params.get('plan') === 'free' ? 'free' : 'premium');
    const requested = params.get('page') as PageKey | null;
    setPage(requested && requested in PAGES ? requested : 'dashboard');
  }, []);
  if (!page) return null;
  const Page = PAGES[page];
  return <Page />;
}
