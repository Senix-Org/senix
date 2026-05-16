import { SiteNav } from '@/components/site-nav';
import { DocsSidebar } from '@/components/docs/docs-sidebar';

/**
 * Docs shell. The viewport is split into a non-scrolling frame (SiteNav +
 * sidebar) and an independently scrollable content column on the right,
 * so the sidebar stays put while a page scrolls. Each route under /docs
 * renders its own page into `children`.
 */
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <SiteNav />
      <div className="flex-1 min-h-0 flex">
        <DocsSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <article className="mx-auto max-w-3xl px-6 sm:px-10 py-12 pb-24">
            {children}
          </article>
        </main>
      </div>
    </div>
  );
}
