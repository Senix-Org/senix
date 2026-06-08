import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared presentational primitives for docs pages. Pure server
 * components — they only carry the Tailwind styling contract so every
 * docs page renders headings, body copy, code, and tables identically.
 */

export function DocH1({ children }: { children: ReactNode }): React.ReactElement {
  return <h1 className="text-4xl font-bold tracking-tight">{children}</h1>;
}

export function DocLead({ children }: { children: ReactNode }): React.ReactElement {
  return <p className="mt-4 text-lg text-zinc-400 leading-relaxed">{children}</p>;
}

export function DocH2({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}): React.ReactElement {
  return (
    <h2 id={id} className="text-2xl font-semibold mt-12 mb-4 scroll-mt-6">
      {children}
    </h2>
  );
}

export function DocH3({ children }: { children: ReactNode }): React.ReactElement {
  return <h3 className="text-xl font-semibold mt-8 mb-3">{children}</h3>;
}

export function DocP({ children }: { children: ReactNode }): React.ReactElement {
  return <p className="mt-4 text-zinc-300 leading-relaxed">{children}</p>;
}

export function DocUL({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <ul className="mt-4 space-y-2 list-disc pl-5 text-zinc-300 leading-relaxed marker:text-zinc-600">
      {children}
    </ul>
  );
}

export function DocOL({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <ol className="mt-4 space-y-2 list-decimal pl-5 text-zinc-300 leading-relaxed marker:text-zinc-600">
      {children}
    </ol>
  );
}

export function InlineCode({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <code className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

export function CodeBlock({
  children,
  label,
}: {
  children: string;
  label?: string;
}): React.ReactElement {
  return (
    <div className="mt-4">
      {label && (
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          {label}
        </div>
      )}
      <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-4 font-mono text-sm overflow-x-auto text-zinc-300">
        {children}
      </pre>
    </div>
  );
}

export function DocLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className="text-green-400 hover:text-green-300 transition-colors">
      {children}
    </Link>
  );
}

/**
 * Full-width table with subtle borders and alternating row colors.
 * `head` is the header cells; `rows` is a list of cell-arrays.
 */
export function DocTable({
  head,
  rows,
}: {
  head: ReactNode[];
  rows: ReactNode[][];
}): React.ReactElement {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-left">
          <tr>
            {head.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-2.5 font-medium text-zinc-400 border-b border-zinc-800"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/30'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-zinc-300 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Linked card used on the docs landing page. */
export function DocCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-green-500/40 hover:bg-zinc-900/70"
    >
      <div className="font-semibold text-zinc-100">{title}</div>
      <div className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{description}</div>
    </Link>
  );
}
