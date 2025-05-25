/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF6E5',
        charcoal: '#2A2A2A',
        'accent-orange': '#FE734C',
        'accent-teal': '#00C29A',
        'accent-mustard': '#D4A33B',
        'accent-red': '#DE4A3D',
      },
      fontFamily: {
        logo: ['"Press Start 2P"', 'monospace'],
        body: ['Inter', 'sans-serif'],
        data: ['"JetBrains Mono"', 'monospace'],
      },
      borderWidth: {
        DEFAULT: '1px',
        0: '0',
        1: '1px',
        2: '2px',
        3: '3px',
        4: '4px',
      },
      borderRadius: {
        none: '0',
        btn: '3px',
      },
      boxShadow: {
        none: 'none',
      },
      keyframes: {
        pulse_danger: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'pulse-danger': 'pulse_danger 1.2s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
      },
    },
  },
  plugins: [],
};