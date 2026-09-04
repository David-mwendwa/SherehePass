import { Button } from '@/components/ui/Button';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center px-6 text-center">
      <div className="bloom" />
      <div className="relative">
        <p className="font-mono text-sm text-primary-400">404</p>
        <h1 className="mt-3 font-heading text-title">
          Nothing on here
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-dark-400">
          That page has either moved or never existed. The events, at least, are
          still where you left them.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/events">Browse events</Button>
          <Button href="/" variant="secondary">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
