/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  images: {
    qualities: [20, 75],
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