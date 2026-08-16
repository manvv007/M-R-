/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Manrope',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        navy: {
          50:  '#F2F5FB',
          100: '#E2E8F5',
          200: '#C4CFE8',
          300: '#98A8D1',
          400: '#687EB6',
          500: '#455E9A',
          600: '#33487A',
          700: '#24355E',
          800: '#182646',
          900: '#0F1A34',
          950: '#0A1226',
        },
        ink: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50:  '#F8FAFC',
        },
        accent: {
          amber: '#B9770E',
          amberSoft: '#FFF7E0',
          red: '#B42318',
          redSoft: '#FEF3F2',
          green: '#067647',
          greenSoft: '#ECFDF3',
          blue: '#175CD3',
          blueSoft: '#EFF8FF',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.06)',
        'card-md': '0 4px 8px -2px rgba(15,23,42,.06), 0 2px 4px -2px rgba(15,23,42,.04)',
        'card-lg': '0 10px 15px -3px rgba(15,23,42,.08), 0 4px 6px -4px rgba(15,23,42,.04)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
}
