/**
 * Refuses a deploy build that would ship development values.
 *
 * `NEXT_PUBLIC_SITE_URL` is inlined at build time and is what every canonical,
 * every Open Graph URL and every entry in the sitemap is built from. Left unset
 * it falls back to localhost, which compiles, type-checks, renders correctly in
 * every visible respect, and deploys a site whose canonical tags all name a
 * machine no crawler can reach — telling Google the real URLs are duplicates of
 * something that does not exist. Nothing about the running site looks wrong.
 *
 * `DATABASE_URL` is needed *by the build*, not only at runtime: app/sitemap.ts
 * queries the database and Next prerenders it, so a build without a reachable
 * Postgres fails partway through with a Prisma connection error rather than
 * anything that names the real problem. It also means `prisma migrate deploy`
 * has to run before the build, not after.
 *
 * `JWT_SECRET` signs every session cookie. The dev value is committed in
 * .env.example and quoted in the project notes, so shipping it means anyone who
 * has read the repo can mint an admin session. lib/session.ts already refuses
 * to run without a secret; this is the check for the worse case, where one is
 * set and is the wrong one.
 *
 * Only enforced where the answer is knowable. A local build with no env file is
 * ordinary and stays a note; the hosts set these themselves.
 */
const DEPLOY = process.env.NETLIFY || process.env.VERCEL || process.env.RENDER ||
  process.env.CI;

// This runs as its own process ahead of `next build`, so it does not inherit
// Next's automatic .env loading and would otherwise report every local value as
// simply missing — which cannot tell "you have no .env" apart from "your secret
// is still the placeholder". Hosts set real environment variables and have no
// .env at all, so the import failing there is expected and ignored; real values
// already in the environment win, because dotenv does not overwrite them.
if (!DEPLOY) {
  try {
    (await import('dotenv')).config({ quiet: true });
  } catch {
    // dotenv is a devDependency. Without it, the checks below still run
    // against whatever the environment already holds.
  }
}

const problems = [];

// ------------------------------------------------------------- site URL
// Same precedence as SITE_URL in lib/seo.ts, and it has to stay that way: this
// check is only worth anything if it inspects the value the build will use.
// RENDER_EXTERNAL_URL is what lets a first deploy succeed before anyone knows
// the service's address — but it is Render's to provide, so if it is missing
// this still fails rather than quietly falling through to localhost.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL;
// Name the variable the value actually came from, so the fix is unambiguous.
const siteUrlVar = process.env.NEXT_PUBLIC_SITE_URL
  ? 'NEXT_PUBLIC_SITE_URL'
  : 'RENDER_EXTERNAL_URL';

if (!siteUrl) {
  problems.push('neither NEXT_PUBLIC_SITE_URL nor RENDER_EXTERNAL_URL is set');
} else if (/localhost|127\.0\.0\.1/.test(siteUrl)) {
  problems.push(`${siteUrlVar} is a development origin (${siteUrl})`);
} else if (!/^https:\/\//.test(siteUrl)) {
  // A canonical has to be absolute and, on a live site, https — a http:// one
  // names a URL that redirects before it can be read.
  problems.push(`${siteUrlVar} is not an https URL (${siteUrl})`);
} else if (siteUrl.endsWith('/')) {
  // absoluteUrl() joins this to a path that already starts with a slash, so a
  // trailing one here produces `https://host//events` in every canonical.
  problems.push(`${siteUrlVar} has a trailing slash (${siteUrl})`);
}

// ------------------------------------------------------------- database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  problems.push('DATABASE_URL is not set (the build prerenders the sitemap)');
} else if (DEPLOY && /localhost|127\.0\.0\.1/.test(databaseUrl)) {
  problems.push('DATABASE_URL points at localhost');
}

// ----------------------------------------------------------------- auth
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  problems.push('JWT_SECRET is not set');
} else if (/dev-only|change-in-production|changeme|secret123/i.test(jwtSecret)) {
  problems.push('JWT_SECRET is still a development placeholder');
} else if (jwtSecret.length < 32) {
  problems.push(
    `JWT_SECRET is ${jwtSecret.length} characters; use at least 32`
  );
}

// ------------------------------------------------------------- payments
/*
 * There is no live gateway in this build. `gatewayMode()` in lib/payments.ts
 * reports "live" as soon as either key is present, and the only thing that
 * actually changes is that the simulated callback stops being scheduled: the
 * order is created, the payment is never settled, `markOrderPaid` never runs,
 * no ticket is ever minted, and the held stock waits for a release that only
 * arrives on expiry. Checkout appears to work and then quietly does nothing.
 *
 * Worth guarding rather than trusting, because sibling projects in this
 * workspace (furniworld, BazaarKE) do carry real Stripe and Daraja sandbox
 * credentials, and an environment copied from one of them brings these along.
 */
for (const key of ['STRIPE_SECRET_KEY', 'MPESA_CONSUMER_KEY']) {
  if (process.env[key]) {
    problems.push(
      `${key} is set, but no live gateway is implemented — every order would ` +
        'stay unpaid. Unset it to keep the simulator.'
    );
  }
}

// ---------------------------------------------------------------- report
if (!problems.length) {
  console.log(`✓ site URL: ${siteUrl} (from ${siteUrlVar})`);
  process.exit(0);
}

if (DEPLOY) {
  console.error('\ncheck-env: this build would ship the wrong values\n');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error('');
  process.exit(1);
}

for (const problem of problems) {
  console.log(`  note: ${problem} (local build, not enforced)`);
}
