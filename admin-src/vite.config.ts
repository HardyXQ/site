import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Injects the runtime-config script (served from the site root, shared with the
 * public site) into <head>. In local dev the file 404s and the app falls back
 * to Vite env vars from .env.
 */
function injectRuntimeConfig(): Plugin {
  return {
    name: 'wavesign-inject-runtime-config',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        '    <script src="/public-config.js"></script>\n  </head>',
      );
    },
  };
}

// The admin SPA is served from https://<site>/admin/ (GitHub Pages, same repo).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/admin/',
  plugins: [react(), injectRuntimeConfig()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../admin', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
