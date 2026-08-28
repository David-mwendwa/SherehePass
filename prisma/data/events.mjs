/**
 * The seeded catalogue.
 *
 * Dates are stored as day offsets from the seed run rather than fixed
 * timestamps, so a demo opened six months from now still shows a browse page
 * full of upcoming events instead of an archive. Negative offsets are past
 * events, which exist deliberately: an account with no history is a worse
 * demo than one that can show a used ticket next to a live one.
 *
 * Prices are integer cents of KES, matching the schema.
 */

export const ORGANIZERS = [
  {
    slug: 'sauti-collective',
    name: 'Sauti Collective',
    bio: 'Live music promoters working with East African artists since 2016. Rooftops, warehouses and the occasional forest clearing.',
    website: 'https://example.com/sauti',
    verified: true,
    user: { name: 'Wanjiru Kamau', email: 'wanjiru@sauti.co.ke' },
  },
  {
    slug: 'nairobi-devs',
    name: 'Nairobi Devs',
    bio: 'A community of engineers, designers and founders. Monthly meetups, an annual conference, and free entry for students.',
    website: 'https://example.com/nairobidevs',
    verified: true,
    user: { name: 'Brian Otieno', email: 'brian@nairobidevs.ke' },
  },
  {
    slug: 'pwani-sounds',
    name: 'Pwani Sounds',
    bio: 'Coastal festivals and beach sessions from Mombasa to Lamu. Taarab, benga, bass and everything in between.',
    website: 'https://example.com/pwani',
    verified: true,
    user: { name: 'Halima Said', email: 'halima@pwanisounds.ke' },
  },
  {
    slug: 'jiko-la-jiji',
    name: 'Jiko la Jiji',
    bio: 'Food events built around Kenyan producers — night markets, chef residencies and long tables.',
    website: null,
    verified: false,
    user: { name: 'Kevin Mutiso', email: 'kevin@jikolajiji.ke' },
  },
  {
    slug: 'rift-athletics',
    name: 'Rift Athletics',
    bio: 'Road races and trail events out of Eldoret and Iten, run by people who came up through the camps.',
    website: 'https://example.com/rift',
    verified: true,
    user: { name: 'Cherop Kiplagat', email: 'cherop@riftathletics.ke' },
  },
  {
    slug: 'kilele-arts',
    name: 'Kilele Arts',
    bio: 'Theatre, spoken word and gallery nights. We put on the work that does not fit anywhere else.',
    website: null,
    verified: false,
    user: { name: 'Njeri Wambui', email: 'njeri@kilelearts.ke' },
  },
];

/** Ticket tier shapes, reused across events so pricing stays coherent. */
const tiers = {
  clubNight: [
    { name: 'Early Bird', priceCents: 100000, quantity: 150, description: 'Limited release. Once they are gone, they are gone.' },
    { name: 'Advance', priceCents: 150000, quantity: 400 },
    { name: 'Gate', priceCents: 200000, quantity: 200, description: 'Available on the door, subject to capacity.' },
  ],
  festival: [
    { name: 'Day Pass', priceCents: 250000, quantity: 2000 },
    { name: 'Weekend Pass', priceCents: 600000, quantity: 900, description: 'Both days, plus in-and-out access.' },
    { name: 'VIP Weekend', priceCents: 1500000, quantity: 150, description: 'Raised deck, private bar, dedicated entrance.' },
  ],
  meetup: [
    { name: 'General', priceCents: 0, quantity: 180, description: 'Free, but please only book if you will show up.' },
    { name: 'Supporter', priceCents: 100000, quantity: 40, description: 'Covers a student ticket as well as your own.' },
  ],
  conference: [
    { name: 'Student', priceCents: 150000, quantity: 200, description: 'Bring a valid student ID to the door.' },
    { name: 'Individual', priceCents: 750000, quantity: 500 },
    { name: 'Company', priceCents: 1800000, quantity: 120, description: 'Two seats and a table in the sponsor hall.' },
  ],
  race: [
    { name: '10K', priceCents: 200000, quantity: 1200 },
    { name: 'Half Marathon', priceCents: 350000, quantity: 800 },
    { name: 'Full Marathon', priceCents: 500000, quantity: 400 },
  ],
  dining: [
    { name: 'Single Seat', priceCents: 450000, quantity: 60 },
    { name: 'Pair', priceCents: 850000, quantity: 30, description: 'Two seats, side by side.' },
  ],
  theatre: [
    { name: 'Balcony', priceCents: 120000, quantity: 120 },
    { name: 'Stalls', priceCents: 200000, quantity: 180 },
  ],
  market: [
    { name: 'Entry', priceCents: 50000, quantity: 800 },
  ],
};

export const EVENTS = [
  // ------------------------------------------------------------------ music
  {
    slug: 'sauti-rooftop-sessions-vol-9',
    title: 'Rooftop Sessions Vol. 9',
    organizer: 'sauti-collective',
    venue: 'The Alchemist',
    category: 'MUSIC',
    summary:
      'Six hours of live sets as the sun goes down over Westlands, with a horn section that refuses to leave the stage.',
    description: `Rooftop Sessions has been running on the last Friday of the month for four years, and Vol. 9 is the biggest one yet.

Doors at 4pm, first set at 5. The bill runs through Afro-fusion, a benga revival act, and a closing DJ set that has historically gone until the neighbours complain. Full bar, three food stalls, and a shaded seating deck for anyone who would rather sit down.

Bring ID — over 21s only. The venue is a ten-minute walk from Sarit Centre and there is paid parking on site.`,
    daysFromNow: 9,
    durationHours: 8,
    startHour: 16,
    featured: true,
    minAge: 21,
    tiers: tiers.clubNight,
  },
  {
    slug: 'benga-revival-night',
    title: 'Benga Revival Night',
    organizer: 'sauti-collective',
    venue: 'Kenya National Theatre',
    category: 'MUSIC',
    summary:
      'Four bands, one night, and a genre that never actually went away — played the way it was recorded in 1974.',
    description: `A seated show, deliberately. Benga was written for dancing but it was arranged for listening, and this line-up plays it note for note off the original pressings.

Two sets with an interval. The bar stays open throughout, and there is a record stall in the foyer selling reissues.`,
    daysFromNow: 23,
    durationHours: 4,
    startHour: 19,
    tiers: tiers.theatre,
  },
  {
    slug: 'kasarani-live-december',
    title: 'Kasarani Live: December Edition',
    organizer: 'sauti-collective',
    venue: 'Kasarani Stadium',
    category: 'MUSIC',
    summary:
      'The end-of-year stadium show, with a headline act announced two weeks out and a supporting bill of eleven.',
    description: `Gates at 2pm for a 4pm start. Eleven acts across two stages, running until 11.

This is the one that sells out, so the Early Bird tier is genuinely limited rather than a marketing device. Under-16s go free with a paying adult but still need a ticket for the headcount.`,
    daysFromNow: 54,
    durationHours: 9,
    startHour: 14,
    featured: true,
    tiers: tiers.festival,
  },

  // -------------------------------------------------------------- festivals
  {
    slug: 'pwani-beach-festival',
    title: 'Pwani Beach Festival',
    organizer: 'pwani-sounds',
    venue: 'Diani Beach',
    category: 'FESTIVAL',
    summary:
      'Two days on the sand at Diani, with the main stage facing the water and the last set finishing at sunrise.',
    description: `Now in its seventh year. Two stages, twenty-eight acts, and a beach that stays open through the night.

Weekend passes include in-and-out access, so you can go back to your hotel and return. Camping is available separately through the festival site — this ticket does not include it.

Getting there: fly into Ukunda, or take the Likoni ferry and drive 45 minutes south.`,
    daysFromNow: 38,
    durationHours: 30,
    startHour: 15,
    featured: true,
    minAge: 18,
    tiers: tiers.festival,
  },
  {
    slug: 'lamu-cultural-weekend',
    title: 'Lamu Cultural Weekend',
    organizer: 'pwani-sounds',
    venue: 'Lamu Old Town',
    category: 'FESTIVAL',
    summary:
      'Dhow races, taarab in the square, and a town that closes its streets for three days.',
    description: `The festival takes over Lamu Old Town: performances in the square, dhow racing off the seafront, poetry in the museum courtyard, and food stalls the length of the harbour.

There are no cars on Lamu. Everything is walkable, and everything is close.`,
    daysFromNow: 71,
    durationHours: 60,
    startHour: 10,
    tiers: [
      { name: 'Weekend Pass', priceCents: 300000, quantity: 1500 },
      { name: 'Weekend Pass + Dhow Race Seat', priceCents: 550000, quantity: 200, description: 'Reserved seating on the race barge.' },
    ],
  },
  {
    slug: 'naivasha-lakeside-sessions',
    title: 'Lakeside Sessions',
    organizer: 'sauti-collective',
    venue: 'Lake Naivasha Resort',
    category: 'FESTIVAL',
    summary:
      'A one-day festival on the shore at Naivasha, ninety minutes from Nairobi and worth every one of them.',
    description: `One stage, eight acts, from midday until midnight, on the grass between the lodge and the water.

Day tickets only — there is no camping. Shuttles run from Nairobi CBD and are booked separately.`,
    daysFromNow: 16,
    durationHours: 12,
    startHour: 12,
    tiers: [
      { name: 'Early Bird', priceCents: 200000, quantity: 300 },
      { name: 'General', priceCents: 300000, quantity: 1200 },
      { name: 'Lakeside Deck', priceCents: 800000, quantity: 80, description: 'Reserved deck with its own bar and a view over the water.' },
    ],
  },

  // ------------------------------------------------------------------- tech
  {
    slug: 'nairobi-devs-monthly-march',
    title: 'Nairobi Devs Monthly',
    organizer: 'nairobi-devs',
    venue: 'iHub',
    category: 'TECH',
    summary:
      'Three talks, no sponsors on stage, and pizza that arrives before the questions rather than after.',
    description: `The monthly meetup. Three speakers, twenty minutes each, then an hour of actually talking to people.

This month: incremental migrations off a monolith, what a year of running Postgres in production taught one team, and a live-coded intro to Server Components.

Free, but the room holds 180 and it does fill up. If you book and cannot make it, please release your ticket so someone else can take it.`,
    daysFromNow: 5,
    durationHours: 3,
    startHour: 18,
    tiers: tiers.meetup,
  },
  {
    slug: 'devfest-nairobi',
    title: 'DevFest Nairobi',
    organizer: 'nairobi-devs',
    venue: 'Sarit Expo Centre',
    category: 'TECH',
    summary:
      'One day, four tracks, and a hallway that has historically been better than any of them.',
    description: `Four tracks: web, mobile, data and infrastructure. Forty speakers, a workshop floor with hands-on sessions, and a hiring corner for companies that are actually recruiting.

Student tickets are heavily subsidised and cover the same access as an individual ticket, including lunch. Bring a valid student ID.`,
    daysFromNow: 47,
    durationHours: 10,
    startHour: 8,
    featured: true,
    tiers: tiers.conference,
  },
  {
    slug: 'kisumu-tech-weekend',
    title: 'Kisumu Tech Weekend',
    organizer: 'nairobi-devs',
    venue: 'Kisumu Impala Sanctuary',
    category: 'TECH',
    summary:
      'The lakeside edition — a two-day unconference where the schedule is written on the morning of day one.',
    description: `No fixed programme. Everyone who turns up can propose a session, the room votes, and the grid is filled in before the first coffee break.

It works better than it sounds, and it has run for three years.`,
    daysFromNow: 33,
    durationHours: 26,
    startHour: 9,
    tiers: [
      { name: 'General', priceCents: 100000, quantity: 150 },
      { name: 'Supporter', priceCents: 400000, quantity: 50, description: 'Covers three student places alongside your own.' },
    ],
  },

  // ----------------------------------------------------------------- sports
  {
    slug: 'eldoret-half-marathon',
    title: 'Eldoret Half Marathon',
    organizer: 'rift-athletics',
    venue: 'Eldoret Sports Club',
    category: 'SPORTS',
    summary:
      'A road race at 2,100 metres, on the course that half the world’s distance runners trained on first.',
    description: `Three distances: 10K, half and full. Chip timing on all three, water every 3km, and a medical team at every station.

Start is 6:30am, which sounds cruel and is the only sensible option at this altitude. Registration closes a week before race day and there are no entries on the morning.`,
    daysFromNow: 28,
    durationHours: 6,
    startHour: 6,
    tiers: tiers.race,
  },
  {
    slug: 'hells-gate-trail-run',
    title: 'Hell’s Gate Trail Run',
    organizer: 'rift-athletics',
    venue: 'Hell’s Gate National Park',
    category: 'SPORTS',
    summary:
      'Twenty-one kilometres through a gorge, past zebra, with the park closed to vehicles for the morning.',
    description: `A single 21km loop through the park. Fully marshalled, with the road closed to traffic from 6am until the last runner is in.

You will run past wildlife. Rangers are stationed along the route and the briefing at the start line is not optional.`,
    daysFromNow: 62,
    durationHours: 5,
    startHour: 7,
    tiers: [
      { name: 'Solo', priceCents: 400000, quantity: 500 },
      { name: 'Relay Team (3)', priceCents: 900000, quantity: 100, description: 'Three runners, one timing chip, seven kilometres each.' },
    ],
  },
  {
    slug: 'nairobi-derby',
    title: 'Nairobi Derby',
    organizer: 'rift-athletics',
    venue: 'Nyayo National Stadium',
    category: 'SPORTS',
    summary:
      'The one fixture that fills Nyayo. Gates at 1pm for a 4pm kick-off, and yes, you should get there early.',
    description: `All-seated. Home and away ends are separated and tickets are sold by stand — pick the right one.

No glass, no flares, no umbrellas. The stadium is on the Langata Road side and matchday traffic starts building around midday.`,
    daysFromNow: 19,
    durationHours: 5,
    startHour: 13,
    tiers: [
      { name: 'Terrace', priceCents: 50000, quantity: 8000 },
      { name: 'Main Stand', priceCents: 150000, quantity: 3000 },
      { name: 'VIP', priceCents: 500000, quantity: 400, description: 'Covered seating, hospitality, separate entrance.' },
    ],
  },

  // ------------------------------------------------------------------- food
  {
    slug: 'jiji-night-market',
    title: 'Jiji Night Market',
    organizer: 'jiko-la-jiji',
    venue: 'Ngong Racecourse',
    category: 'FOOD',
    summary:
      'Forty stalls, one long table, and a rule that every vendor must source at least half their produce within 100km.',
    description: `A night market on the racecourse grass. Forty food stalls, a bar, and live music that stays quiet enough to talk over.

Entry is cheap on purpose — you are paying the vendors, not us. Cash and M-Pesa both work at every stall.`,
    daysFromNow: 12,
    durationHours: 7,
    startHour: 17,
    tiers: tiers.market,
  },
  {
    slug: 'long-table-nanyuki',
    title: 'Long Table: Nanyuki',
    organizer: 'jiko-la-jiji',
    venue: 'Nanyuki Sports Club',
    category: 'FOOD',
    summary:
      'One table, sixty seats, six courses, and a menu written the week before from whatever the farms had.',
    description: `A single seating. Everyone eats the same thing at the same time, and the menu is not published in advance because it depends on what is ready.

Dietary requirements are handled — tell us when you book. Wine pairing is included.`,
    daysFromNow: 26,
    durationHours: 4,
    startHour: 18,
    tiers: tiers.dining,
  },
  {
    slug: 'mombasa-street-food-crawl',
    title: 'Old Town Street Food Crawl',
    organizer: 'jiko-la-jiji',
    venue: 'Fort Jesus',
    category: 'FOOD',
    summary:
      'A three-hour walk through Mombasa Old Town, stopping at seven places you would not find alone.',
    description: `Starts at Fort Jesus, finishes at the harbour. Seven stops, all of them family-run, most of them older than everyone on the walk.

Small groups — twenty people maximum per crawl, which is why it sells out. Comfortable shoes; the streets are cobbled and narrow.`,
    daysFromNow: 41,
    durationHours: 3,
    startHour: 17,
    tiers: [
      { name: 'Crawl Ticket', priceCents: 350000, quantity: 20, description: 'All seven stops, everything you eat, and a guide.' },
    ],
  },

  // ------------------------------------------------------------------- arts
  {
    slug: 'open-mic-at-the-museum',
    title: 'Open Mic at the Museum',
    organizer: 'kilele-arts',
    venue: 'Nairobi National Museum',
    category: 'ARTS',
    summary:
      'Spoken word in the courtyard, twelve slots, and a sign-up sheet that opens an hour before the first reader.',
    description: `Twelve slots of five minutes each, drawn at random from whoever signs up on the night. Two featured poets close the evening.

Free to watch, free to read. The ticket is for the headcount — the courtyard holds what it holds.`,
    daysFromNow: 7,
    durationHours: 3,
    startHour: 18,
    tiers: [
      { name: 'Entry', priceCents: 0, quantity: 140 },
    ],
  },
  {
    slug: 'kilele-gallery-night',
    title: 'Gallery Night: New Work',
    organizer: 'kilele-arts',
    venue: 'Nairobi National Museum',
    category: 'ARTS',
    summary:
      'Nine painters showing work made this year, with every artist in the room and every price on the wall.',
    description: `A one-night show. Nine artists, roughly forty pieces, all made in the last twelve months and none of it shown before.

Everything is for sale and every price is on the label, because a gallery that makes you ask is a gallery betting you will not.`,
    daysFromNow: 21,
    durationHours: 4,
    startHour: 18,
    tiers: [
      { name: 'Entry', priceCents: 100000, quantity: 200, description: 'Includes a drink on arrival.' },
    ],
  },
  {
    slug: 'kilele-theatre-mashetani',
    title: 'Mashetani — a new staging',
    organizer: 'kilele-arts',
    venue: 'Kenya National Theatre',
    category: 'ARTS',
    summary:
      'Ebrahim Hussein’s play, staged in the round, running six nights with no interval.',
    description: `Staged in the round with the audience on all four sides. Ninety minutes, no interval.

Performed in Kiswahili with English surtitles. Latecomers cannot be seated once the play has begun — the entrances are through the audience.`,
    daysFromNow: 35,
    durationHours: 2,
    startHour: 19,
    tiers: tiers.theatre,
  },

  // --------------------------------------------------------------- business
  {
    slug: 'founders-breakfast-q2',
    title: 'Founders Breakfast',
    organizer: 'nairobi-devs',
    venue: 'KICC',
    category: 'BUSINESS',
    summary:
      'Forty founders, one room, and a strict rule that nobody pitches anybody before 9am.',
    description: `A quarterly breakfast for people running early-stage companies. Two short talks, then structured introductions, then breakfast.

Deliberately small. Attendance is capped at forty so that everyone in the room can meet everyone else.`,
    daysFromNow: 14,
    durationHours: 3,
    startHour: 7,
    tiers: [
      { name: 'Seat', priceCents: 350000, quantity: 40 },
    ],
  },
  {
    slug: 'east-africa-fintech-summit',
    title: 'East Africa Fintech Summit',
    organizer: 'nairobi-devs',
    venue: 'KICC',
    category: 'BUSINESS',
    summary:
      'Two days on payments, lending and regulation, with the regulators actually on stage rather than in the audience.',
    description: `Two days at KICC. Day one is policy and regulation; day two is product and engineering.

Company tickets include two seats and a table in the sponsor hall. Individual tickets include everything except the table.`,
    daysFromNow: 58,
    durationHours: 26,
    startHour: 8,
    tiers: tiers.conference,
  },

  // -------------------------------------------------------------- community
  {
    slug: 'uhuru-gardens-cleanup',
    title: 'Uhuru Gardens Clean-Up',
    organizer: 'kilele-arts',
    venue: 'Uhuru Gardens',
    category: 'COMMUNITY',
    summary:
      'Three hours, gloves and bags provided, and lunch for everyone who stays to the end.',
    description: `Meet at the main gate at 8am. Gloves, bags and grabbers are provided; wear closed shoes and bring a hat.

Children are welcome with an adult. We finish at 11 and there is lunch for everyone who is still standing.`,
    daysFromNow: 4,
    durationHours: 4,
    startHour: 8,
    tiers: [
      { name: 'Volunteer', priceCents: 0, quantity: 200 },
    ],
  },
  {
    slug: 'sunrise-yoga-waterfront',
    title: 'Sunrise Yoga at the Waterfront',
    organizer: 'pwani-sounds',
    venue: 'Mama Ngina Waterfront',
    category: 'COMMUNITY',
    summary:
      'An hour on the grass above the channel, starting in the dark and finishing in full sun.',
    description: `Every Saturday, 6am, on the lawn at Mama Ngina. All levels — the instruction is genuinely for beginners and the regulars have been coming for two years.

Bring a mat or a towel. There is nowhere to store bags, so travel light.`,
    daysFromNow: 3,
    durationHours: 2,
    startHour: 6,
    tiers: [
      { name: 'Drop-in', priceCents: 50000, quantity: 80 },
      { name: 'Month Pass', priceCents: 150000, quantity: 40, description: 'All four Saturdays this month.' },
    ],
  },
  {
    slug: 'carnivore-book-fair',
    title: 'Nairobi Book Fair',
    organizer: 'kilele-arts',
    venue: 'Carnivore Grounds',
    category: 'COMMUNITY',
    summary:
      'Sixty stalls of new and second-hand books, plus readings on the hour, every hour.',
    description: `Sixty stalls: publishers, independent sellers, and a large second-hand section that is worth arriving early for.

Readings run on the hour on the small stage. Entry covers the day and you can come and go.`,
    daysFromNow: 31,
    durationHours: 9,
    startHour: 9,
    tiers: tiers.market,
  },

  // ------------------------------------------------------------ past events
  // Seeded so a demo account has history, and so the "past events" states in
  // the organiser dashboard and the ticket wallet have something to render.
  {
    slug: 'rooftop-sessions-vol-8',
    title: 'Rooftop Sessions Vol. 8',
    organizer: 'sauti-collective',
    venue: 'The Alchemist',
    category: 'MUSIC',
    summary:
      'The one where the power went out for eleven minutes and the horn section carried on anyway.',
    description: `Vol. 8 sold out four days ahead. Five acts, one unplanned acoustic interlude, and a closing set that ran forty minutes over.`,
    daysFromNow: -22,
    durationHours: 8,
    startHour: 16,
    minAge: 21,
    tiers: tiers.clubNight,
  },
  {
    slug: 'nairobi-devs-monthly-february',
    title: 'Nairobi Devs Monthly — February',
    organizer: 'nairobi-devs',
    venue: 'iHub',
    category: 'TECH',
    summary:
      'Three talks on caching, an argument about monorepos, and pizza.',
    description: `February's meetup: HTTP caching from first principles, a postmortem on a migration that went sideways, and lightning talks.`,
    daysFromNow: -34,
    durationHours: 3,
    startHour: 18,
    tiers: tiers.meetup,
  },
];
