import type { Venue } from '@prisma/client';

/**
 * The venue map.
 *
 * A static OpenStreetMap embed rather than a JS mapping library: this map is
 * read, not used. Nobody pans it, nobody clicks a marker. Loading 150KB of
 * Leaflet plus a tile layer to draw one pin on a page that is already carrying
 * a full-bleed photograph is a bad trade, and the iframe is lazy so it costs
 * nothing until it scrolls into view.
 *
 * A Server Component — there is no state here at all.
 */
export type VenueMapProps = {
  /** Coordinates are non-null here: the caller renders nothing without them. */
  venue: Omit<Venue, 'latitude' | 'longitude'> & {
    latitude: number;
    longitude: number;
  };
};

export function VenueMap({ venue }: VenueMapProps) {
  const { latitude, longitude, name, address } = venue;

  // A small box around the point. Tight enough to show the street, wide enough
  // to show which part of town it is in.
  const delta = 0.008;
  const bbox = [
    longitude - delta,
    latitude - delta / 2,
    longitude + delta,
    latitude + delta / 2,
  ].join(',');

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="surface overflow-hidden">
      <iframe
        src={src}
        title={`Map showing ${name}`}
        loading="lazy"
        className="h-64 w-full border-0"
        // The embed is a third-party document; give it nothing it does not need.
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="truncate text-xs text-dark-400">{address}</p>
        </div>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-primary-300 transition-colors hover:text-primary-200"
        >
          Directions
        </a>
      </div>
    </div>
  );
}
