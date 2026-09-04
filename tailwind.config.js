/** @type {import('tailwindcss').Config} */
// Workspace-standard Tailwind config (v3 JS-config system), with SherehePass's
// own palette. Components always reference the semantic names — `primary`,
// `secondary`, `dark` — never the raw hex, so the identity can be retuned here
// without touching a component.
export default {
  darkMode: ['class'],
  // Tailwind only emits a class it can find in these files. Miss an extension
  // and the stylesheet comes out empty with no error anywhere — which is what
  // happened when this project moved to TypeScript and this glob still said
  // `{js,jsx}`. The build passed, the types passed, and every page rendered
  // unstyled.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // A named type scale, each step carrying its own leading, tracking and
      // weight — the three things that have to move together as type gets
      // bigger and were previously restated at every heading.
      //
      // The sizes are `clamp()` rather than `text-3xl sm:text-4xl lg:text-5xl`,
      // so one class covers every width. That is not only shorter: breakpoint
      // chains meant the same heading was a different size on two pages because
      // one of them had picked up an extra `lg:` step, and type that resizes
      // continuously has no awkward width just below a breakpoint.
      fontSize: {
        // The home hero, and nothing else.
        display: [
          'clamp(2.75rem, 5.5vw + 1rem, 4.5rem)',
          { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '800' },
        ],
        // Secondary heroes — an event title over its cover, the seller pitch.
        // A step down from `display` so the home page stays the loudest thing
        // in the product.
        'display-sm': [
          'clamp(2.25rem, 3.2vw + 1.1rem, 3.5rem)',
          { lineHeight: '1.06', letterSpacing: '-0.03em', fontWeight: '800' },
        ],
        // Page title — the <h1> of an ordinary route.
        title: [
          'clamp(2rem, 2.5vw + 1.1rem, 2.75rem)',
          { lineHeight: '1.08', letterSpacing: '-0.028em', fontWeight: '700' },
        ],
        // Section <h2>.
        section: [
          'clamp(1.5rem, 1.6vw + 1rem, 1.875rem)',
          { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        // Card and panel <h3>.
        subhead: [
          '1.0625rem',
          { lineHeight: '1.4', letterSpacing: '-0.011em', fontWeight: '600' },
        ],
        // Standfirst under a title. Larger and looser than body copy.
        lead: ['1.0625rem', { lineHeight: '1.65', letterSpacing: '-0.006em' }],
      },
      colors: {
        // Shocking pink. The brand colour and the loudest thing on screen, so
        // it is rationed: glows, the logo, the active state, and nothing else.
        primary: {
          50: '#FFF0F9',
          100: '#FFE0F3',
          200: '#FFC2E8',
          300: '#FF94D6',
          400: '#FF57BE',
          500: '#FF1FA3',
          600: '#ED0086',
          700: '#C4006D',
          800: '#A10059',
          900: '#85084D',
          950: '#52002E',
        },
        // Chartreuse. Reserved for money and for the one action that completes
        // a task — a price, a "Get tickets", a paid badge. If it is lime, it is
        // either a number you pay or a button you press.
        secondary: {
          50: '#F6FFE0',
          100: '#EBFFBD',
          200: '#D8FF80',
          300: '#C4FF42',
          400: '#B0F519',
          500: '#93DB00',
          600: '#71AF00',
          700: '#558400',
          800: '#446800',
          900: '#3A5808',
          950: '#1D2F00',
        },
        // Near-black with a faint violet cast, so the pink sits on it as a
        // glow rather than a sticker. `950` is the page canvas.
        dark: {
          50: '#F5F5F7',
          100: '#E7E7EC',
          200: '#CFCFD8',
          300: '#ABABBA',
          400: '#808095',
          500: '#64647A',
          600: '#4F4F62',
          700: '#414150',
          800: '#2A2A35',
          850: '#1C1C24',
          900: '#14141A',
          950: '#0B0B0F',
        },
        // Status colours, for the organiser dashboard and the check-in scanner
        // only. Public pages stay on primary + secondary.
        success: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
        },
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'card-hover':
          '0 20px 40px -12px rgba(0, 0, 0, 0.6), 0 8px 16px -8px rgba(0, 0, 0, 0.4)',
        glow: '0 0 0 1px rgba(255, 31, 163, 0.25), 0 8px 40px -8px rgba(255, 31, 163, 0.35)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        float: 'float 4s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
