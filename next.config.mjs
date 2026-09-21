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
    ];
  },
};

export default nextConfig;