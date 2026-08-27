// app/page.tsx
//
// Thin wrapper — the real game UI lives in components/Dashboard.tsx. Keep
// this file thin; add new tabs/features to Dashboard.tsx instead.
'use client';

import Dashboard from '@/components/Dashboard';

export default function Page() {
  return <Dashboard />;
}
