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
      },
    },
  },
  plugins: [],
};
export default config;
