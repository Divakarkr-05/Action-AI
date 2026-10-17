/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand palette ──────────────────────────────
        graphite: {
          950: '#0a0b0c',
          900: '#0f1011',
          850: '#131518',
          800: '#18191d',
          700: '#1e2025',
          600: '#252830',
          500: '#2d3039',
        },
        lime: {
          400: '#b8ff00',
          300: '#c8ff40',
          200: '#d8ff80',
        },
        teal: {
          400: '#00ffc8',
          300: '#40ffd8',
        },
        // ── Semantic ───────────────────────────────────
        surface: '#13151a',
        border: 'rgba(255,255,255,0.08)',
        'border-accent': 'rgba(184,255,0,0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-fine': `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-fine': '24px 24px',
      },
      boxShadow: {
        'glow-lime': '0 0 24px rgba(184,255,0,0.15)',
        'glow-lime-sm': '0 0 12px rgba(184,255,0,0.1)',
        'glow-teal': '0 0 24px rgba(0,255,200,0.15)',
        'inner-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.35s ease-out forwards',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
