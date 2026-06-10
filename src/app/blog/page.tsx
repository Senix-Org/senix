import type { Metadata } from 'next';
import { ComingSoon } from '@features/shared/components/coming-soon';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Blog',
  description: 'The Senix blog — notes on AI code review and shipping safely.',
  path: '/blog',
});

export default function BlogPage(): React.ReactElement {
  return <ComingSoon title="Senix Blog" subtitle="Coming soon." />;
}
