/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 柔和、平静的配色方案 — 像一本摊开的书（与桌面版一致）
        journal: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#ebe0d0',
          300: '#dcc8a8',
          400: '#c9a87c',
          500: '#b8905a',
          600: '#a67c4a',
          700: '#8a6340',
          800: '#705138',
          900: '#5c4330',
          950: '#332318',
        },
        calm: {
          50: '#f4f7f4',
          100: '#e2e8e0',
          200: '#c5d2c2',
          300: '#a1b49d',
          400: '#7d9478',
          500: '#60795c',
          600: '#4b6048',
          700: '#3c4d3a',
          800: '#323e30',
          900: '#2a3429',
          950: '#151c15',
        },
        warm: {
          50: '#fef9f0',
          100: '#fdefd9',
          200: '#fadcb2',
          300: '#f6c380',
          400: '#f0a44d',
          500: '#ec8a2a',
          600: '#dd711f',
          700: '#b7581c',
          800: '#92461e',
          900: '#763b1c',
          950: '#401d0c',
        },
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'sans-serif',
        ],
        serif: [
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          'Georgia',
          'serif',
        ],
      },
      borderRadius: {
        'book': '0.5rem',
      },
      spacing: {
        18: '4.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
