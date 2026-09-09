import Link from 'next/link';
import { BadgeCheck, CalendarDays, TrendingUp, Users } from 'lucide-react';

import { Badge, ORDER_TONE } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatEventDate, formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

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
      <p className="eyebrow mb-1.5">Platform</p>
      <h1 className="font-heading text-title">Admin</h1>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={TrendingUp}
          label="Gross sales"
          value={formatKes(revenue._sum.totalCents ?? 0)}
          hint="Paid orders, all organisers"
        />
        <Stat icon={Users} label="Accounts" value={users} />
        <Stat icon={BadgeCheck} label="Organisers" value={organizers} />
        <Stat icon={CalendarDays} label="Published events" value={events} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="eyebrow mb-3">Recent orders</h2>
          <div className="surface overflow-hidden">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="data-row grid-cols-[1fr_auto_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-white">{order.event.title}</p>
                  <p className="truncate font-mono text-xs text-dark-500">
                    {order.reference} · {order.user.name}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-secondary-300">
                  {formatKes(order.totalCents)}
                </span>
                <Badge tone={ORDER_TONE[order.status]}>
                  {order.status.toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-3">Next on sale</h2>
          <div className="surface overflow-hidden">
            {topEvents.map((event) => {
              const capacity = event.ticketTypes.reduce(
                (s, t) => s + t.quantity,
                0
              );
              const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
              const pct = capacity ? Math.round((sold / capacity) * 100) : 0;
              return (
                <div
                  key={event.id}
                  className="data-row grid-cols-[1fr_5rem_auto]"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${event.slug}`}
                      className="block truncate text-white transition-colors hover:text-primary-300"
                    >
                      {event.title}
                    </Link>
                    <p className="truncate text-xs text-dark-500">
                      {event.organizer.name} · {formatEventDate(event.startsAt)}
                    </p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-dark-400">
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
