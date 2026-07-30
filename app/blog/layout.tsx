import MarketingAnalytics from '@/components/MarketingAnalytics';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MarketingAnalytics />
    </>
  );
}
