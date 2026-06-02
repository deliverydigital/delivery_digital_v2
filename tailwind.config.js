import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
        },
        secondary: {
          50: 'var(--secondary-50)',
          500: 'var(--secondary-500)',
          900: 'var(--secondary-900)',
        },
        accent: {
          500: 'var(--accent-500)',
        },
        success: {
          500: 'var(--success-500)',
        },
        warning: {
          500: 'var(--warning-500)',
        },
        error: {
          500: 'var(--error-500)',
        },
        // Tokens partages avec l'espace formation/agence (palette Pyemes).
        // On etend les couleurs Tailwind par defaut avec un DEFAULT pour que
        // bg-green / text-amber / text-cyan fonctionnent SANS perdre les shades.
        paper: '#FFFFFF',
        paper2: '#F5F5F7',
        ink: { 100: '#EAE5EE', 200: '#D8D2DF', 400: '#8C8597', 500: '#6B6378', 700: '#4F455F', 800: '#2D2D2D', 900: '#1F1F1F' },
        green: { ...colors.green, DEFAULT: '#1FB54E' },
        amber: { ...colors.amber, DEFAULT: '#F5A623' },
        cyan: { ...colors.cyan, DEFAULT: '#2BB7DE' },
      },
      letterSpacing: { tightest: '-0.025em' },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
  plugins: [],
};
