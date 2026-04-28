/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        critical: '#ef4444',
        high: '#eab308',
        medium: '#3b82f6',
      }
    },
  },
  plugins: [],
}
