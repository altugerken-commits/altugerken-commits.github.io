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
      // Instrument Serif — SIL OFL, verified Turkish coverage, closest open face
      // to the Meditaterocket reference. Swap to provider: 'local' with the
      // .woff2 in src/assets/fonts/ once PP Editorial New is licensed.
      provider: fontProviders.google(),
      name: 'Instrument Serif',
      cssVariable: '--font-display',
      weights: [400],
      styles: ['normal'],
      // latin-ext is NON-NEGOTIABLE: g-breve, s-cedilla and dotted-I live in
      // Latin Extended-A, not in `latin`. Without it "Altuğ" renders the ğ in
      // Times New Roman mid-word.
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
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