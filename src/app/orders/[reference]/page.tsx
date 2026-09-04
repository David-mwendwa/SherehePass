import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { OrderPoller } from '@/components/checkout/OrderPoller';
import { TicketStub } from '@/components/tickets/TicketStub';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your order' };

export default async function OrderPage({
  params,
}: PageProps<'/orders/[reference]'>) {
  const { reference } = await params;
  const user = await requireUser('/tickets');

  const order = await db.order.findUnique({
    where: { reference },
    include: {
      event: { select: { title: true, slug: true, coverImage: true, startsAt: true, venue: { select: { name: true, county: true } } } },
      items: { include: { ticketType: { select: { name: true } } } },
      tickets: { include: { ticketType: { select: { name: true } } } },
    },
  });

  // Scoped to the owner as well as the reference. An order reference is short
  // enough to guess at, and it is attached to somebody's name, email and phone
  // — so ownership is checked rather than assumed from knowing the code.
  if (!order || (order.userId !== user.id && user.role !== 'ADMIN')) notFound();

  const state = {
    PENDING: {
      icon: Clock,
      tone: 'text-warning-400',
      title: 'Waiting for payment',
      body:
        order.method === 'MPESA'
          ? 'Check your phone for the M-Pesa prompt and enter your PIN. This page updates itself.'
          : 'Your card payment is being confirmed. This page updates itself.',
    },
    PAID: {
      icon: CheckCircle2,
      tone: 'text-success-400',
      title: 'You’re in',
      body: 'Your tickets are below and in your account. Show the QR code at the gate.',
    },
    FAILED: {
      icon: XCircle,
      tone: 'text-danger-400',
      title: 'Payment didn’t go through',
      body: 'Nothing was charged, and the tickets have gone back on sale. You can try again.',
    },
    CANCELLED: {
      icon: XCircle,
      tone: 'text-dark-400',
      title: 'Order cancelled',
      body: 'These tickets were released back on sale.',
    },
    REFUNDED: {
      icon: CheckCircle2,
      tone: 'text-primary-300',
      title: 'Refunded',
      body: 'This order was refunded to the account it was paid from.',
    },
  }[order.status];

  const Icon = state.icon;

  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      {/* Only while it can still change. A settled order needs no poller, and
          leaving one running would keep hitting the server forever. */}
      {order.status === 'PENDING' ? (
        <OrderPoller />
      ) : null}

      <div className="surface relative overflow-hidden p-8 text-center sm:p-12">
        <div className="bloom opacity-50" />
        <div className="relative">
          <Icon className={`mx-auto h-12 w-12 ${state.tone}`} aria-hidden="true" />
          <h1 className="mt-5 font-heading text-title">{state.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-dark-400">{state.body}</p>

          <dl className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-y-3 text-sm">
            <dt className="text-left text-dark-400">Reference</dt>
            <dd className="text-right font-mono text-white">{order.reference}</dd>
            <dt className="text-left text-dark-400">Event</dt>
            <dd className="text-right text-white">{order.event.title}</dd>
            <dt className="text-left text-dark-400">Total</dt>
            <dd className="text-right font-mono text-secondary-300">
              {formatKes(order.totalCents)}
            </dd>
          </dl>

          {order.status === 'PENDING' ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-dark-500">
              <span className="h-2 w-2 animate-ping rounded-full bg-warning-500" />
              Checking…
            </div>
          ) : null}

          {order.status === 'FAILED' ? (
            <Button href={`/events/${order.event.slug}`} className="mt-8">
              Try again
            </Button>
          ) : null}
        </div>
      </div>

      {order.tickets.length > 0 ? (
        <section className="mt-10">
          <h2 className="eyebrow mb-4">
            {order.tickets.length} ticket{order.tickets.length === 1 ? '' : 's'}
          </h2>
          <div className="space-y-4">
            {order.tickets.map((ticket) => (
              <TicketStub
                key={ticket.id}
                ticket={ticket}
                event={order.event}
              />
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-dark-500">
            These live in{' '}
            <Link href="/tickets" className="text-primary-300 hover:text-primary-200">
              your tickets
            </Link>{' '}
            too.
          </p>
        </section>
      ) : null}
    </div>
  );
}
