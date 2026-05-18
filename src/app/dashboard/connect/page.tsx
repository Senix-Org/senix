import { ConnectIde } from '@/components/connect/connect-ide';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * "Connect your IDE" onboarding page. The dashboard layout has already
 * bounced unauthenticated visitors to /login, so the interactive flow
 * (IDE pick, token generation, config snippet) can assume a session.
 */
export default function ConnectPage(): React.ReactElement {
  return (
    <div>
      <header>
        <h1 className="text-3xl font-semibold text-primary">Connect your IDE</h1>
        <p className="mt-2 text-sm text-secondary">
          Pick your IDE, copy the config, restart. You are done.
        </p>
      </header>

      <div className="mt-8">
        <ConnectIde />
      </div>
    </div>
  );
}
