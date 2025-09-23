/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: '#FC79C1',
        'dark-grey': '#473C75',
        'mid-grey': '#908AAD',
        'garden-grey': '#E4EBF2',
        'light-grey': '#E3E0EB',
        'error-red': '#FF005C',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'overlay-out 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
