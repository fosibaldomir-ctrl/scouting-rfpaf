/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rfpaf: {
          red: '#c0392b',
          'red-dark': '#96281b',
          blue: '#1a3a6b',
          'blue-light': '#2e4d8f',
        },
      },
    },
  },
  plugins: [],
}
