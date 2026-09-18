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

The app shows the same thing to a visitor. **`/engineering`** walks through the
race, the statement that closes it, and the `CHECK` constraint behind that —
then hands over a button that fires up to 24 concurrent transactions at a tier
with fewer tickets than that and reports what the database did. It calls the
same `claimStock` the checkout does, against a sandbox tier on a `DRAFT` event,
so nothing it does touches a real event's sales.

---

## Running it

Needs Node 22+ and a PostgreSQL instance.

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
| `npm run db:deploy` | Apply committed migrations (what deploys run) |
| `npm run check:env` | Fail on env values that would ship wrong (runs in `build`) |
| `npm run db:migrate` | New migration from schema changes |
| `npm run db:studio` | Prisma Studio |
| `npm run covers:fetch` | Re-harvest event cover photos from Unsplash |
| `npm run check:classes` | Fail on a Tailwind class that does not exist (runs in `build`) |

---

## Deploying

One service, not two. Pages are Server Components that query Postgres directly
and mutations are Server Actions, so the thing rendering the HTML and the thing
holding the database connection are the same process — there is no API to split
off onto its own host. `render.yaml` is a Render blueprint describing that
service plus the Postgres instance beside it, both in `frankfurt`.

It runs as a long-lived Node process rather than on a serverless platform.
`src/lib/db.ts` connects through `@prisma/adapter-pg`, which holds a real
connection pool; one process owns that pool for its lifetime, where serverless
would open a pool per cold instance and exhaust a small Postgres without a
pooler in front of it.

Point Render at the repo and it reads the blueprint. `DATABASE_URL` is wired
from the database automatically and `JWT_SECRET` is generated once — neither
needs pasting. Everything else has a working default.

**The build order is deliberate**, and not the obvious one:

```
npm ci                    # postinstall runs `prisma generate`
npx prisma migrate deploy  # BEFORE the build, not after
npm run build
```

`app/sitemap.ts` queries the database and Next prerenders it, so the build
needs a schema that already exists. Build first and it fails on a missing
table. `migrate deploy` only applies committed migrations and never prompts or
resets, which is what makes it safe on every deploy.

`npm run build` starts with `scripts/check-env.mjs`, which fails a deploy build
on values that would ship wrong: a localhost or non-https site URL, a missing
database, a `JWT_SECRET` that is short or still a placeholder, or a payment
gateway key (see below). Locally the same problems print as notes and never
block.

### After the first deploy

The database comes up empty, and an events site with no events reads as broken
rather than new:

```bash
npm run seed
```

`npm run seed` clears orders before replacing ticket tiers, which is right
locally and destructive against real sales. It refuses to delete orders on a
non-local database unless `SEED_ALLOW_DESTRUCTIVE=1` is set. A first deploy is
unaffected: an empty database has nothing to destroy, so no flag is needed.

### Two things that will bite

**Do not set `STRIPE_SECRET_KEY` or `MPESA_CONSUMER_KEY`.** No live gateway is
implemented. Setting either does not switch payments on — it switches off the
simulated callback, so every order is created and then never settles, no ticket
is ever minted, and checkout appears to work while doing nothing. The build
refuses to run with either present.

**Free-plan services sleep.** The first request after idle pays a cold start.
Because pages are server-rendered there is no spinner to get stuck on; the
first response is simply slow.

---

## How it's built

**Next.js 16, App Router, TypeScript.** Pages are Server Components that
query Postgres directly; the HTML that arrives already contains the events. The
only Client Components are the genuinely interactive pieces — the ticket
stepper, the filter chips, the account menu, the door scanner.

**Server Actions for every mutation.** Each one re-derives identity from the
session cookie and scopes its queries itself. A Server Action is a public POST
endpoint, so "the form only offered your own events" is not a control.

**Sessions** are signed JWTs (`jose`, Web Crypto) in an httpOnly cookie. The
user row is re-read on every request, so a role change takes effect immediately
rather than at token expiry. `src/proxy.ts` (Next 16 renamed `middleware` to
`proxy`) bounces signed-out visitors cheaply; the real authorisation is in the
pages.

**Reads go through `src/lib/events.ts`**, and every public one filters on
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
- The type scale is **named and fluid** — `display`, `title`, `section`,
  `subhead`, `lead` in `tailwind.config.js`, each carrying its own leading,
  tracking and weight. The sizes are `clamp()` rather than breakpoint chains, so
  one class covers every width and the same heading cannot end up a different
  size on two pages.

Public pages are spacious because they are being browsed; the organiser and
admin surfaces are dense tables because they are being worked through, and
sell-through only means anything next to the other sell-throughs. Every route
has a loading skeleton shaped like the content it stands in for, and every empty
state carries the action that would fill it.

Covers are real Unsplash photographs, harvested once by
`scripts/fetch-covers.mjs` into `prisma/covers.json` so seeding never depends on
the network. Venues are real places with real coordinates, mapped with a static
OpenStreetMap embed rather than a mapping library — the map is read, not used.

---

## Not built

- **Real payments.** The gateway is a simulator; swapping in Daraja or Stripe is
  a change to `src/lib/payments.ts` and nothing else.
- **Email.** Confirmations aren't sent; tickets live in the account.
- **Image upload.** Covers are URLs, restricted to `images.unsplash.com`.
- **Refunds as a flow.** The `REFUNDED` state exists and renders; nothing issues
  it yet.
