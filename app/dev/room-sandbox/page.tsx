'use client';
// app/dev/room-sandbox/page.tsx
// Dev-only route for the playroom decoration sandbox — see
// components/dev/RoomSandboxPrototype.tsx. Not linked anywhere in the real
// app, no Supabase/gold/inventory wiring. Delete once the concept moves
// past brainstorming or is discarded.
import dynamic from 'next/dynamic';

const RoomSandboxPrototype = dynamic(() => import('@/components/dev/RoomSandboxPrototype'), { ssr: false });

export default function RoomSandboxPage() {
  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center gap-6 p-8">
      <h1 className="text-white font-bold text-lg">Playroom sandbox — unwired prototype</h1>
      <RoomSandboxPrototype />
    </main>
  );
}
