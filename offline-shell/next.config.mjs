/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: { unoptimized: true },
  // No basePath: this becomes the entire www/ webDir root (the main app's
  // www/index.html stub is never actually shown online — server.url always
  // overrides it — so there's no subpath to nest under, and no need for one:
  // reused components like GuardianSprite use plain <img src="/..."> paths
  // that basePath rewriting wouldn't reach anyway.
};

export default nextConfig;
