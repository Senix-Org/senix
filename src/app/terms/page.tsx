import type { Metadata } from 'next';
import { ComingSoon } from '@features/shared/components/coming-soon';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'The terms that govern your use of Senix.',
  path: '/terms',
});

export default function TermsPage(): React.ReactElement {
  return <ComingSoon title="Terms of Service" subtitle="Coming soon." />;
}
