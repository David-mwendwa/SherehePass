import { Button } from '@/components/ui/Button';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = {
  alternates: { canonical: '/sell' },
  title: 'Sell tickets',
  description: 'Put your event on SherehePass.',
};

const POINTS = [
  {
    title: 'Tiers that cannot oversell',
    body: 'Early bird, regular, VIP, each with its own price and cap. Two people buying the last ticket at the same instant is handled in the database, not hoped about.',
  },
  {
    title: 'A door that works offline-ish',
    body: 'A scanner gun is just a keyboard. Point it at the door screen and it types the code and admits. A code scans once; a second scan says so.',
  },
  {
    title: 'Money you can see',
    body: 'Revenue counts paid orders only, never pending ones, so the number on your dashboard is money that has actually arrived.',
  },
];

export default async function SellPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative">
      <div className="bloom" />
      <div className="container relative max-w-3xl py-16 sm:py-24">
        <p className="eyebrow mb-4">For organisers</p>
        <h1 className="font-heading text-display-sm">
          Put it on sale in an afternoon.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-dark-300">
          Create the event, set your tiers, publish. People pay with M-Pesa, you
          watch the bar fill, and you scan them in at the gate.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {user?.organizer ? (
            <Button href="/organizer" size="lg">
              Go to your dashboard
            </Button>
          ) : (
            <Button href={user ? '/account' : '/signup?next=/sell'} size="lg">
              Get started
            </Button>
          )}
          <Button href="/organizers" variant="secondary" size="lg">
            See who else is on here
          </Button>
        </div>

        <div className="mt-16 space-y-8">
          {POINTS.map((point) => (
            <div key={point.title} className="surface p-6">
              <h2 className="font-heading text-subhead">{point.title}</h2>
              <p className="mt-2 leading-relaxed text-dark-400">{point.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
