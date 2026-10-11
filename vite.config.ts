/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Link previews need absolute URLs. Set SITE_URL when building (Netlify's URL works too);
 * without it the page still works, just with a plain preview.
 */
function socialMeta(): Plugin {
  const site = (process.env.SITE_URL ?? process.env.URL)?.replace(/\/+$/, '')
  return {
    name: 'social-meta',
    transformIndexHtml() {
      if (!site) return []
      const meta = (property: string, content: string) => ({ tag: 'meta', attrs: { property, content }, injectTo: 'head' as const })
      return [
        meta('og:url', `${site}/`),
        meta('og:image', `${site}/og.png`),
        meta('og:image:width', '1200'),
        meta('og:image:height', '630'),
        meta('og:image:alt', 'A frog hopping across stepping stones labelled with words'),
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), socialMeta()],
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
