/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        'uno-red': '#ED1C24',
        'uno-blue': '#0055A4',
        'uno-green': '#009A44',
        'uno-yellow': '#FFD600',
        'uno-black': '#1A1A2E',
        'uno-dark': '#16213E',
        'uno-surface': '#1E2A47',
        'uno-accent': '#E94560',
      },
      fontFamily: {
        game: ['Fredoka', 'Poppins', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card': '0 4px 15px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.4)',
        'glow': '0 0 20px rgba(233,69,96,0.4)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(233,69,96,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(233,69,96,0.6)' },
        },
      },
    },
  },
  plugins: [],
}
