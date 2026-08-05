// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Base.astro was already hard-coding this as the canonical fallback. Declaring
  // it here makes Astro.site real, so canonical/OG URLs resolve from config
  // instead of a literal, and a sitemap integration has something to build from.
  site: 'https://altugerken.com',

  // Honour the PORT assigned by the harness so multiple sessions can run
  // this project side by side without fighting over 4321.
  server: {
    port: Number(process.env.PORT) || 4321,
  },

  fonts: [
    {
      // Space Grotesk — the structural display face. Grotesk skeleton with cut
      // terminals and a squared bowl: it holds up at the enormous sizes a
      // typographic mask needs, where a humanist face turns to mush.
      //
      // Clash Display was the alternative you named. It is Fontshare, not
      // Google, so it needs a licence and local .woff2 files rather than a
      // provider — say the word and I will switch this entry to
      // provider: 'local' with the files in src/assets/fonts/.
      provider: fontProviders.google(),
      name: 'Space Grotesk',
      cssVariable: '--font-display',
      weights: ['300 700'], // variable range, single file
      styles: ['normal'],
      // latin-ext is NON-NEGOTIABLE: g-breve, s-cedilla and dotted-I live in
      // Latin Extended-A, not in `latin`. Without it "Altuğ" renders the ğ in
      // a fallback face mid-word.
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['Arial Narrow', 'Helvetica Neue', 'sans-serif'],
      optimizedFallbacks: true,
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: ['400 500'], // variable range, single file
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      optimizedFallbacks: true,
    },
  ],

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        // Installed agent skills live in the repo but are not source.
        // Watching them throws EBUSY on Windows and kills the dev server.
        ignored: ['**/.agents/**', '**/.claude/skills/**'],
      },
    },
  },

  integrations: [react()]
});