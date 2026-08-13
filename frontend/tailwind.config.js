/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        line: '#00B900',
        'line-hover': '#009900',
        'hospital-green': '#00B900',
        'hospital-dark': '#008a00',
        'hospital-light': '#e6f8e6',
        hospital: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        }
      }
    },
  },
  plugins: [],
}
