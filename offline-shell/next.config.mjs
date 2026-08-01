/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: { unoptimized: true },
  // Bundled at www/offline/ -> assets/public/offline/, not site root, so
  // asset references (JS chunks, etc.) must be prefixed to match.
  basePath: '/offline',
};

export default nextConfig;
