/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b1020',
        panel: '#121a30',
        accent: '#4f8cff'
      },
      boxShadow: {
        glow: '0 0 40px rgba(79, 140, 255, 0.18)'
      }
    }
  },
  plugins: []
};
