'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AnalyticsEventRow {
  user_id: string;
  event_name: string;
  properties: Record<string, any>;
  is_family: boolean;
  session_id: string;
  created_at: string;
}

const RANGE_OPTIONS: { id: '7' | '30' | '90'; label: string }[] = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

const AUDIENCE_OPTIONS: { id: 'all' | 'real' | 'demo'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'real', label: 'Real only' },
  { id: 'demo', label: 'Demo only' },
];

interface DemoStats {
  demo_accounts_created: number;
  onboarding_completed_count: number;
  avg_events_per_account: number;
  repeat_session_count: number;
  cta_clicked_count: number;
  rate_limited_hits: number;
  demo_referred_registrations: number;
  organic_registrations: number;
  child_self_registrations: number;
}

export default function AnalyticsSection() {
  const [rangeDays, setRangeDays] = useState<'7' | '30' | '90'>('30');
  const [audience, setAudience] = useState<'all' | 'real' | 'demo'>('all');
  const [allRows, setAllRows] = useState<AnalyticsEventRow[]>([]);
  const [demoStats, setDemoStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const sinceDate = new Date(Date.now() - Number(rangeDays) * 86400 * 1000);
      const since = sinceDate.toISOString();
      const [eventsRes, demoRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('user_id, event_name, properties, is_family, session_id, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_demo_stats', { p_from: since, p_to: new Date().toISOString() }),
      ]);
      setAllRows(eventsRes.data || []);
      setDemoStats(demoRes.data || null);
      setLoading(false);
    }
    fetchAnalytics();
  }, [rangeDays]);

  if (loading) return <p className="text-gray-500 animate-pulse">Loading analytics...</p>;

  const rows = allRows.filter(r => {
    if (audience === 'all') return true;
    const isDemo = r.user_id.startsWith('demo_');
    return audience === 'demo' ? isDemo : !isDemo;
  });

  const distinctUsers = new Set(rows.map(r => r.user_id));
  const distinctSessions = new Set(rows.map(r => r.session_id));
  const activeDays = new Set(rows.map(r => r.created_at.slice(0, 10)));

  const eventCounts: Record<string, number> = {};
  rows.forEach(r => { eventCounts[r.event_name] = (eventCounts[r.event_name] || 0) + 1; });
  const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);

  const purchaseAttempts = rows.filter(r => r.event_name === 'shop_purchase_attempt');
  const purchaseSuccess = purchaseAttempts.filter(r => r.properties?.success === true).length;
  const purchaseBlocked = rows.filter(r => r.event_name === 'shop_purchase_blocked_insufficient_gold').length;
  const totalPurchaseSignals = purchaseSuccess + purchaseBlocked;
  const blockedPct = totalPurchaseSignals > 0 ? Math.round((purchaseBlocked / totalPurchaseSignals) * 100) : 0;

  const perUser: Record<string, { count: number; isFamily: boolean; lastActive: string; sessions: Set<string> }> = {};
  rows.forEach(r => {
    if (!perUser[r.user_id]) {
      perUser[r.user_id] = { count: 0, isFamily: r.is_family, lastActive: r.created_at, sessions: new Set() };
    }
    perUser[r.user_id].count++;
    perUser[r.user_id].sessions.add(r.session_id);
    if (r.created_at > perUser[r.user_id].lastActive) perUser[r.user_id].lastActive = r.created_at;
  });
  const perUserRows = Object.entries(perUser).sort((a, b) => b[1].count - a[1].count);

  const funnelSteps: { label: string; eventName: string }[] = [
    { label: 'Logged in', eventName: 'login' },
    { label: 'Completed a quiz', eventName: 'main_quest_completed' },
    { label: 'Played a guild', eventName: 'guild_quiz_complete' },
    { label: 'Attempted a shop purchase', eventName: 'shop_purchase_attempt' },
  ];
  const funnelCounts = funnelSteps.map(step => ({
    ...step,
    users: new Set(rows.filter(r => r.event_name === step.eventName).map(r => r.user_id)).size,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">📊 Analytics — Freemium Feasibility</h1>
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-2">
            {AUDIENCE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setAudience(opt.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  audience === opt.id ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setRangeDays(opt.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  rangeDays === opt.id ? 'bg-white text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Events</p>
          <p className="text-2xl font-bold text-white">{rows.length}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Active Users</p>
          <p className="text-2xl font-bold text-white">{distinctUsers.size}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Sessions</p>
          <p className="text-2xl font-bold text-white">{distinctSessions.size}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Active Days</p>
          <p className="text-2xl font-bold text-white">{activeDays.size}</p>
        </div>
      </div>

      {/* Monetizable friction — the core "would they pay" signal */}
      <div className="bg-neutral-900 border border-amber-800 rounded-xl p-5 mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-3">Monetizable Friction Signal</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-400">{purchaseSuccess}</p>
            <p className="text-xs text-gray-500 mt-1">Successful Purchases</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{purchaseBlocked}</p>
            <p className="text-xs text-gray-500 mt-1">Blocked (Not Enough Gold)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{blockedPct}%</p>
            <p className="text-xs text-gray-500 mt-1">of purchase intents blocked</p>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Funnel — Distinct Users Reaching Each Step</p>
        <div className="space-y-2">
          {funnelCounts.map(step => (
            <div key={step.eventName} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 w-56 shrink-0">{step.label}</span>
              <div className="flex-1 bg-neutral-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{ width: distinctUsers.size > 0 ? `${(step.users / distinctUsers.size) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-bold text-white w-10 text-right">{step.users}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Demo KPIs — survives the 48h demo-account cleanup via demo_account_stats rollup */}
      {demoStats && (
        <div className="bg-neutral-900 border border-indigo-800 rounded-xl p-5 mb-8">
          <p className="text-xs text-indigo-400 uppercase tracking-widest mb-3">Demo — Funnel &amp; Onboarding</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold text-white">{demoStats.demo_accounts_created}</p>
              <p className="text-xs text-gray-500 mt-1">Demo Accounts Created</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {demoStats.demo_accounts_created > 0
                  ? Math.round((demoStats.onboarding_completed_count / demoStats.demo_accounts_created) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Onboarding Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{demoStats.avg_events_per_account}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Events / Account</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {demoStats.demo_accounts_created > 0
                  ? Math.round((demoStats.repeat_session_count / demoStats.demo_accounts_created) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Repeat-Session Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{demoStats.rate_limited_hits}</p>
              <p className="text-xs text-gray-500 mt-1">Rate-Limit Hits</p>
            </div>
          </div>

          {/* CTA -> registration funnel. Directional only: no identity link between
              a demo account and a later /register (or /child-signup) submission, so
              this is a count of touchpoints, not a per-user conversion rate. Covers
              both account-creation paths — a parent registering (parent_registration_submitted)
              and a child registering themselves with no parent yet
              (child_self_registration_submitted, added with /child-signup — see
              docs/parent-child-linking-design.md) — since both carry a `source` tag. */}
          <div className="space-y-2 border-t border-neutral-800 pt-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
              &quot;Create real account&quot; funnel (directional — not identity-linked)
            </p>
            {[
              { label: 'Demo accounts created', value: demoStats.demo_accounts_created },
              { label: 'Clicked "Create your real account"', value: demoStats.cta_clicked_count },
              { label: 'Registrations from demo banner', value: demoStats.demo_referred_registrations },
            ].map(step => (
              <div key={step.label} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-64 shrink-0">{step.label}</span>
                <div className="flex-1 bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-3 rounded-full"
                    style={{
                      width: demoStats.demo_accounts_created > 0
                        ? `${Math.min(100, (step.value / demoStats.demo_accounts_created) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-white w-10 text-right">{step.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Organic (non-demo) registrations</span>
              <span className="font-bold text-gray-300">{demoStats.organic_registrations}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Of which, self-registered by a child (no parent yet)</span>
              <span className="font-bold text-gray-300">{demoStats.child_self_registrations}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature usage */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Feature Usage (Event Counts)</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {sortedEvents.map(([name, count]) => (
              <div key={name} className="flex justify-between text-sm border-b border-neutral-800 py-1.5">
                <span className="text-gray-300 font-mono">{name}</span>
                <span className="text-white font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-user breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Per-User Activity</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {perUserRows.map(([userId, info]) => (
              <div key={userId} className="flex justify-between items-center text-sm border-b border-neutral-800 py-1.5">
                <span className="text-gray-300">
                  {userId} {info.isFamily && <span className="text-[10px] text-blue-400">(family)</span>}
                </span>
                <span className="text-xs text-gray-500">{info.sessions.size} sessions</span>
                <span className="text-white font-bold">{info.count} events</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
