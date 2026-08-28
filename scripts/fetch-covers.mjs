/**
 * Harvests real Unsplash photo URLs for the seed's event covers.
 *
 * Run manually (`node scripts/fetch-covers.mjs`); the result is committed to
 * prisma/covers.json so seeding never depends on the network. Photo ids are
 * taken from Unsplash's public search rather than typed by hand, because a
 * guessed id is a 404 and a broken cover is worse than no cover.
 */
import { writeFile } from 'node:fs/promises';

const QUERIES = {
  MUSIC: ['live concert stage lights', 'afrobeats concert crowd', 'dj night club'],
  FESTIVAL: ['music festival crowd sunset', 'outdoor festival stage'],
  TECH: ['tech conference talk', 'developer meetup laptops', 'hackathon'],
  SPORTS: ['football stadium night', 'marathon runners road race', 'rugby match'],
  FOOD: ['street food market night', 'restaurant chef plating', 'coffee tasting'],
  ARTS: ['art gallery exhibition', 'theatre stage performance', 'poetry open mic'],
  BUSINESS: ['business conference audience', 'startup pitch stage'],
  COMMUNITY: ['community volunteers outdoors', 'book club discussion', 'yoga class outdoors'],
};

const out = {};

for (const [category, queries] of Object.entries(QUERIES)) {
  out[category] = [];
  for (const query of queries) {
    const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`  ! ${query}: HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();
    for (const photo of json.results ?? []) {
      // Unsplash+ results are served from plus.unsplash.com and are paywalled:
      // the host does not even resolve without a subscription. Keep only the
      // free library.
      const raw = photo.urls?.raw ?? '';
      if (!raw.startsWith('https://images.unsplash.com/')) continue;

      // `raw` carries an ixid search-tracking token that is specific to this
      // one query and adds nothing to the image. Rebuild the URL from the
      // photo path alone so what is committed is stable and readable.
      const base = raw.split('?')[0];
      out[category].push({
        id: photo.id,
        url: `${base}?auto=format&fit=crop&w=1400&q=75`,
        alt: photo.alt_description ?? photo.description ?? null,
        credit: photo.user?.name ?? null,
      });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`${category}: ${out[category].length}`);
}

await writeFile('prisma/covers.json', JSON.stringify(out, null, 2));
console.log('wrote prisma/covers.json');
