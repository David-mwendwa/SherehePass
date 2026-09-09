/**
 * Fails the build if a file that is served to the browser verbatim carries an
 * authored comment.
 *
 * Next.js hands `src/app/icon.svg` and `src/app/apple-icon.svg` to the browser
 * exactly as they sit on disk — a favicon is fetched by every tab — and
 * anything in `public/` the same way. Comments in those files are published,
 * so the reasoning behind the mark lives in `src/components/layout/Logo.tsx`
 * instead, where it is compiled away and sits at the point where the paired
 * edit has to happen.
 *
 * A pre-build check rather than a post-build strip: Next writes the icons into
 * `.next` under content-hashed names with sidecar `.meta` files carrying their
 * byte lengths, so rewriting the output is the fragile way to do this.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src/app', 'public'];
const failures = [];

const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // public/ is empty today and may not exist.
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(svg|txt|xml|webmanifest)$/.test(entry.name)) continue;
    const text = readFileSync(full, 'utf8');
    const marker = entry.name.endsWith('.txt') ? /^[ \t]*#/m : /<!--/;
    if (marker.test(text)) failures.push(full);
  }
};

for (const root of roots) walk(root);

if (failures.length) {
  console.error('\nAsset check failed — these are served to the browser verbatim:\n');
  for (const f of failures) console.error(`  ✗ ${f}: authored comment`);
  console.error('\nMove the note to the component it belongs beside.\n');
  process.exit(1);
}

console.log(`  assets: no authored comments in ${roots.join(', ')}`);
