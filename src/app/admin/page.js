import Link from 'next/link';
import { BadgeCheck, CalendarDays, TrendingUp, Users } from 'lucide-react';

import { Badge, EVENT_TONE, ORDER_TONE } from '@/components/ui/Badge';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatEventDate, formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  await requireRole(['ADMIN'], '/admin');

  const [users, organizers, events, revenue, recentOrders, topEvents] =
    await Promise.all([
      db.user.count(),
      db.organizer.count(),
      db.event.count({ where: { status: 'PUBLISHED' } }),
      db.order.aggregate({
        where: { status: 'PAID' },
        _sum: { totalCents: true },
      }),
      db.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { title: true, slug: true } },
          user: { select: { name: true } },
        },
      }),
      db.event.findMany({
        where: { status: 'PUBLISHED' },
        take: 6,
        orderBy: { startsAt: 'asc' },
        include: {
          organizer: { select: { name: true, verified: true } },
          ticketTypes: { select: { quantity: true, sold: true } },
        },
      }),
    ]);

  return (
    <div className="container py-10 sm:py-14">
      <p className="eyebrow mb-2">Platform</p>
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Admin</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Gross sales" value={formatKes(revenue._sum.totalCents ?? 0)} />
        <Stat icon={Users} label="Accounts" value={users} />
        <Stat icon={BadgeCheck} label="Organisers" value={organizers} />
        <Stat icon={CalendarDays} label="Published events" value={events} />
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="eyebrow mb-4">Recent orders</h2>
          <div className="surface divide-y divide-white/[0.06]">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {order.event.title}
                  </p>
                  <p className="truncate font-mono text-xs text-dark-500">
                    {order.reference} · {order.user.name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-secondary-300">
                    {formatKes(order.totalCents)}
                  </p>
                  <Badge tone={ORDER_TONE[order.status]} className="mt-1">
                    {order.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-4">Next on sale</h2>
          <div className="surface divide-y divide-white/[0.06]">
            {topEvents.map((event) => {
              const capacity = event.ticketTypes.reduce((s, t) => s + t.quantity, 0);
              const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${event.slug}`}
                      className="truncate text-sm text-white transition-colors hover:text-primary-300"
                    >
                      {event.title}
                    </Link>
                    <p className="truncate text-xs text-dark-500">
                      {event.organizer.name} · {formatEventDate(event.startsAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-dark-400">
                    {sold}/{capacity}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2 text-dark-400">
        <Icon className="h-4 w-4" />
        <span className="eyebrow">{label}</span>
      </div>
      <p className="mt-3 font-heading text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
