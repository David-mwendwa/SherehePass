import { format, formatDistanceToNowStrict, isSameDay } from 'date-fns';

/**
 * Money.
 *
 * Prices are stored as integer cents and only ever become a decimal here, at
 * the edge, on the way to a screen. Nothing upstream should be doing
 * arithmetic on a float.
 */
export function formatKes(cents, { compact = false } = {}) {
  if (cents === 0) return 'Free';
  const shillings = cents / 100;

  if (compact && shillings >= 1000) {
    const thousands = shillings / 1000;
    // 1.5K, but 12K rather than 12.0K.
    const rounded = thousands % 1 === 0 ? thousands : Number(thousands.toFixed(1));
    return `KES ${rounded}K`;
  }

  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: shillings % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(shillings);
}

/** The cheapest tier, which is what a card advertises: "from KES 1,500". */
export function priceRangeLabel(ticketTypes) {
  if (!ticketTypes?.length) return null;
  const prices = ticketTypes.map((t) => t.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === 0 && max === 0) return 'Free';
  if (min === max) return formatKes(min);
  return `From ${formatKes(min)}`;
}

// -------------------------------------------------------------------- dates

export function formatEventDate(startsAt) {
  return format(new Date(startsAt), 'EEE d MMM');
}

export function formatEventDateLong(startsAt) {
  return format(new Date(startsAt), 'EEEE, d MMMM yyyy');
}

export function formatTime(date) {
  return format(new Date(date), 'h:mm a');
}

/**
 * "Sat 14 Mar, 6:00 PM – 11:30 PM" for a single evening, but the full second
 * date when an event runs past midnight or across days, because "6:00 PM –
 * 2:00 AM" on one line reads as an event that ended before it started.
 */
export function formatEventWindow(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startLabel = `${format(start, 'EEE d MMM')}, ${formatTime(start)}`;
  if (isSameDay(start, end)) {
    return `${startLabel} – ${formatTime(end)}`;
  }
  return `${startLabel} – ${format(end, 'EEE d MMM')}, ${formatTime(end)}`;
}

/** "in 3 days" / "2 hours ago", used for the countdown on an event page. */
export function relativeToNow(date) {
  const target = new Date(date);
  const past = target < new Date();
  const distance = formatDistanceToNowStrict(target);
  return past ? `${distance} ago` : `in ${distance}`;
}

export function calendarParts(startsAt) {
  const date = new Date(startsAt);
  return {
    month: format(date, 'MMM').toUpperCase(),
    day: format(date, 'd'),
    weekday: format(date, 'EEE').toUpperCase(),
  };
}

// ------------------------------------------------------------------- labels

export const CATEGORY_LABELS = {
  MUSIC: 'Music',
  TECH: 'Tech',
  SPORTS: 'Sports',
  FOOD: 'Food & Drink',
  ARTS: 'Arts',
  BUSINESS: 'Business',
  FESTIVAL: 'Festival',
  COMMUNITY: 'Community',
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

/**
 * A ticket code shown to a human: SHRH-4F2A-9K1B rather than one 12-character
 * run, because a code that has to be read aloud at a gate needs groups.
 */
export function formatTicketCode(code) {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}
