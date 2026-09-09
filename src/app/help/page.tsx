export const metadata = {
  alternates: { canonical: '/help' },
  title: 'How it works',
  description: 'Buying, holding and using a ticket on SherehePass.',
};

const SECTIONS = [
  {
    heading: 'Buying a ticket',
    body: [
      'Pick your tier and quantity on the event page, then check out. The price you see is the price you pay — there is no booking fee added at the last step, and VAT is already in the number.',
      'Your tickets are held from the moment you press pay, not from the moment payment lands. If the payment then fails, they go straight back on sale.',
    ],
  },
  {
    heading: 'Paying with M-Pesa',
    body: [
      'Choose M-Pesa and enter the number you have on you. A prompt appears on that phone; enter your PIN and the order confirms itself. You do not need to copy a reference anywhere.',
      'If the prompt does not arrive, or you dismiss it, the order fails after a moment and nothing is charged. Start again from the event page.',
    ],
  },
  {
    heading: 'Getting in',
    body: [
      'Every ticket has its own QR code, one per person admitted. Open My tickets, show the code, and it is scanned at the gate.',
      'A code works exactly once. If someone scans a screenshot of your ticket before you arrive, yours will be refused — so do not share the image.',
    ],
  },
  {
    heading: 'Refunds',
    body: [
      'If an organiser cancels, everyone who paid is refunded to the M-Pesa number or card they used. You do not need to ask.',
      'Tickets are otherwise non-refundable, because the organiser has already committed to a venue and a line-up on the strength of them.',
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container max-w-2xl py-12 sm:py-16">
      <h1 className="font-heading text-title">How it works</h1>
      <p className="mt-3 text-dark-400">
        Short version: pick, pay, show the code.
      </p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-section">{section.heading}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph, index) => (
                <p key={index} className="leading-relaxed text-dark-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-14 rounded-xl border border-white/[0.07] bg-dark-900/60 px-5 py-4 text-sm text-dark-400">
        SherehePass is a portfolio project. Payments run in a simulator: no
        money moves, and no card or M-Pesa credentials are ever collected.
      </p>
    </div>
  );
}
