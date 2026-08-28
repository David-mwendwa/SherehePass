# SherehePass

Ticketing for live events in Kenya — concerts, festivals, tech meetups, match
days. Browse what's on, buy with M-Pesa or card, and walk in with a QR code.
Organisers publish events, price them in tiers, and scan people in at the door.

*Sherehe* is Swahili for celebration.

Built as a **full-stack Next.js app**: App Router, Server Components, Server
Actions, and Prisma talking to PostgreSQL directly. There is no separate API
server — the pages query the database, and the mutations are functions.

---

## Why PostgreSQL

Because selling a ticket is not a write, it is a decision.

"Is there one left?" and "then it is mine" have to happen as one indivisible
step. If they don't, two people press Pay on the last four tickets at the same
moment, both requests read *4 remaining*, and the venue has sold eight seats it
does not have. Somebody gets turned away at the door.

The whole purchase path is shaped around closing that window:

1. **One transaction.** Either an order exists with its tickets and the
   counters have moved, or nothing happened.
2. **No read-then-write.** Availability is a single conditional `UPDATE`:

   ```sql
   UPDATE "TicketType" SET sold = sold + $n
   WHERE id = $1 AND sold + $n <= quantity
   ```

   Postgres locks the row for the duration, so concurrent buyers queue rather
   than race. The loser's update matches zero rows, which becomes an error,
   which rolls the transaction back. There is no gap between the check and the
   claim, because they are the same statement.
3. **A `CHECK` constraint** (`sold <= quantity`) holds the same invariant at
   the storage layer, so a hand-written `UPDATE` or a future migration cannot
   oversell either.
4. **Prices are read inside the transaction**, never taken from the browser.
   `OrderItem.unitPriceCents` is a snapshot, so repricing a tier later cannot
   rewrite what someone already paid.

Money is stored as integer cents. Never a float — `0.1 + 0.2` is a rounding
error in a currency column.

`npm test` proves it rather than asserting it: it runs **20 real concurrent
transactions against 10 real tickets** and checks that exactly ten succeed.

---

## Running it

Needs Node 20.9+ and a PostgreSQL instance.

```bash
npm install
cp .env.example .env          # point DATABASE_URL at your Postgres
npm run db:deploy             # apply migrations
npm run seed                  # 25 events, 20 venues, 6 organisers
npm run dev                   # http://localhost:3002
```

In this workspace the database is the shared Docker Postgres on **5433**
(`docker compose -f ../infra/docker-compose.yml up -d postgres`), and the app
runs on **3002** because 3000/3001 are taken and 5000 is macOS AirPlay.

### Demo logins

Fill buttons for all three are on the sign-in page.

| Role | Email | Password |
|---|---|---|
| Attendee | `demo@sherehepass.ke` | `demo12345` |
| Organiser | `wanjiru@sauti.co.ke` | `organizer12345` |
| Admin | `admin@sherehepass.ke` | `admin12345` |

The attendee account opens with tickets already in its wallet — a live one, a
used one and a pending order — because an empty account demos as broken.

---

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server on 3002 |
| `npm run build` / `start` | Production build and serve |
| `npm test` | The oversell tests — real concurrent transactions |
| `npm run test:journey` | End-to-end in a real browser (needs `dev` running) |
| `npm run seed` | Rebuild the catalogue; idempotent, safe to re-run |
| `npm run db:migrate` | New migration from schema changes |
| `npm run db:studio` | Prisma Studio |
| `npm run covers:fetch` | Re-harvest event cover photos from Unsplash |

---

## How it's built

**Next.js 16, App Router, plain JavaScript.** Pages are Server Components that
query Postgres directly; the HTML that arrives already contains the events. The
only Client Components are the genuinely interactive pieces — the ticket
stepper, the filter chips, the account menu, the door scanner.

**Server Actions for every mutation.** Each one re-derives identity from the
session cookie and scopes its queries itself. A Server Action is a public POST
endpoint, so "the form only offered your own events" is not a control.

**Sessions** are signed JWTs (`jose`, Web Crypto) in an httpOnly cookie. The
user row is re-read on every request, so a role change takes effect immediately
rather than at token expiry. `src/proxy.js` (Next 16 renamed `middleware` to
`proxy`) bounces signed-out visitors cheaply; the real authorisation is in the
pages.

**Reads go through `src/lib/events.js`**, and every public one filters on
`status: 'PUBLISHED'`. A draft leaking onto the browse page is an organiser's
unannounced line-up going out early, and that is what happens when each page
writes its own `where`.

**Tickets are rows, not quantities.** One per person admitted, each with its own
unique code. That is what lets two people holding "2× Regular" be checked in
separately, and what makes a replayed scan a no-op: check-in is another
conditional `UPDATE`, so the second scan of a code matches zero rows.

**Payments are an explicit simulator** with the real shape — a request that
returns a gateway reference immediately, and a callback that settles separately.
Orders are never marked paid by the function that starts the payment, because no
real gateway works that way. One in eight fails on purpose
(`PAYMENT_FAILURE_RATE`), so the release path — putting unpaid tickets back on
sale — is actually exercised. **No money moves and no credentials are
collected.**

---

## Design

Dark-first, and deliberately so: the product is about nights out, the covers are
photographs, and photographs read better on black. There is no light mode and no
`dark:` prefix anywhere.

- **Pink** (`primary`) is the brand and is rationed — glow, logo, active state.
- **Lime** (`secondary`) means money or the action that completes a task. If it
  is lime, it is a price or a button that finishes something.
- Type is **Bricolage Grotesque** for display, **Geist** for text, **Geist Mono**
  for prices and ticket codes, all self-hosted via `next/font` — no runtime
  request to Google, no layout shift.

Covers are real Unsplash photographs, harvested once by
`scripts/fetch-covers.mjs` into `prisma/covers.json` so seeding never depends on
the network. Venues are real places with real coordinates, mapped with a static
OpenStreetMap embed rather than a mapping library — the map is read, not used.

---

## Not built

- **Real payments.** The gateway is a simulator; swapping in Daraja or Stripe is
  a change to `src/lib/payments.js` and nothing else.
- **Email.** Confirmations aren't sent; tickets live in the account.
- **Image upload.** Covers are URLs, restricted to `images.unsplash.com`.
- **Refunds as a flow.** The `REFUNDED` state exists and renders; nothing issues
  it yet.
