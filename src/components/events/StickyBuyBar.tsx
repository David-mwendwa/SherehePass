'use client';

import { useEffect, useState } from 'react';

/**
 * The buy action, kept on screen on narrow viewports.
 *
 * At `lg` the ticket panel is a sticky sidebar and is always in view. Below it
 * the layout collapses to one column and the panel is last, after the
 * description, the when/where tiles, the map and the organiser — on a phone
 * that is several thousand pixels of scrolling before the page offers to sell
 * anything. Reordering the column would fix the distance but put a price list
 * above the paragraph explaining what the event is, which is the wrong way
 * round for someone still deciding.
 *
 * So the panel stays where it reads best and the action comes to the visitor,
 * then gets out of the way: once the real panel is on screen the bar hides,
 * rather than leaving two "Get tickets" buttons competing a thumb's width
 * apart.
 */
export function StickyBuyBar({
  priceLabel,
  soldOut,
}: {
  priceLabel: string | null;
  soldOut: boolean;
}) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const panel = document.getElementById('tickets');
    if (!panel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setPanelVisible(entry.isIntersecting);
        // The bar animates in, so it must not animate in over the panel on a
        // short page where the panel was already on screen at first paint.
        setReady(true);
      },
      // A sliver is enough: by the time the top of the panel has cleared the
      // bar's own height, the bar is redundant.
      { rootMargin: '0px 0px -88px 0px' }
    );

    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  if (!ready || panelVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up border-t border-white/[0.08] bg-dark-950/90 backdrop-blur-xl lg:hidden">
      <div className="container flex items-center gap-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0">
          <p className="eyebrow">{soldOut ? 'Sold out' : 'Tickets'}</p>
          <p className="truncate font-mono text-sm font-medium text-secondary-300">
            {soldOut ? '—' : (priceLabel ?? 'On sale')}
          </p>
        </div>

        {/*
          A plain anchor, not the Button component and not a router push. The
          target is an id on this page, so the browser's own fragment handling
          is exactly right — and `scroll-margin-top` is already set globally on
          every `[id]` to clear the sticky header, which a scripted scroll
          would have to reimplement.
        */}
        <a
          href="#tickets"
          className="ml-auto inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-secondary-300 px-6 text-sm font-semibold text-dark-950 transition-colors hover:bg-secondary-200 active:scale-[0.98]"
        >
          {soldOut ? 'See tiers' : 'Get tickets'}
        </a>
      </div>
    </div>
  );
}
