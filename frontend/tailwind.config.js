/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          900: '#070a14',
          800: '#0f172a',
          700: '#1e293b',
          purple: '#6d5ef5',
          cyan: '#22d3ee'
        }
      }
    },
  },
  plugins: [],
}
