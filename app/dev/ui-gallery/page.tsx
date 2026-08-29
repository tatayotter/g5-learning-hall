'use client';
// app/dev/ui-gallery/page.tsx
// Dev-only route: a no-live-data gallery of the game's real UI components —
// see components/dev/UiGallery.tsx. Not linked anywhere in the real app.
import dynamic from 'next/dynamic';

const UiGallery = dynamic(() => import('@/components/dev/UiGallery'), { ssr: false });

export default function UiGalleryPage() {
  return <UiGallery />;
}
