import type { Metadata } from 'next';
import MarketingAnalytics from '@/components/MarketingAnalytics';

export const metadata: Metadata = {
  title: 'Learning Hall — DepEd-Aligned Gamified Learning for Grade 2-6',
  description:
    'A free, safe gamified learning app that turns Grade 2-6 DepEd lessons into quests, battles, and collectible curios. No ads, no stranger contact — parent-created accounts only.',
  alternates: { canonical: '/welcome' },
  openGraph: {
    title: 'Learning Hall — DepEd-Aligned Gamified Learning for Grade 2-6',
    description:
      'A free, safe gamified learning app that turns Grade 2-6 DepEd lessons into quests, battles, and collectible curios. No ads, no stranger contact — parent-created accounts only.',
    url: '/welcome',
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
    title: 'Learning Hall — DepEd-Aligned Gamified Learning for Grade 2-6',
    description:
      'A free, safe gamified learning app that turns Grade 2-6 DepEd lessons into quests, battles, and collectible curios. No ads, no stranger contact — parent-created accounts only.',
    images: ['/splash1.webp'],
  },
};

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is this actually free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — Learning Hall is free while it is in Early Access, no credit card required. Pricing for a wider release has not been locked in yet, but Early Access families will hear about any change before it happens.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my child’s information safe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Only a parent can create the family account, and every child profile lives under it. There is no public chat, no ads, and no stranger contact.',
      },
    },
    {
      '@type': 'Question',
      name: 'Will this replace my child’s teacher or homework?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Learning Hall runs alongside the classroom, not instead of it — Daily Quests are built from the same lesson schedule and DepEd curriculum the child’s teacher is already following.',
      },
    },
    {
      '@type': 'Question',
      name: 'My child isn’t in Grade 5 — can they still use it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Learning Hall is built for elementary-age learners and supports more than one grade level, growing grade by grade.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do we need to buy a tablet or download anything?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No purchase needed. Learning Hall runs in any browser, and there is also a free Android app.',
      },
    },
  ],
};

const SOFTWARE_APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Learning Hall',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Android, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'PHP',
  },
  description:
    'A DepEd-aligned gamified learning app for Grade 2-6 students covering reading comprehension, mental math, typing, critical thinking, and vocabulary.',
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APP_JSON_LD) }}
      />
      {children}
      <MarketingAnalytics />
    </>
  );
}
