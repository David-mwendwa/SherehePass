/**
 * Canonical URLs and structured data.
 *
 * The metadata itself lives on each route, next to the data it describes —
 * `generateMetadata` is the framework's own answer and there is no reason to
 * rebuild it. What belongs here is the part that must not be reinvented per
 * page: the one absolute-URL helper, and the JSON-LD graphs, whose correctness
 * rules are subtle enough that a second copy would drift from the first.
 */
import type { EventDetail } from '@/lib/events';

export const SITE_NAME = 'SherehePass';

/**
 * The site's own origin, defined once.
 *
 * `NEXT_PUBLIC_SITE_URL` is the explicit answer and always wins.
 * `RENDER_EXTERNAL_URL` is the bootstrap: Render only knows a service's URL
 * once the service exists, so a first deploy would otherwise have to fail,
 * have the URL pasted in, and be run again. It is a plain server variable
 * rather than a `NEXT_PUBLIC_` one, which is fine because nothing in this
 * module is imported by a client component — check before adding one.
 *
 * The localhost fallback is for local development only. Shipping it would put
 * a canonical on every page naming a machine no crawler can reach, so
 * scripts/check-env.mjs fails a deploy build that reaches this far.
 *
 * `||` rather than `??`, and it matters: a blueprint's optional variable left
 * blank in the host's UI arrives as an empty string, not as unset. `??` treats
 * `''` as a real answer and every canonical becomes the empty string, while
 * check-env.mjs — which uses `||` — sees the fallback and reports the build
 * healthy. The two must agree or the check is worse than none, because it
 * certifies the exact failure it exists to catch.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'http://localhost:3002'
).replace(/\/$/, '');

export const DEFAULT_DESCRIPTION =
  'Find concerts, festivals, tech meetups and match days across Kenya, and buy the ticket in the same breath. Pay with M-Pesa or card, and walk in with a QR code on your phone.';

/**
 * Absolute URL for a path.
 *
 * Next resolves relative `alternates.canonical` against `metadataBase` on its
 * own, so this is for the places it cannot reach: JSON-LD, which is a string
 * blob the framework never inspects, and the sitemap.
 *
 * No trailing slash is added. `trailingSlash` is left at its default, so
 * `/events/x` is the URL the server answers and the slashed form redirects —
 * the opposite of a static export, where the directory is what exists.
 */
export const absoluteUrl = (path = '/') =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const money = (cents: number) => (cents / 100).toFixed(2);

/**
 * Whether an event may still advertise tickets for sale.
 *
 * Availability is the half of event markup that is easy to get wrong and
 * expensive to get wrong: a graph that offers tickets for a concert that has
 * already happened, or one that was cancelled, is not merely stale — it is a
 * false claim about a purchase, and it is the thing rich-result eligibility is
 * withdrawn for. Both conditions are derived here rather than at each call
 * site so a page cannot answer one and forget the other.
 */
const saleability = (event: Pick<EventDetail, 'status' | 'endsAt'>) => {
  const cancelled = event.status === 'CANCELLED';
  const past = event.endsAt.getTime() < Date.now();
  return { cancelled, past, sellable: !cancelled && !past };
};

/** `Event`, the graph Google's event experience reads. */
export const eventJsonLd = (event: EventDetail) => {
  const { cancelled, past, sellable } = saleability(event);
  const url = absoluteUrl(`/events/${event.slug}`);

  const offers = event.ticketTypes
    .map((tier) => {
      const soldOut = tier.sold >= tier.quantity;
      return {
        '@type': 'Offer',
        name: tier.name,
        url,
        price: money(tier.priceCents),
        priceCurrency: 'KES',
        // A tier that is gone stays in the graph as SoldOut rather than being
        // dropped: removing it understates the event and loses the price
        // range, while claiming InStock for it would be the false half.
        availability: `https://schema.org/${
          !sellable || soldOut ? 'SoldOut' : 'InStock'
        }`,
        ...(tier.salesStart
          ? { validFrom: tier.salesStart.toISOString() }
          : null),
        ...(tier.salesEnd ? { validThrough: tier.salesEnd.toISOString() } : null),
      };
    })
    .filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.summary,
    url,
    image: [event.coverImage],
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventStatus: `https://schema.org/${
      cancelled ? 'EventCancelled' : 'EventScheduled'
    }`,
    // Every event here is a physical gate someone walks through; there is no
    // streaming product, so declaring the mode is a statement of fact rather
    // than a guess.
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue.address,
        addressRegion: event.venue.county,
        addressCountry: 'KE',
      },
      ...(event.venue.latitude != null && event.venue.longitude != null
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: event.venue.latitude,
              longitude: event.venue.longitude,
            },
          }
        : null),
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer.name,
      url: absoluteUrl(`/organizers/${event.organizer.slug}`),
      ...(event.organizer.website ? { sameAs: [event.organizer.website] } : null),
    },
    ...(offers.length ? { offers } : null),
    ...(event.minAge != null
      ? { typicalAgeRange: `${event.minAge}-` }
      : null),
    // Past events keep their graph — a search result for last month's festival
    // is legitimate — but nothing about it should read as an invitation.
    ...(past ? { isAccessibleForFree: false } : null),
  };
};

export const organizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/icon.svg'),
  description: DEFAULT_DESCRIPTION,
  areaServed: { '@type': 'Country', name: 'Kenya' },
});

export const websiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbJsonLd = (
  crumbs: Array<{ name: string; path: string }>
) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(crumb.path),
  })),
});

/**
 * A `<script type="application/ld+json">` payload.
 *
 * `<` is escaped because the graph carries user-authored strings — an event
 * title or an organizer bio containing `</script>` would otherwise close the
 * tag early and put the remainder of the JSON into the document as markup.
 */
export const jsonLdScript = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');
