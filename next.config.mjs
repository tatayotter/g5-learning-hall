/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  images: {
    qualities: [20, 75],
  },
  // Server source maps were ~32 MB of every deployment's ~52 MB server output, and
  // Vercel stores a full copy of each deployment (Hobby storage limit). They only
  // improve production stack traces, so leave them off.
  productionBrowserSourceMaps: false,
  experimental: {
    turbopackSourceMaps: false,
    serverSourceMaps: false,
  },
  async redirects() {
    return [
      {
        source: '/child-signup/welcome',
        destination: '/welcome',
        permanent: false,
      },
      // Short, trackable links for Facebook Page posts. lib/analytics.ts pins
      // the utm_* params on landing and attaches them to the signup events.
      // /fb/<post-name> tags a specific post via utm_content.
      {
        source: '/fb',
        destination: '/child-signup?utm_source=facebook&utm_medium=social&utm_campaign=page_post',
        permanent: false,
      },
      {
        source: '/fb/:post',
        destination: '/child-signup?utm_source=facebook&utm_medium=social&utm_campaign=page_post&utm_content=:post',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;