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
        border: 'var(--orbit-border)',
        background: 'var(--orbit-background)',
        foreground: 'var(--orbit-foreground)',
        card: {
          DEFAULT: 'var(--orbit-card)',
          foreground: 'var(--orbit-card-foreground)',
        },
        primary: {
          DEFAULT: 'var(--orbit-primary)',
          foreground: 'var(--orbit-primary-foreground)',
        },
        muted: {
          DEFAULT: 'color-mix(in oklch, var(--orbit-card) 75%, var(--orbit-background))',
          foreground: 'var(--orbit-muted-foreground)',
        },
        sidebar: {
          border: 'var(--orbit-border)',
        },
        orbit: {
          background: 'var(--orbit-background)',
          foreground: 'var(--orbit-foreground)',
          card: 'var(--orbit-card)',
          primary: 'var(--orbit-primary)',
          'primary-foreground': 'var(--orbit-primary-foreground)',
          muted: 'var(--orbit-muted-foreground)',
          border: 'var(--orbit-border)',
        },
        obsidian: {
          950: 'oklch(0.06 0.01 260)',
          900: 'var(--orbit-background)',
          850: 'oklch(0.1 0.012 260)',
          800: 'var(--orbit-card)',
          750: 'var(--color-obsidian-elevated)',
          700: 'oklch(0.2 0.02 260)',
          600: 'oklch(0.28 0.025 260)',
          border: 'var(--orbit-border)',
        },
        solar: {
          gold: 'var(--orbit-primary)',
          amber: 'oklch(0.72 0.12 55)',
          light: 'oklch(0.85 0.12 80)',
          muted: 'oklch(0.55 0.1 55)',
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
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
