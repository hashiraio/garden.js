/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'garden-grey': '#E4EBF2',
      },
    },
  },
  plugins: [],
};
export default config;
