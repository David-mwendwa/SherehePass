'use client';

import { CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';

import {
  checkInAction,
  type CheckInResult,
} from '@/app/organizer/events/[id]/door/actions';
import { cn } from '@/lib/cn';
import { formatTicketCode } from '@/lib/format';

/**
 * The check-in screen.
 *
 * Built around a text input rather than a camera, because a hardware barcode
 * scanner is a keyboard: it types the code and presses Enter. That covers the
 * real gate — a scanner gun, a phone running a scanner app, or someone reading
 * the code aloud and it being typed — with no camera permission prompt at the
 * one moment nobody has time for one.
 *
 * The input refocuses itself after every scan, because the second person in
 * the queue arrives before you can reach for the mouse.
 */
export type DoorScannerProps = {
  eventId: string;
  initialAdmitted: number;
  totalIssued: number;
};

/** A verdict plus what was scanned and when, for the recent-scans list. */
type LogEntry = CheckInResult & { code: string; at: number };

export function DoorScanner({
  eventId,
  initialAdmitted,
  totalIssued,
}: DoorScannerProps) {
  const [pending, startTransition] = useTransition();
  const [admitted, setAdmitted] = useState(initialAdmitted);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = code.trim();
    if (!value || pending) return;

    startTransition(async () => {
      const result = await checkInAction(eventId, value);
      setLog((entries) => [{ ...result, code: value, at: Date.now() }, ...entries].slice(0, 25));
      if (result.ok) setAdmitted((count) => count + 1);
      setCode('');
      inputRef.current?.focus();
    });
  }

  const latest = log[0];

  return (
    <div className="mt-8">
      <div className="surface flex items-center justify-between px-5 py-4">
        <span className="eyebrow">Admitted</span>
        <span className="font-mono text-lg text-white">
          {admitted}
          <span className="text-dark-500"> / {totalIssued}</span>
        </span>
      </div>

      <form onSubmit={submit} className="mt-4">
        <label htmlFor="ticket-code" className="sr-only">
          Ticket code
        </label>
        <div className="relative">
          <ScanLine
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-500"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id="ticket-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Scan or type a ticket code"
            className="h-14 w-full rounded-2xl border border-white/10 bg-dark-900 pl-12 pr-4 font-mono text-base uppercase tracking-wider text-white placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-dark-500 focus:border-primary-500/50 focus:ring-0"
          />
        </div>
      </form>

      {/* The verdict, large. Door staff read this at arm's length in the dark,
          so it is colour AND an icon AND a word, never colour alone. */}
      {latest ? (
        <div
          aria-live="assertive"
          className={cn(
            'mt-4 flex items-center gap-4 rounded-2xl border p-5',
            latest.ok
              ? 'border-success-500/40 bg-success-500/10'
              : latest.status === 'ALREADY_IN'
                ? 'border-warning-500/40 bg-warning-500/10'
                : 'border-danger-500/40 bg-danger-500/10'
          )}
        >
          {latest.ok ? (
            <CheckCircle2 className="h-9 w-9 shrink-0 text-success-400" />
          ) : (
            <XCircle
              className={cn(
                'h-9 w-9 shrink-0',
                latest.status === 'ALREADY_IN'
                  ? 'text-warning-400'
                  : 'text-danger-400'
              )}
            />
          )}
          <div className="min-w-0">
            <p className="font-heading text-section text-white">
              {latest.message}
            </p>
            {latest.holderName ? (
              <p className="text-sm text-dark-300">
                {latest.holderName} · {latest.tierName}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {log.length > 1 ? (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Recent</h2>
          <ul className="space-y-1">
            {log.slice(1).map((entry) => (
              <li
                key={entry.at}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-dark-400">
                  {formatTicketCode(entry.code.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    entry.ok ? 'text-success-400' : 'text-dark-500'
                  )}
                >
                  {entry.ok ? entry.holderName : entry.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
