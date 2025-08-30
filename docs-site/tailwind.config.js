/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--text-primary)',
        border: 'var(--border-color)',
        primary: {
          DEFAULT: 'var(--primary-color)',
          foreground: 'white',
        },
        secondary: {
          DEFAULT: 'var(--secondary-color)',
          foreground: 'var(--text-secondary)',
        },
        muted: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text-secondary)',
        },
      },
    },
  },
  plugins: [],
}

