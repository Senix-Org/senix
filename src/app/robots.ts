import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';

/**
 * robots.txt. Allows the public marketing/docs surface and blocks the
 * authenticated app, API, internal operator pages, auth, and setup routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/internal/', '/auth/', '/setup/'],
    },
    sitemap: canonicalUrl('/sitemap.xml'),
  };
}
