/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF8F8',
          100: '#E8F6F7',
          200: '#E0F4F5',
          300: '#B2E2E4',
          400: '#80CDD1',
          500: '#67BEC3', // Primary TechShare
          600: '#4CA6AC', // Primary Hover
          700: '#378B91',
          800: '#286E74', // Primary Dark
          900: '#1F565B',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};

