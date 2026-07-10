import type { Config } from 'tailwindcss';

// Tokens de diseño centralizados (Principio VIII). Los componentes consumen estos tokens;
// no se usan valores mágicos ni arbitrary values sin justificación.
const config: Config = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1d4ed8',
          fg: '#ffffff',
          muted: '#e0e7ff',
        },
        danger: '#dc2626',
        surface: '#f8fafc',
      },
      spacing: {
        field: '0.75rem',
      },
      borderRadius: {
        control: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
