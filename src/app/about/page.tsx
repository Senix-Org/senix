import type { Metadata } from 'next';
import { ComingSoon } from '@features/shared/components/coming-soon';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description: 'About Senix — AI code review for every pull request.',
  path: '/about',
});

export default function AboutPage(): React.ReactElement {
  return <ComingSoon title="About Senix" subtitle="Coming soon." />;
}
