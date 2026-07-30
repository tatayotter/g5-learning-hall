import MarketingAnalytics from '@/components/MarketingAnalytics';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MarketingAnalytics />
    </>
  );
}
