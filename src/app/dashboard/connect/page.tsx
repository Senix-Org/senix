import { Reveal } from '@/components/reveal';
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
    <div className="space-y-10">
      <Reveal>
        <section>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-green-500/80">
            Setup
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            Connect your IDE
          </h1>
          <p className="mt-3 text-zinc-400">
            Pick your IDE. Copy the config. Restart. You are done.
          </p>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <ConnectIde />
      </Reveal>
    </div>
  );
}
