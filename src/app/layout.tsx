import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/ui/Toaster';
import { getCurrentUser } from '@/lib/auth';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE_URL } from '@/lib/seo';

import './globals.css';

/**
 * Fonts are loaded through `next/font/google`, which downloads them at build
 * time and serves them from this origin. Nothing is fetched from Google at
 * runtime: no third-party request on first paint, no layout shift while a
 * webfont swaps in, and no visitor's IP handed to another party for the
 * privilege of a typeface.
 */
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['600', '700', '800'],
});

// One definition, shared with the sitemap, robots and every JSON-LD graph.
// Two copies of "what is this site's URL" is the same drift trap as two copies
// of the page title: both look right in isolation and disagree in production.
const siteUrl = SITE_URL;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SherehePass: live events in Kenya',
    // Every page sets only its own name; the suffix is applied here so it
    // cannot drift between routes.
    template: '%s · SherehePass',
  },
  description:
    'Find concerts, festivals, tech meetups and match days across Kenya, and buy the ticket in the same breath. Pay with M-Pesa or card, and walk in with a QR code on your phone.',
  keywords: [
    'events Kenya',
    'concert tickets Nairobi',
    'buy tickets M-Pesa',
    'festivals Kenya',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: siteUrl,
    siteName: 'SherehePass',
    title: 'SherehePass: live events in Kenya',
    description:
      'Find concerts, festivals, tech meetups and match days across Kenya, and buy the ticket in the same breath.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SherehePass: live events in Kenya',
    description:
      'Find concerts, festivals, tech meetups and match days across Kenya, and buy the ticket in the same breath.',
  },
};

export const viewport = {
  themeColor: '#0B0B0F',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Read once here and pass down, rather than letting the header fetch its own
  // user: React's `cache` would dedupe the query anyway, but threading it
  // through keeps the header a plain component that renders what it is given.
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      // Next warns about `scroll-behavior: smooth` on <html> because it also
      // animates route transitions, which looks like a stall. This attribute
      // says the smooth scroll is deliberate for in-page anchors and lets Next
      // jump instantly on navigation.
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}
    >
      <body className="min-h-dvh">
        {/* First thing in the tab order, visible only once focused. A keyboard
            visitor should not have to walk the whole nav on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader user={user} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
