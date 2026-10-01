'use client';
// Client-only loader: FeatureMockups patches the Supabase client at render, which must never
// run during server rendering.
import dynamic from 'next/dynamic';

const FeatureMockups = dynamic(() => import('@/components/dev/FeatureMockups'), { ssr: false });

export default function FeatureMockupsLoader() {
  return <FeatureMockups />;
}
