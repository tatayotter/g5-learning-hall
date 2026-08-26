'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: unknown;
  }
}

// Reads the Pixel ID admins set in tatayadmin > System > Site Settings (public.app_settings,
// see the migration + components/admin/SiteSettingsSection.tsx) and, if one is set, loads Meta's
// pixel script and fires PageView on first load and on every client-side route change — the App
// Router doesn't do full page loads between routes, so fbq('track', 'PageView') has to be called
// manually per navigation rather than relying on the snippet's own inline call.
//
// Mounted once in app/layout.tsx, so it covers every route automatically.
export default function FacebookPixel() {
  const pathname = usePathname();
  const [pixelId, setPixelId] = useState<string | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('app_settings').select('facebook_pixel_id').eq('id', 1).maybeSingle();
      const id = data?.facebook_pixel_id?.trim() || null;
      if (!cancelled) setPixelId(id);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!readyRef.current || !pixelId || typeof window.fbq !== 'function') return;
    window.fbq('track', 'PageView');
  }, [pathname, pixelId]);

  if (!pixelId) return null;

  return (
    <>
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        onLoad={() => {
          readyRef.current = true;
          window.fbq?.('track', 'PageView');
        }}
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
`,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
