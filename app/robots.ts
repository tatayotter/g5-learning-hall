import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/welcome', '/register', '/blog'],
      disallow: ['/', '/parent-login', '/parent-dashboard', '/admin-approvals', '/api/'],
    },
    sitemap: 'https://learninghallph.com/sitemap.xml',
  };
}
