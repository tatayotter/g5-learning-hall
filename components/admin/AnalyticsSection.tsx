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

export default function AnalyticsSection() {
  const [rangeDays, setRangeDays] = useState<'7' | '30' | '90'>('30');
  const [allRows, setAllRows] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const sinceDate = new Date(Date.now() - Number(rangeDays) * 86400 * 1000);
      const since = sinceDate.toISOString();
      const { data } = await supabase
        .from('analytics_events')
        .select('user_id, event_name, properties, is_family, session_id, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      setAllRows(data || []);
      setLoading(false);
    }
    fetchAnalytics();
  }, [rangeDays]);

  if (loading) return <p className="text-[#8a7c66] animate-pulse">Loading analytics...</p>;

  const rows = allRows;

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
        <h1 className="text-2xl font-bold text-[#ede4d3]">📊 Analytics — Freemium Feasibility</h1>
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-2">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setRangeDays(opt.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  rangeDays === opt.id ? 'bg-[#ede4d3] text-[#0a0807]' : 'bg-[#2a2119] text-[#a89c86] hover:bg-[#3d3225]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-1">Total Events</p>
          <p className="text-2xl font-bold text-[#ede4d3]">{rows.length}</p>
        </div>
        <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-1">Active Users</p>
          <p className="text-2xl font-bold text-[#ede4d3]">{distinctUsers.size}</p>
        </div>
        <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-1">Sessions</p>
          <p className="text-2xl font-bold text-[#ede4d3]">{distinctSessions.size}</p>
        </div>
        <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-1">Active Days</p>
          <p className="text-2xl font-bold text-[#ede4d3]">{activeDays.size}</p>
        </div>
      </div>

      {/* Monetizable friction — the core "would they pay" signal */}
      <div className="bg-[#1c1611] border border-amber-800 rounded-xl p-5 mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-widest mb-3">Monetizable Friction Signal</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#7fae52]">{purchaseSuccess}</p>
            <p className="text-xs text-[#8a7c66] mt-1">Successful Purchases</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#e0605a]">{purchaseBlocked}</p>
            <p className="text-xs text-[#8a7c66] mt-1">Blocked (Not Enough Gold)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{blockedPct}%</p>
            <p className="text-xs text-[#8a7c66] mt-1">of purchase intents blocked</p>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-5 mb-8">
        <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-3">Funnel — Distinct Users Reaching Each Step</p>
        <div className="space-y-2">
          {funnelCounts.map(step => (
            <div key={step.eventName} className="flex items-center gap-3">
              <span className="text-sm text-[#c9bfae] w-56 shrink-0">{step.label}</span>
              <div className="flex-1 bg-[#2a2119] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#e2921e] h-3 rounded-full"
                  style={{ width: distinctUsers.size > 0 ? `${(step.users / distinctUsers.size) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-bold text-[#ede4d3] w-10 text-right">{step.users}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature usage */}
        <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-5">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-3">Feature Usage (Event Counts)</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {sortedEvents.map(([name, count]) => (
              <div key={name} className="flex justify-between text-sm border-b border-[#2a2119] py-1.5">
                <span className="text-[#c9bfae] font-mono">{name}</span>
                <span className="text-[#ede4d3] font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-user breakdown */}
        <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-5">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-3">Per-User Activity</p>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {perUserRows.map(([userId, info]) => (
              <div key={userId} className="flex justify-between items-center text-sm border-b border-[#2a2119] py-1.5">
                <span className="text-[#c9bfae]">
                  {userId} {info.isFamily && <span className="text-[10px] text-[#f0b429]">(family)</span>}
                </span>
                <span className="text-xs text-[#8a7c66]">{info.sessions.size} sessions</span>
                <span className="text-[#ede4d3] font-bold">{info.count} events</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
