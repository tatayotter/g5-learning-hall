'use client';
// offline-shell/app/page.tsx
//
// Thin wrapper — renders the exact same Dashboard component the online app
// uses (components/Dashboard.tsx), so there's a single source of truth for
// every tab instead of a hand-maintained parallel page that drifts. Session
// resolution (including the native getActiveUserLocal() fallback needed for
// this bundled origin, which can't see the online origin's localStorage —
// see lib/localDataSource.ts's local_active_user table) and all per-action
// offline gating (Main Quest quiz submission queues instead of blocking,
// Curio Arena's roster still renders from cache while trading/battling stay
// gated, the Vault catalog is browsable read-only, etc.) already live inside
// Dashboard itself — nothing extra needed here.
import Dashboard from '@/components/Dashboard';

export default function OfflineShellPage() {
  return <Dashboard />;
}
