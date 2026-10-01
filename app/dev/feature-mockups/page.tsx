// app/dev/feature-mockups/page.tsx
// Dev-only route: renders one real game screen per ?scene= with mock data, framed at a fixed
// size so it can be captured for marketing videos — see components/dev/FeatureMockups.tsx.
// Not linked anywhere in the real app. 404s in production: the mockups patch the shared
// Supabase client in place, and captures only ever run against the local dev server.
import { notFound } from 'next/navigation';
import FeatureMockupsLoader from './FeatureMockupsLoader';

export default function FeatureMockupsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <FeatureMockupsLoader />;
}
