import Link from 'next/link';
import { Ticket as TicketIcon } from 'lucide-react';

import { Badge, ORDER_TONE } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TicketStub } from '@/components/tickets/TicketStub';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My tickets' };

export default async function TicketsPage() {
  const user = await requireUser('/tickets');

  const tickets = await db.ticket.findMany({
    where: { order: { userId: user.id } },
    include: {
      ticketType: { select: { name: true } },
      event: {
        select: {
          title: true,
          slug: true,
          startsAt: true,
          venue: { select: { name: true, county: true } },
        },
      },
    },
    orderBy: { event: { startsAt: 'asc' } },
  });

  const now = new Date();
  const upcoming = tickets.filter(
    (ticket) => ticket.event.startsAt >= now && ticket.status !== 'VOID'
  );
  const past = tickets.filter(
    (ticket) => ticket.event.startsAt < now || ticket.status === 'VOID'
  );

  // Orders that never completed. Shown separately rather than mixed in with
  // tickets, because a pending order is not a ticket — it is a payment that
  // has not landed, and pretending otherwise is how someone turns up at a gate
  // holding nothing.
  const openOrders = await db.order.findMany({
    where: { userId: user.id, status: { in: ['PENDING', 'FAILED'] } },
    include: { event: { select: { title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container max-w-4xl py-10 sm:py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">My tickets</h1>
      <p className="mt-2 text-dark-400">
        Show the QR code at the gate. Each one scans once.
      </p>

      {openOrders.length > 0 ? (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Orders in progress</h2>
          <div className="space-y-2">
            {openOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.reference}`}
                className="surface surface-hover flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {order.event.title}
                  </p>
                  <p className="font-mono text-xs text-dark-500">
                    {order.reference} · {formatKes(order.totalCents)}
                  </p>
                </div>
                <Badge tone={ORDER_TONE[order.status]}>
                  {order.status === 'PENDING' ? 'Awaiting payment' : 'Failed'}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {tickets.length === 0 ? (
        <div className="surface mt-10 flex flex-col items-center px-6 py-20 text-center">
          <TicketIcon className="h-10 w-10 text-dark-500" aria-hidden="true" />
          <h2 className="mt-5 text-xl font-semibold">No tickets yet</h2>
          <p className="mt-2 max-w-sm text-sm text-dark-400">
            When you buy one it lands here, with a QR code, straight away.
          </p>
          <Button href="/events" className="mt-6">
            Find something on
          </Button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className="mt-10">
              <h2 className="eyebrow mb-4">Coming up</h2>
              <div className="space-y-4">
                {upcoming.map((ticket) => (
                  <TicketStub
                    key={ticket.id}
                    ticket={ticket}
                    event={ticket.event}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="mt-12">
              <h2 className="eyebrow mb-4">Been and gone</h2>
              <div className="space-y-4 opacity-60">
                {past.map((ticket) => (
                  <TicketStub
                    key={ticket.id}
                    ticket={ticket}
                    event={ticket.event}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
