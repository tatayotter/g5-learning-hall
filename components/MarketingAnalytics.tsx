import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';

/**
 * Page-view analytics for the public marketing surfaces only (/welcome,
 * /blog, /register) — deliberately NOT included in the root layout, since
 * that also wraps the authenticated game where children play. Keeping
 * analytics scoped to adult-facing marketing pages avoids tracking kids'
 * in-game activity through a third-party analytics vendor.
 */
export default function MarketingAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      <Analytics />
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </>
  );
}
