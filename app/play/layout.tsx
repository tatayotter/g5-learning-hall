import type { Metadata } from 'next';
import MarketingAnalytics from '@/components/MarketingAnalytics';

export const metadata: Metadata = {
  title: 'Learning Hall — Play Free! Guilds, Curios & Battles for Grade 2-6',
  description:
    'Pick a guild, catch curios, and battle your friends — a free game for Grade 2-6 kids that turns real lessons into quests. No parent needed to start playing.',
  alternates: { canonical: '/play' },
  openGraph: {
    title: 'Learning Hall — Play Free! Guilds, Curios & Battles',
    description:
      'Pick a guild, catch curios, and battle your friends — a free game for Grade 2-6 kids that turns real lessons into quests.',
    url: '/play',
    images: [
      {
        url: '/splash1.webp',
        width: 2096,
        height: 1184,
        alt: 'Learning Hall',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learning Hall — Play Free! Guilds, Curios & Battles',
    description:
      'Pick a guild, catch curios, and battle your friends — a free game for Grade 2-6 kids that turns real lessons into quests.',
    images: ['/splash1.webp'],
  },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MarketingAnalytics />
    </>
  );
}
