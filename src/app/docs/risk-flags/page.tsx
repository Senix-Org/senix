import type { Metadata } from 'next';
import { DocH1, DocLead, DocP, CodeBlock } from '@features/shared/components/docs/doc-elements';

export const metadata: Metadata = {
  title: 'Risk flag reference — Senix Docs',
  description: 'The 8 Senix risk flags, what each catches, and example triggering code.',
};

type Severity = 'High' | 'Medium' | 'Low';

type Flag = {
  name: string;
  catches: string;
  example: string;
  severity: Severity;
};

const FLAGS: Flag[] = [
  {
    name: 'sql-injection',
    catches:
      'Raw user input concatenated or interpolated into a SQL query string instead of being passed as a bound parameter.',
    example: `// Triggers sql-injection
const email = req.query.email;
db.query("SELECT * FROM users WHERE email = '" + email + "'");`,
    severity: 'High',
  },
  {
    name: 'auth-change',
    catches:
      'Addition, removal, or modification of an authentication or authorization check — sessions, tokens, role checks, or middleware guards.',
    example: `// Triggers auth-change — the admin check was removed
export function deleteUser(req, res) {
-  if (req.user.role !== 'admin') return res.status(403).end();
   db.users.delete(req.params.id);
}`,
    severity: 'High',
  },
  {
    name: 'removed-validation',
    catches:
      'Input or schema validation that previously existed has been removed or weakened. Adding new validation does not count.',
    example: `// Triggers removed-validation
export function createOrder(payload) {
-  const data = OrderSchema.parse(payload);
-  return db.orders.insert(data);
+  return db.orders.insert(payload);
}`,
    severity: 'High',
  },
  {
    name: 'hardcoded-secret',
    catches:
      'An API key, token, password, or private key written literally in source code instead of read from an environment variable or secret store.',
    example: `// Triggers hardcoded-secret
const stripe = new Stripe("live_REPLACE_WITH_YOUR_KEY");`,
    severity: 'High',
  },
  {
    name: 'new-external-api',
    catches:
      'A new outbound HTTP call to a third-party service — a fetch, axios call, or SDK call to an external host.',
    example: `// Triggers new-external-api
await fetch("https://api.analytics.io/v1/track", {
  method: "POST",
  body: JSON.stringify({ event: "signup", userId }),
});`,
    severity: 'Medium',
  },
  {
    name: 'dependency-added',
    catches:
      'A new third-party package import appears that was not previously imported anywhere in the touched files.',
    example: `// Triggers dependency-added
import { format } from "date-fns";

export const stamp = () => format(new Date(), "yyyy-MM-dd");`,
    severity: 'Medium',
  },
  {
    name: 'payment-logic-change',
    catches:
      'A change to code that calculates money, prices, discounts, fees, refunds, taxes, or order totals.',
    example: `// Triggers payment-logic-change
function applyDiscount(total, code) {
-  return code === "SAVE10" ? total * 0.9 : total;
+  return code === "SAVE10" ? total * 0.5 : total;
}`,
    severity: 'High',
  },
  {
    name: 'data-leak',
    catches:
      'A code path now exposes data to parties that should not see it — PII in a public endpoint, internal IDs in logs, or credentials echoed in errors.',
    example: `// Triggers data-leak — the password hash is returned to the client
app.get("/api/users/:id", async (req, res) => {
  const user = await db.users.find(req.params.id);
  res.json(user); // user includes password_hash
});`,
    severity: 'High',
  },
];

const SEVERITY_STYLES: Record<Severity, string> = {
  High: 'bg-red-500/10 text-red-300 border-red-900/50',
  Medium: 'bg-amber-500/10 text-amber-300 border-amber-900/50',
  Low: 'bg-zinc-500/10 text-zinc-300 border-zinc-700',
};

export default function RiskFlagsPage(): React.ReactElement {
  return (
    <>
      <DocH1>Risk flag reference</DocH1>
      <DocLead>
        Senix uses a fixed taxonomy of 8 risk flags. This page documents each one with
        examples.
      </DocLead>
      <DocP>
        The model is instructed to use only these flag names and to omit a flag when nothing
        fits, rather than invent a new one. The same taxonomy applies to both GitHub PR
        reviews and MCP analyses.
      </DocP>

      <div className="mt-8 space-y-12">
        {FLAGS.map((flag) => (
          <section key={flag.name}>
            <h2 className="text-2xl font-semibold scroll-mt-6 flex items-center gap-3">
              <code className="font-mono text-base bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-green-400">
                {flag.name}
              </code>
            </h2>

            <h3 className="text-xl font-semibold mt-8 mb-3">What it catches</h3>
            <p className="text-zinc-300 leading-relaxed">{flag.catches}</p>

            <h3 className="text-xl font-semibold mt-8 mb-3">Example</h3>
            <CodeBlock>{flag.example}</CodeBlock>

            <h3 className="text-xl font-semibold mt-8 mb-3">Severity</h3>
            <p className="mt-1">
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium ${SEVERITY_STYLES[flag.severity]}`}
              >
                {flag.severity} by default
              </span>
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
