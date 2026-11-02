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
        obsidian: {
          950: '#06080d',
          900: '#090d14',
          850: '#0d121c',
          800: '#121824',
          750: '#171f2f',
          700: '#1d273b',
          600: '#2a3750',
          border: '#1f293d',
        },
        solar: {
          gold: '#f59e0b',
          amber: '#d97706',
          light: '#fbbf24',
          muted: '#92400e',
        },
        astro: {
          cyan: '#38bdf8',
          silver: '#94a3b8',
          muted: '#64748b',
          border: '#1e293b',
        }
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
        '2xl': '12px',
      }
    },
  },
  plugins: [],
}
