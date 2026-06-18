/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#173404',
          800: '#1F4A08',
          700: '#27500A',
          600: '#3B6D11',
          500: '#639922',
          400: '#97C459',
          100: '#C0DD97',
          50:  '#EAF3DE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
