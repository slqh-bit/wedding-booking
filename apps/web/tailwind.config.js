/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Body: Cairo. Display/headings: Amiri (Arabic) + Playfair (Latin).
        sans: ['Cairo', 'system-ui', 'sans-serif'],
        display: ['"Amiri"', '"Playfair Display"', 'Cairo', 'serif'],
      },
      colors: {
        // Brand from the flier: champagne gold + blush rose on ivory.
        gold: {
          50: '#FBF6EA',
          100: '#F5EAcf',
          200: '#EBD9A6',
          300: '#E5C76B',
          400: '#D9B24A',
          500: '#C9A227',
          600: '#A9861D',
          700: '#856717',
          800: '#5F4A11',
          900: '#3D2F0B',
        },
        blush: {
          50: '#FDF6F5',
          100: '#FBEAEA',
          200: '#F6D9DA',
          300: '#EFC2C4',
          400: '#E9B8BE',
          500: '#DA98A0',
          600: '#C2777F',
          700: '#9E5A62',
          800: '#78434A',
          900: '#4E2C30',
        },
        ivory: {
          50: '#FEFCF9',
          100: '#FBF6F0',
          200: '#F5ECE0',
        },
      },
      boxShadow: {
        gold: '0 20px 45px -18px rgba(169, 134, 29, 0.45)',
        soft: '0 12px 30px -12px rgba(120, 67, 74, 0.18)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #E5C76B 0%, #C9A227 55%, #A9861D 100%)',
        'ivory-radial': 'radial-gradient(1200px 600px at 50% -10%, #FBEAEA 0%, #FBF6F0 45%, #FEFCF9 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease both',
        float: 'float 6s ease-in-out infinite',
        'pop-in': 'pop-in 0.3s ease both',
      },
    },
  },
  // Category theme classes are chosen from data at runtime — keep them in the build.
  safelist: [
    { pattern: /^(from|to)-(rose|amber|sky|indigo|pink|orange|violet|purple|emerald|teal|red|yellow|green|lime|cyan|slate|gray)-(50|100|200)$/ },
    { pattern: /^bg-(rose|amber|sky|pink|orange|violet|emerald|green|cyan|slate)-(50|100)$/ },
    { pattern: /^text-(rose|amber|sky|pink|orange|violet|emerald|green|cyan|slate)-700$/ },
  ],
  plugins: [],
};
