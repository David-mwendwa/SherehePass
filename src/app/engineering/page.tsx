import Link from 'next/link';
import {
  Database,
  GitBranch,
  Lock,
  TestTube2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from '@/components/engineering/CodeBlock';
import { OversellDemo } from '@/components/engineering/OversellDemo';
import { DEMO_LIMITS } from '@/lib/oversell/contract';
import { cn } from '@/lib/cn';

export const metadata = {
  title: 'How it cannot oversell',
  alternates: { canonical: '/engineering' },
  description:
    'The concurrency problem at the centre of ticketing, the conditional UPDATE that solves it, and a live demonstration you can run against the database.',
};

export default function EngineeringPage() {
  return (
    <div className="relative">
      <div className="bloom" />

      <div className="container relative max-w-3xl py-14 sm:py-20">
        <header>
          <p className="eyebrow mb-4">Engineering</p>
          <h1 className="font-heading text-display-sm">
            Two people, one last ticket.
          </h1>
          <p className="lede mt-5">
            Every ticketing system has exactly one problem that actually matters,
            and it is not the checkout flow or the QR codes. It is what happens
            when two people press <em>Pay</em> on the last seat at the same
            millisecond. This page is that problem, the fix, and a button that
            runs it against the real database while you watch.
          </p>
        </header>

        {/* ------------------------------------------------------ the problem */}
        <Section
          icon={GitBranch}
          eyebrow="The failure"
          title="Read, decide, write"
        >
          <p>
            The obvious implementation is three steps, and it is wrong in a way
            that passes every test you would think to write for it:
          </p>

          <CodeBlock
            tone="danger"
            caption="how it breaks"
            code={`
// Two requests arrive 3ms apart. Both run this.
const tier = await db.ticketType.findUnique({ where: { id } });

if (tier.sold + 1 <= tier.quantity) {   // both read sold: 199, quantity: 200
  await db.ticketType.update({          // both pass the check
    where: { id },
    data: { sold: tier.sold + 1 },      // both write 200
  });
}
// 201 tickets sold. The counter says 200.
`}
          />

          <p>
            The gap between reading <code>sold</code> and writing it back is
            where the second request slips in. It is a few milliseconds wide,
            which is why it never shows up in development and always shows up on
            the night a popular event goes on sale. Wrapping it in a transaction
            does not close it either. At Postgres&rsquo;s default isolation
            level both transactions read the same committed value and both write
            happily on top of it.
          </p>
          <p>
            The cost is not a wrong number in a database. It is somebody who
            paid, travelled, and is now being turned away at a gate.
          </p>
        </Section>

        {/* ---------------------------------------------------------- the fix */}
        <Section
          icon={Lock}
          eyebrow="The fix"
          title="Make the check and the write the same statement"
        >
          <p>
            If there is no gap, nothing can slip into it. The test moves into the{' '}
            <code>WHERE</code> clause, so the database evaluates the condition
            and performs the write as one indivisible operation:
          </p>

          <CodeBlock
            language="sql"
            tone="success"
            caption="what actually runs"
            code={`
UPDATE "TicketType"
   SET sold = sold + $1
 WHERE id = $2
   AND sold + $1 <= quantity
`}
          />

          <p>
            Postgres takes a row lock for the duration of that statement, so
            concurrent buyers queue behind each other instead of racing. The one
            that arrives after the stock is gone matches{' '}
            <strong className="text-white">zero rows</strong>, and zero rows
            updated is how the application learns it lost, rolls its transaction
            back, and tells that buyer the tier sold out.
          </p>

          <CodeBlock
            caption="src/lib/purchase.ts"
            code={`
export async function claimStock(tx, tier, quantity) {
  const claimed = await tx.ticketType.updateMany({
    where: {
      id: tier.id,
      sold: { lte: tier.quantity - quantity },
    },
    data: { sold: { increment: quantity } },
  });

  return claimed.count === 0
    ? { ok: false, remaining: tier.quantity - tier.sold }
    : { ok: true };
}
`}
          />

          <p>
            <code>updateMany</code> rather than <code>update</code> is the whole
            point: it compiles to <code>UPDATE … WHERE</code> and reports how
            many rows matched. <code>update</code> takes a unique id, finds the
            row, and writes, which is the three-step version again, wearing a
            different name.
          </p>
          <p>
            Note also that <code>increment</code> does the arithmetic in the
            database. Sending <code>sold: tier.sold + 1</code> would ship a value
            computed from a figure that may already be stale.
          </p>
        </Section>

        {/* ------------------------------------------------------- the backstop */}
        <Section
          icon={Database}
          eyebrow="The backstop"
          title="And again, one layer down"
        >
          <p>
            Application code is one migration away from someone writing a
            well-meaning script. The same invariant is therefore also the
            database&rsquo;s job:
          </p>

          <CodeBlock
            language="sql"
            caption="prisma/migrations/oversell_guards"
            code={`
ALTER TABLE "TicketType"
  ADD CONSTRAINT "TicketType_sold_within_quantity"
  CHECK (sold <= quantity);
`}
          />

          <p>
            Now a hand-written <code>UPDATE</code> that oversells is rejected by
            Postgres, not merely discouraged by a code review. This is the layer
            that survives the next person to touch the codebase, which may well
            be me having forgotten all of the above.
          </p>
        </Section>

        {/* --------------------------------------------------------- the demo */}
        <Section
          icon={TestTube2}
          eyebrow="The proof"
          title="Run it yourself"
          wide
        >
          <p>
            Claims about concurrency are cheap. Below, a sandbox ticket tier is
            reset to a known capacity and then attacked by as many simultaneous
            transactions as you ask for, each one calling the same{' '}
            <code>claimStock</code> shown above, in the same kind of transaction
            the checkout uses.
          </p>

          <div className="not-prose my-7">
            <OversellDemo limits={DEMO_LIMITS} />
          </div>

          <p>
            The same scenario runs in CI as an assertion rather than a
            demonstration: <code>npm test</code> fires twenty concurrent
            transactions at ten tickets and fails the build unless exactly ten
            sales come out. A separate case writes to <code>sold</code> directly
            to confirm the <code>CHECK</code> constraint rejects it, because a
            guarantee that only holds while everyone remembers to use the helper
            is not a guarantee.
          </p>
        </Section>

        <footer className="mt-16 border-t border-white/[0.06] pt-8">
          <p className="text-sm text-dark-400">
            The rest of the reasoning is in the header comments of{' '}
            <code className="text-dark-300">prisma/schema.prisma</code> and{' '}
            <code className="text-dark-300">src/lib/purchase.ts</code>: why the
            money is stored as integer cents, why <code>OrderItem</code>{' '}
            snapshots its price, and why tickets are minted on payment rather
            than at checkout.
          </p>
          <p className="mt-4 text-sm text-dark-400">
            <Link
              href="/events"
              className="text-primary-300 underline-offset-4 hover:underline"
            >
              Back to the events
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  children,
  wide,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className="mt-16">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/12 text-primary-300 ring-1 ring-primary-500/20">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="eyebrow">{eyebrow}</span>
      </div>

      <h2 className="font-heading text-section">{title}</h2>

      {/* The typography plugin styles the prose; `not-prose` on the demo keeps
          it from restyling the component's own type. */}
      <div
        className={cn(
          'prose prose-invert mt-4 max-w-none',
          'prose-p:text-dark-300 prose-p:leading-relaxed',
          'prose-strong:text-white',
          'prose-code:rounded prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.8125rem] prose-code:font-normal prose-code:text-primary-200',
          // The plugin adds backticks around inline code by default.
          'prose-code:before:content-none prose-code:after:content-none',
          wide && 'prose-p:max-w-none'
        )}
      >
        {children}
      </div>
    </section>
  );
}
