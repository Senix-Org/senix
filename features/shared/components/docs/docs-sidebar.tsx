'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

type DocLink = { label: string; href: string };
type DocGroup = { heading: string; links: DocLink[] };

const NAV: DocGroup[] = [
  {
    heading: 'Getting started',
    links: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Installation', href: '/docs/installation' },
    ],
  },
  {
    heading: 'Usage',
    links: [
      { label: 'How it works', href: '/docs/how-it-works' },
      { label: 'Risk flags', href: '/docs/risk-flags' },
      { label: 'MCP for IDEs', href: '/docs/mcp' },
    ],
  },
  {
    heading: 'Reference',
    links: [
      { label: 'Configuration', href: '/docs/configuration' },
      { label: 'Troubleshooting', href: '/docs/troubleshooting' },
      { label: 'FAQ', href: '/docs/faq' },
      { label: 'API', href: '/docs/api' },
    ],
  },
];

/**
 * Docs sidebar navigation. File-based routing means each link is a real
 * page; `usePathname()` drives the active-link highlight. Renders a fixed
 * 240px sidebar on desktop and a slide-over drawer (toggled by a floating
 * button) on mobile.
 */
export function DocsSidebar(): React.ReactElement {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="hidden md:block w-60 shrink-0 overflow-y-auto border-r border-zinc-800/60 px-5 py-8">
        <NavGroups pathname={pathname} />
      </nav>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 shadow-lg shadow-black/40"
      >
        <Menu size={16} />
        Docs menu
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="absolute left-0 top-0 h-full w-72 max-w-[80vw] overflow-y-auto border-r border-zinc-800 bg-zinc-950 px-5 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-sm text-zinc-100">docs</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>
            <NavGroups pathname={pathname} />
          </nav>
        </div>
      )}
    </>
  );
}

function NavGroups({ pathname }: { pathname: string }): React.ReactElement {
  return (
    <div className="space-y-7">
      {NAV.map((group) => (
        <div key={group.heading}>
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2.5">
            {group.heading}
          </div>
          <ul className="space-y-1.5">
            {group.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block text-sm transition-colors ${
                      active ? 'text-green-400' : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
