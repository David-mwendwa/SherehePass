import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';

/**
 * The private areas are disallowed here as well as being `noindex` in the page
 * head. The two do different jobs and neither replaces the other: `Disallow`
 * stops a crawler fetching the URL at all, while `noindex` has to be fetched
 * and read before it can be obeyed. Both is right for these, because none of
 * them render anything without a session — a crawler reaching them gets a
 * sign-in redirect, and the site gains a set of dead entries under its own name.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/admin',
          '/organizer',
          '/orders',
          '/saved',
          '/tickets',
          '/signin',
          '/signup',
          // Checkout is a step inside a purchase, not a page anyone should
          // arrive at from a search result.
          '/events/*/checkout',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
