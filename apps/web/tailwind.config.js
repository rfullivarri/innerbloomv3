/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f172a',
          muted: '#111c33',
          elevated: '#182640',
          highlight: '#1f2f4d'
        },
        accent: {
          purple: '#8b5cf6',
          blue: '#38bdf8',
          amber: '#fbbf24',
          green: '#34d399'
        },
        text: {
          DEFAULT: '#f8fafc',
          muted: '#cbd5f5',
          subtle: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['"Manrope"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139, 92, 246, 0.08), 0 16px 40px -20px rgba(56, 189, 248, 0.45)'
      },
      zIndex: {
        modal: '9999'
      },
      borderRadius: {
        xl: '1.25rem'
      }
    }
  },
  plugins: []
};

export default config;
