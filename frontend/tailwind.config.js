/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        astro: {
          dark: '#0B0F19',
          card: '#131B2E',
          border: '#1E293B',
          muted: '#64748B',
          amber: '#F59E0B',
          gold: '#FBBF24',
          cyan: '#38BDF8',
          blue: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
