import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The end-to-end journey, driven in a real browser.
 *
 * `npm test` proves the purchase transaction cannot oversell. This proves the
 * product around it actually works: someone signs in, picks two tickets, pays,
 * watches the order settle without touching the page, and ends up holding a
 * scannable code — and then the organiser scans it, and cannot scan it twice.
 *
 * It drives Chrome over the DevTools protocol rather than through Playwright
 * or Puppeteer, because the whole thing is about 200 lines and adding a
 * 300MB browser-automation dependency to run it would be the larger cost.
 *
 * Requires the dev server on :3002 and a seeded database:
 *
 *     npm run dev          # in one terminal
 *     npm run seed
 *     npm run test:journey
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3002';
const PORT = 9822;

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(CHROME)) {
  console.error(
    `Chrome not found at ${CHROME}. Set CHROME_PATH to your browser binary.`
  );
  process.exit(1);
}

// Fail fast with a useful message rather than a wall of connection errors.
try {
  const res = await fetch(BASE, { redirect: 'manual' });
  if (!res.ok && res.status < 300) throw new Error(String(res.status));
} catch {
  console.error(`No app at ${BASE}. Start it with \`npm run dev\` first.`);
  process.exit(1);
}

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'sherehe-journey-'))}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  'about:blank',
]);

async function devtoolsUrl() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome DevTools never became available.');
}

const ws = new WebSocket(await devtoolsUrl());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let messageId = 0;
function rpc(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', onMessage);
      message.error
        ? reject(new Error(JSON.stringify(message.error)))
        : resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await rpc('Target.attachToTarget', {
  targetId,
  flatten: true,
});
await rpc('Page.enable', {}, sessionId);
await rpc('Runtime.enable', {}, sessionId);
await rpc(
  'Emulation.setDeviceMetricsOverride',
  { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  sessionId
);

// A hydration failure or a thrown effect would otherwise leave the assertions
// passing against a page that is visibly broken.
const exceptions = [];
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') {
    exceptions.push(
      message.params.exceptionDetails.exception?.description?.split('\n')[0] ??
        'exception'
    );
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function goto(path) {
  await rpc('Page.navigate', { url: BASE + path }, sessionId);
  await sleep(2200);
}

/**
 * Expressions are wrapped in an IIFE because Runtime.evaluate shares one global
 * scope between calls: a bare `const x` at top level throws "already declared"
 * the second time and the expression silently does nothing.
 */
async function evaluate(body) {
  const { result } = await rpc(
    'Runtime.evaluate',
    { expression: `(() => { ${body} })()`, awaitPromise: true, returnByValue: true },
    sessionId
  );
  return result.value;
}

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * React tracks its own value, so setting `.value` directly is invisible to it:
 * the native setter plus a bubbling input event is what makes React see it.
 *
 * Wrapped in a block, because two of these get concatenated into one
 * expression and `const el` twice in the same scope is a SyntaxError that
 * silently voids the whole thing.
 */
const setInput = (selector, value) => `
  {
    const el = document.querySelector(${JSON.stringify(selector)});
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
`;

async function signIn(email, password) {
  await goto('/signin');
  await evaluate(`
    ${setInput('input[name="email"]', email)}
    ${setInput('input[name="password"]', password)}
    document.querySelector('form button[type="submit"]').click();
  `);
  await sleep(3500);
}

async function signOut() {
  await goto('/');
  await evaluate(`
    document.querySelector('button[aria-haspopup="menu"]')?.click();
  `);
  await sleep(500);
  await evaluate(`
    [...document.querySelectorAll('button')]
      .find((b) => /Sign out/.test(b.textContent))?.click();
  `);
  await sleep(2500);
}

// ---------------------------------------------------------------- attendee

await signIn('demo@sherehepass.ke', 'demo12345');
check(
  'signing in leaves the sign-in page',
  (await evaluate('return location.pathname;')) === '/'
);

await goto('/events/devfest-nairobi');

await evaluate(`
  const plus = document.querySelector('button[aria-label^="One more"]');
  plus.click();
`);
await sleep(300);
await evaluate(`
  document.querySelector('button[aria-label^="One more"]').click();
`);
await sleep(500);

check(
  'two clicks on + select two tickets',
  await evaluate('return /2 tickets/.test(document.body.innerText);')
);

await evaluate(`
  [...document.querySelectorAll('button')]
    .find((b) => /Get tickets/.test(b.textContent)).click();
`);
await sleep(3000);
check(
  'the picker leads to checkout',
  (await evaluate('return location.pathname;')).endsWith('/checkout')
);

await evaluate(`
  ${setInput('input[name="phone"]', '0712345678')}
  [...document.querySelectorAll('button[type="submit"]')].at(-1).click();
`);
await sleep(4000);

const orderPath = await evaluate('return location.pathname;');
check('checking out creates an order', orderPath.startsWith('/orders/'), orderPath);
check(
  'the order starts unpaid',
  await evaluate('return document.body.innerText.includes("Waiting for payment");')
);

// The payment simulator settles at 2.5s; the poller refreshes every 2s.
await sleep(9000);
const settled = await evaluate(`
  const text = document.body.innerText;
  return text.includes('You\\u2019re in') ? 'paid'
    : text.includes('go through') ? 'failed'
    : 'pending';
`);
check('the order settles without a reload', settled !== 'pending', settled);

// The simulator fails one payment in eight on purpose (see PAYMENT_FAILURE_RATE
// in src/lib/payments.js). That is correct behaviour, not a defect, so a failed
// payment here is retried once rather than reported as a broken app. Run the
// dev server with PAYMENT_FAILURE_RATE=0 to remove the retry entirely.
if (settled === 'failed') {
  console.log('       (simulated payment declined — retrying once)');
  await goto('/events/devfest-nairobi');
  await evaluate(`document.querySelector('button[aria-label^="One more"]').click();`);
  await sleep(500);
  await evaluate(`
    [...document.querySelectorAll('button')]
      .find((b) => /Get tickets/.test(b.textContent)).click();
  `);
  await sleep(3000);
  await evaluate(`
    ${setInput('input[name="phone"]', '0712345678')}
    [...document.querySelectorAll('button[type="submit"]')].at(-1).click();
  `);
  await sleep(12000);
}

check(
  'a paid order issues a scannable ticket',
  await evaluate(`
    return /SHRH/.test(document.body.innerText)
      && document.querySelectorAll('svg').length > 3;
  `)
);

await goto('/tickets');
check(
  'the ticket wallet lists the purchase',
  await evaluate('return document.body.innerText.includes("DevFest Nairobi");')
);

// The code is needed for the door checks below.
const code = await evaluate(`
  const match = document.body.innerText.match(/SHRH[A-Z0-9-]+/);
  return match ? match[0].replace(/-/g, '') : null;
`);

// --------------------------------------------------------------- organiser

await signOut();
await signIn('brian@nairobidevs.ke', 'organizer12345');

await goto('/organizer');
check(
  'the organiser dashboard renders',
  await evaluate('return document.body.innerText.includes("Nairobi Devs");')
);

const eventId = await evaluate(`
  const link = [...document.querySelectorAll('a[href*="/door"]')]
    .map((a) => a.getAttribute('href'))
    .find((href) => href.includes('/organizer/events/'));
  return link ? link.split('/')[3] : null;
`);

if (code && eventId) {
  await goto(`/organizer/events/${eventId}/door`);
  check('the door screen renders', await evaluate('return /ADMITTED/i.test(document.body.innerText);'));

  async function scan(value) {
    await evaluate(setInput('#ticket-code', value));
    await sleep(400);
    await evaluate(`document.querySelector('#ticket-code').form.requestSubmit();`);
    await sleep(2500);
    // Read only the verdict banner: the recent-scans log below it still holds
    // the previous result and would make a body-text match pass twice.
    return evaluate(
      `return document.querySelector('[aria-live="assertive"]')?.innerText ?? '';`
    );
  }

  check('a valid ticket is admitted', /Admitted\./.test(await scan(code)));
  check(
    'the same ticket cannot be admitted twice',
    /Already checked in/.test(await scan(code))
  );
  check(
    'an unknown code is refused',
    /No such ticket/.test(await scan('SHRHZZZZZZZZ'))
  );
  check(
    'a code typed with its display hyphens still works',
    /Already checked in/.test(await scan(code.replace(/(.{4})(?=.)/g, '$1-')))
  );
} else {
  check('found a ticket and event to scan', false, `code=${code} event=${eventId}`);
}

check(
  'no uncaught exceptions in the browser',
  exceptions.length === 0,
  exceptions.slice(0, 2).join(' | ')
);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);

ws.close();
chrome.kill();
process.exit(failed.length ? 1 : 0);
