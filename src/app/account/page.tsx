import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account', robots: { index: false, follow: false } };

const ROLE_LABELS = {
  ATTENDEE: 'Attendee',
  ORGANIZER: 'Organiser',
  ADMIN: 'Admin',
};

export default async function AccountPage() {
  const user = await requireUser('/account');

  const [orders, spent, ticketCount] = await Promise.all([
    db.order.count({ where: { userId: user.id, status: 'PAID' } }),
    db.order.aggregate({
      where: { userId: user.id, status: 'PAID' },
      _sum: { totalCents: true },
    }),
    db.ticket.count({ where: { order: { userId: user.id } } }),
  ]);

  return (
    <div className="container max-w-2xl py-10 sm:py-14">
      <h1 className="font-heading text-title">Account</h1>

      <section className="surface mt-8 p-6">
        <dl className="space-y-4">
          <Row label="Name">{user.name}</Row>
          <Row label="Email">{user.email}</Row>
          <Row label="Phone">
            {user.phone ?? <span className="text-dark-500">Not set</span>}
          </Row>
          <Row label="Role">
            <Badge tone={user.role === 'ADMIN' ? 'primary' : 'neutral'}>
              {ROLE_LABELS[user.role]}
            </Badge>
          </Row>
        </dl>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={orders} />
        <Stat label="Tickets" value={ticketCount} />
        <Stat label="Spent" value={formatKes(spent._sum.totalCents ?? 0)} />
      </section>

      {user.organizer ? (
        <section className="surface mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="eyebrow mb-1">Organiser</p>
            <p className="font-medium text-white">{user.organizer.name}</p>
          </div>
          <Button href="/organizer" size="sm">
            Dashboard
          </Button>
        </section>
      ) : (
        <section className="surface mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="max-w-sm">
            <p className="font-medium text-white">Putting on an event?</p>
            <p className="mt-1 text-sm text-dark-400">
              Organiser accounts are set up by hand in this build. The seeded
              organiser login is on the sign-in page.
            </p>
          </div>
          <Button href="/sell" variant="secondary" size="sm">
            Read more
          </Button>
        </section>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-dark-400">{label}</dt>
      <dd className="text-sm text-white">{children}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="surface p-5 text-center">
      <p className="font-heading text-section text-white">{value}</p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  );
}
