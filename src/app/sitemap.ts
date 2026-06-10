import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';

/**
 * Public sitemap. Lists the static marketing/docs routes with sensible
 * change frequencies and priorities. Authenticated and API routes are
 * intentionally excluded (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/docs', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/changelog', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/blog', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },
  ];

  return entries.map((e) => ({
    url: canonicalUrl(e.path),
    lastModified: now,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));
}
