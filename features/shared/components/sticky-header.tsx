'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky top header shell that stays transparent at the very top of the
 * page and fades in a subtle backdrop blur plus a hairline border once the
 * user scrolls. Keeps the marketing nav unobtrusive over the hero while
 * staying legible over content further down.
 */
export function StickyHeader({ children }: { children: React.ReactNode }): React.ReactElement {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        scrolled
          ? 'border-zinc-800/50 bg-zinc-950/70 backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      {children}
    </header>
  );
}
