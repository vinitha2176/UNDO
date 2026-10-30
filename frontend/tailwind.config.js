/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAF9F6', // warm ivory
        surface: '#FFFFFF',
        border: {
          subtle: '#E9E7EF',
          DEFAULT: '#E9E7EF',
        },
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6', // primary accent: lavender-purple
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
        },
        mint: {
          50: '#F0FDF8',
          100: '#E6F9F2',
          200: '#C2F3E1',
          DEFAULT: '#A7E8CE', // soft mint secondary accent
          600: '#059669',
          700: '#047857',
          dark: '#0D6E4B',
        },
        peach: {
          50: '#FFF7F2',
          100: '#FFF0E6',
          200: '#FFE1CF',
          DEFAULT: '#FFD8C2', // pastel peach supporting accent
          600: '#EA580C',
          700: '#C2410C',
          dark: '#9A3412',
        },
        charcoal: {
          DEFAULT: '#20212B', // deep charcoal primary text
          muted: '#525866',
          subtle: '#71717A', // slate-gray muted text
        },
        accent: {
          teal: '#0D9488',
          amber: '#D97706',
          rose: '#E11D48',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(32, 33, 43, 0.03), 0 4px 14px rgba(32, 33, 43, 0.04)',
        'card-hover': '0 4px 12px rgba(139, 92, 246, 0.08), 0 12px 28px rgba(32, 33, 43, 0.07)',
        floating: '0 12px 36px rgba(32, 33, 43, 0.12)',
        glow: '0 0 24px rgba(139, 92, 246, 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

