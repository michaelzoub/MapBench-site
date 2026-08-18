import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    sites(),
    cloudflare({
      viteEnvironment: { name: 'server' },
      config: {
        main: './worker/index.js',
        compatibility_date: '2026-08-18',
        assets: {
          directory: './dist/client',
          binding: 'ASSETS',
          not_found_handling: 'single-page-application',
        },
      },
    }),
  ],
});
