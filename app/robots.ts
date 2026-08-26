import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/welcome', '/play', '/register', '/child-signup', '/blog', '/privacy', '/account-deletion', '/curriculum'],
      disallow: ['/parent-login', '/parent-dashboard', '/tatayadmin', '/api/'],
    },
    sitemap: 'https://learninghallph.com/sitemap.xml',
  };
}
