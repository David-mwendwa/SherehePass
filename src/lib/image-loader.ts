/**
 * Image loader: resize at the source instead of on the instance.
 *
 * Every image in this app is an event cover, and every cover is an Unsplash
 * URL that already carries `auto=format&fit=crop&w=...&q=...` — Unsplash's CDN
 * is a full image pipeline and has already done the work. Next's built-in
 * optimizer therefore fetched an image that was optimised, decoded it, and
 * re-encoded it to AVIF, per size, on the web instance.
 *
 * On a 512MB host that is not merely wasteful, it is fatal: AVIF encoding at
 * the top of `deviceSizes` allocates enough to get the process OOM-killed, so
 * an image request would take the whole server down and every page in flight
 * with it. The symptom is a broken image and an intermittently 502 site, which
 * looks like a hosting problem rather than an image one.
 *
 * Handing the width back to Unsplash removes the work entirely rather than
 * making it cheaper, and `auto=format` still negotiates AVIF or WebP from the
 * browser's Accept header — so the delivered bytes are no worse, and the
 * responsive srcset is still real, since each width is a genuinely different
 * URL.
 *
 * Anything that is not an Unsplash URL is returned untouched. Nothing in the
 * app does that today (`public/` holds no bitmaps and the icon is an SVG that
 * Next's metadata handles), but a custom loader replaces the optimizer for
 * *every* `<Image>`, so a local image added later must not silently be handed
 * to a CDN that has never heard of it.
 */
type ImageLoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

const UNSPLASH_PREFIX = 'https://images.unsplash.com/';

export default function unsplashLoader({
  src,
  width,
  quality,
}: ImageLoaderArgs): string {
  if (!src.startsWith(UNSPLASH_PREFIX)) return src;

  const url = new URL(src);
  url.searchParams.set('auto', 'format');
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('w', String(width));
  url.searchParams.set('q', String(quality ?? 75));
  return url.toString();
}
