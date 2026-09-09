/**
 * Refuses a deploy build that would ship development URLs.
 *
 * `NEXT_PUBLIC_SITE_URL` is inlined at build time and is what every canonical,
 * every Open Graph URL and every entry in the sitemap is built from. Left unset
 * it falls back to localhost, which compiles, type-checks, renders correctly in
 * every visible respect, and deploys a site whose canonical tags all name a
 * machine no crawler can reach — telling Google the real URLs are duplicates of
 * something that does not exist. Nothing about the running site looks wrong.
 *
 * Only enforced where the answer is knowable. A local build with no env file is
 * ordinary and stays a note; the hosts set these themselves.
 */
const DEPLOY = process.env.NETLIFY || process.env.VERCEL || process.env.CI;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const problems = [];

if (!siteUrl) {
  problems.push('NEXT_PUBLIC_SITE_URL is not set');
} else if (/localhost|127\.0\.0\.1/.test(siteUrl)) {
  problems.push(`NEXT_PUBLIC_SITE_URL is a development origin (${siteUrl})`);
} else if (!/^https:\/\//.test(siteUrl)) {
  // A canonical has to be absolute and, on a live site, https — a http:// one
  // names a URL that redirects before it can be read.
  problems.push(`NEXT_PUBLIC_SITE_URL is not an https URL (${siteUrl})`);
}

if (!problems.length) {
  console.log(`✓ site URL: ${siteUrl}`);
  process.exit(0);
}

if (DEPLOY) {
  console.error('\ncheck-env: this build would ship the wrong URLs\n');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error('');
  process.exit(1);
}

for (const problem of problems) {
  console.log(`  note: ${problem} (local build, not enforced)`);
}
