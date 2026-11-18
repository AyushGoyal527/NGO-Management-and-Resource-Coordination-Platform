/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { sun: { 400: '#f6b93b', 500: '#f2a900', 700: '#8a5a00' }, ink: '#12271f', brand: { 50: '#effaf6', 100: '#d7f3e8', 500: '#1f9d74', 600: '#17805f', 700: '#136650', 900: '#0f3d31' } },
      fontFamily: { display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'], sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
