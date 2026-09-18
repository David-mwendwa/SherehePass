/** @type {import('next').NextConfig} */
const nextConfig = {
  // The default `X-Powered-By: Next.js` names the framework and version to
  // anyone scanning, and buys nothing in return.
  poweredByHeader: false,

  images: {
    // Resizing happens at Unsplash, not here — see src/lib/image-loader.ts for
    // why. The built-in optimizer decoded and re-encoded an already-optimised
    // CDN image on the web instance, which on a 512MB host got the process
    // OOM-killed: one image request took the whole server down, so the site
    // read as intermittently 502 rather than as having an image problem.
    //
    // `remotePatterns` and `formats` are deliberately gone rather than left
    // behind. A custom loader bypasses the optimizer completely, so neither is
    // read any more, and keeping them would describe a pipeline that no longer
    // runs. The host allowlist they provided moves into the loader, which
    // returns anything non-Unsplash untouched.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },

  /**
   * Response headers for every route.
   *
   * No Content-Security-Policy here. This app emits JSON-LD through
   * `dangerouslySetInnerHTML` and Next injects its own inline bootstrap, so a
   * useful CSP needs a per-request nonce threaded through both, which is a
   * change to how pages render rather than a line of config. A CSP written
   * without that is either broken or so loose it proves nothing, and the
   * headers below are the part that is genuinely free.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Two years, on every subdomain. The site is https-only in
            // production, so there is no http origin left to lock out.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            // Stops a browser second-guessing a Content-Type — the trick that
            // turns an uploaded file served as text/plain into script.
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Send the full URL within this site, only the origin when leaving
            // it. An event URL names what someone is buying a ticket to.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Who may frame *this* site. The OpenStreetMap embed on an event
            // page is the other direction and is governed by OSM's own
            // headers, so this does not affect it.
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            // Nothing here asks for any of these: the door scanner is a text
            // input by design, precisely so a gate with no camera permission
            // still works. Declaring that makes a later regression obvious.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
