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
          // Workers Assets answers static requests without waking the worker.
          // The document has to go through it so worker/index.js can turn the
          // og:/twitter: URLs absolute — X drops cards with relative ones.
          run_worker_first: ['/', '/index.html'],
        },
      },
    }),
  ],
});
