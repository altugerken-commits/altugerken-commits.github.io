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
      // Cormorant Garamond — the elegant display face. A Garamond revival with
      // high stroke contrast, small counters and long, delicate serifs: it
      // reads as chic and slightly naive at large sizes, which is the opposite
      // of the Space Grotesk it replaces (that was chosen for a brutalist
      // typographic mask that no longer exists).
      //
      // Static weights rather than a variable range: Cormorant Garamond ships
      // as discrete instances on Google Fonts, and asking for a range silently
      // falls back to a single weight.
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display',
      weights: ['300', '400', '500', '600'],
      styles: ['normal', 'italic'],
      // latin-ext is NON-NEGOTIABLE: g-breve, s-cedilla and dotted-I live in
      // Latin Extended-A, not in `latin`. Without it "Altuğ" renders the ğ in
      // a fallback face mid-word.
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
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