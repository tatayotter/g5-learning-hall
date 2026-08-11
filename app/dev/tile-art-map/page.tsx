'use client';
// app/dev/tile-art-map/page.tsx
// Dev-only route for the real-tile-art rendering trial — see
// components/dev/TileArtMapPrototype.tsx. Not linked anywhere in the real
// app; delete this route once the trial's outcome (adopt or discard real
// tile art) is decided.
import dynamic from 'next/dynamic';

const TileArtMapPrototype = dynamic(() => import('@/components/dev/TileArtMapPrototype'), { ssr: false });

export default function TileArtMapProtoPage() {
  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-white font-bold text-lg">Real Tile Art — Rendering Trial</h1>
      <TileArtMapPrototype />
    </main>
  );
}
