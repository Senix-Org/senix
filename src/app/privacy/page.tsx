import type { Metadata } from 'next';
import { ComingSoon } from '@features/shared/components/coming-soon';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How Senix handles your data and code.',
  path: '/privacy',
});

export default function PrivacyPage(): React.ReactElement {
  return <ComingSoon title="Privacy Policy" subtitle="Coming soon." />;
}
