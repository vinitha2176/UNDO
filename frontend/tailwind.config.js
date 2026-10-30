/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAF9F6',
        surface: '#FFFFFF',
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        charcoal: {
          DEFAULT: '#1E2024',
          muted: '#525866',
          subtle: '#868C98',
        },
        accent: {
          teal: '#0D9488',
          amber: '#D97706',
          rose: '#E11D48',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
        floating: '0 8px 30px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

