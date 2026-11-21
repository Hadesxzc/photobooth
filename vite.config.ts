import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Link-preview images need an absolute URL. Set SITE_URL yourself (e.g. a custom domain),
 * or let Vercel's built-in production URL fill it in.
 */
function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : '';
}

function siteUrlPlugin(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl()),
  };
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  server: { host: true },
});
