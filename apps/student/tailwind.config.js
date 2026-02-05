/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFE066',
        'primary-light': '#FFF3B8',
        'primary-dark': '#E6C200',
      },
    },
  },
  plugins: [],
}
