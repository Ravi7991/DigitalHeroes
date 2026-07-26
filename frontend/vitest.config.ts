import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    server: {
      deps: {
        inline: [
          '@csstools/css-calc',
          '@csstools/css-color-parser',
          '@csstools/color-helpers',
          '@csstools/css-tokenizer',
          '@csstools/css-parser-algorithms',
          '@asamuzakjp/css-color',
          'entities',
        ],
      },
    },
  },
});
