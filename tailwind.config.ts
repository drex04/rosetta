import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [animate, typography],
  theme: {
    extend: {
      fontFamily: {
        // Sets Inter as the default sans font
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        // Sets your preferred Mono font
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      fontSize: {
        // Optional: Tweak line-heights for a tighter UI feel
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
      },
    },
  },
} satisfies Config;
