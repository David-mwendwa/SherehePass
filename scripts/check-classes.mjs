import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

/**
 * Fails the build on a Tailwind class that does not exist.
 *
 * This exists because of a real bug that shipped: `h-13`. Tailwind's spacing
 * scale goes 12 then 14, so `h-13` is not a class — and Tailwind does not warn,
 * it simply emits nothing. Every `size="lg"` button therefore had no height at
 * all and collapsed to the height of its own text. Nothing failed: not the
 * build, not the type check, not the tests, not the browser console. The only
 * symptom was that the buttons looked slightly wrong, which is exactly the kind
 * of thing that survives review.
 *
 * The check works by asking Tailwind itself. Tailwind only emits rules for
 * classes it finds in the source, so a class that appears in the source and
 * *not* in the generated CSS is one Tailwind declined to generate — which means
 * it does not exist. No hardcoded scale to keep in sync.
 *
 * Scoped to the utilities where a plausible-looking wrong number is possible
 * and invisible. Colours and layout keywords are excluded: a wrong colour is
 * visible immediately, and the false-positive rate on them is high because they
 * are often composed at runtime.
 */

const ROOT = new URL('..', import.meta.url).pathname;

/** Utilities whose value comes off a numeric scale, where 13 looks as real as 12. */
const CHECKED_PREFIXES = [
  'h', 'w', 'min-h', 'min-w', 'max-h', 'max-w',
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
  'gap', 'gap-x', 'gap-y',
  'space-x', 'space-y',
  'top', 'right', 'bottom', 'left', 'inset',
  'text', 'rounded', 'border', 'leading', 'tracking', 'z',
];

// A bare numeric or decimal value: h-4, w-4.5, p-2.5. Arbitrary values
// (h-[42px]), fractions (w-1/2) and keywords (h-full) are all skipped — those
// either cannot be wrong in this way or are checked by the browser.
// The leading `-?` matters: `-mx-1` is a valid negative margin, and matching
// only `mx-1` out of the middle of it reports a class that is really there.
// `(?<![\w-])` stops `flex-1` being read as the utility `1`.
const CANDIDATE = new RegExp(
  `(?<![\\w-])-?(?:(?:sm|md|lg|xl|2xl|hover|focus|focus-visible|active|disabled|group-hover|first|last|odd|even):)*` +
    `(?:${CHECKED_PREFIXES.join('|')})-\\d+(?:\\.\\d+)?(?![\\w-])`,
  'g'
);

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (['.js', '.jsx'].includes(extname(name))) out.push(path);
  }
  return out;
}

const files = sourceFiles(join(ROOT, 'src'));

// Collect candidates with the file and line they came from, so a failure names
// the place to fix rather than just the class.
const used = new Map();
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(CANDIDATE)) {
      const cls = match[0];
      if (!used.has(cls)) used.set(cls, []);
      used.get(cls).push(`${file.replace(ROOT, '')}:${index + 1}`);
    }
  });
}

if (used.size === 0) {
  console.log('no candidate classes found');
  process.exit(0);
}

// Build the CSS Tailwind would emit for this project.
const tmp = mkdtempSync(join(tmpdir(), 'tw-check-'));
const input = join(tmp, 'in.css');
const output = join(tmp, 'out.css');
writeFileSync(input, '@tailwind utilities;\n');

execFileSync(
  'npx',
  ['tailwindcss', '-c', join(ROOT, 'tailwind.config.js'), '-i', input, '-o', output],
  { cwd: ROOT, stdio: 'pipe' }
);

const css = readFileSync(output, 'utf8');

/** Tailwind escapes `.` and `/` in selectors: `.h-4\.5`. */
const escape = (cls) => cls.replace(/([.:/])/g, '\\$1');

const missing = [];
for (const [cls, locations] of used) {
  // The selector for a variant class carries the variant in it (`.sm\:h-4`),
  // so matching the whole escaped string works for both.
  if (!css.includes(`.${escape(cls)}`)) {
    missing.push({ cls, locations });
  }
}

if (missing.length === 0) {
  console.log(`✓ ${used.size} Tailwind classes all resolve`);
  process.exit(0);
}

console.error(`\n✗ ${missing.length} Tailwind class(es) do not exist:\n`);
for (const { cls, locations } of missing) {
  console.error(`  ${cls}`);
  for (const location of locations) console.error(`    ${location}`);
}
console.error(
  '\nTailwind emits nothing for a class it does not recognise, so these are\n' +
    'silently doing nothing. Check the value against the scale in\n' +
    'tailwind.config.js, or use an arbitrary value like h-[3.25rem].\n'
);
process.exit(1);
