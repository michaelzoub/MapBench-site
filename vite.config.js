import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * The document keeps root-relative og:/twitter: URLs so it stays deployable
 * anywhere, and each host binds them to its own origin: worker/index.js does it
 * per request on Cloudflare, and this does it at build time on Vercel, which
 * puts the production domain in the environment. Crawlers — X in particular —
 * drop cards whose card URLs are relative.
 */
const absoluteCardUrls = () => ({
  name: 'absolute-card-urls',
  apply: 'build',
  transformIndexHtml: (html) => {
    const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    return domain ? html.replaceAll('content="/', `content="https://${domain}/`) : html;
  },
});

export default defineConfig({
  plugins: [
    react(),
    sites(),
    absoluteCardUrls(),
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
