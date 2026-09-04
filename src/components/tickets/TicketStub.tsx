import QRCode from 'qrcode';
import type { ReactNode } from 'react';

import type { Ticket } from '@prisma/client';

import { Badge, TICKET_TONE } from '@/components/ui/Badge';
import {
  formatEventDateLong,
  formatTicketCode,
  formatTime,
} from '@/lib/format';

/**
 * A ticket, drawn as a ticket.
 *
 * The QR is generated on the server as an SVG string and inlined. That means
 * no QR library in the browser bundle, no canvas, no flash of a missing code —
 * the HTML that arrives already contains the thing you hold up at the gate.
 *
 * Rendered as an SVG rather than a PNG data URI so it stays sharp at any size,
 * including on the screen of whoever is scanning it.
 */
export type TicketStubProps = {
  ticket: Pick<Ticket, 'code' | 'holderName' | 'status'> & {
    ticketType: { name: string };
  };
  event: {
    title: string;
    startsAt: Date;
    venue: { name: string; county: string };
  };
};

export async function TicketStub({ ticket, event }: TicketStubProps) {
  const qr = await QRCode.toString(ticket.code, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B0B0F', light: '#FFFFFF' },
  });

  const used = ticket.status === 'CHECKED_IN';
  const void_ = ticket.status === 'VOID';
  const spent = used || void_;

  return (
    <div className="surface flex flex-col overflow-hidden sm:flex-row">
      <div className="min-w-0 flex-1 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TICKET_TONE[ticket.status]}>
            {ticket.status === 'VALID'
              ? 'Valid'
              : used
                ? 'Checked in'
                : 'Void'}
          </Badge>
          <Badge>{ticket.ticketType.name}</Badge>
        </div>

        <h3 className="mt-3 text-lg font-semibold leading-snug text-white">
          {event.title}
        </h3>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="When">
            {formatEventDateLong(event.startsAt)}, {formatTime(event.startsAt)}
          </Row>
          <Row label="Where">
            {event.venue.name}, {event.venue.county}
          </Row>
          <Row label="Admits">{ticket.holderName}</Row>
        </dl>
      </div>

      {/* The perforation. A dashed rule on the seam between stub and body,
          switching axis with the layout so it always runs across the tear. */}
      <div
        aria-hidden="true"
        className="border-t border-dashed border-white/15 sm:border-l sm:border-t-0"
      />

      <div className="flex shrink-0 flex-col items-center justify-center gap-2 bg-dark-950/40 p-5 sm:w-44">
        <div
          className={`w-28 rounded-lg bg-white p-2 ${spent ? 'opacity-30 grayscale' : ''}`}
          // The SVG is generated here from the ticket's own code — not user
          // input, and not markup from anywhere else.
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="font-mono text-[0.6875rem] tracking-wider text-dark-400">
          {formatTicketCode(ticket.code)}
        </p>
        {spent ? (
          <p className="text-center text-[0.6875rem] text-dark-500">
            {used ? 'Already scanned' : 'No longer valid'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-dark-500">{label}</dt>
      <dd className="min-w-0 text-dark-200">{children}</dd>
    </div>
  );
}
