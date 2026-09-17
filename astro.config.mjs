// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Base.astro was already hard-coding this as the canonical fallback. Declaring
  // it here makes Astro.site real, so canonical/OG URLs resolve from config
  // instead of a literal, and a sitemap integration has something to build from.
  // The live address. This is a GitHub Pages USER site
  // (repo altugerken-commits.github.io), which serves from the domain root —
  // so no `base` is needed and every absolute path in the build stays valid.
  // A project repo would have served from /<repo>/ and required base to match,
  // which is the usual way a Pages deploy ends up with no CSS.
  //
  // altugerken.com is not registered yet. When it is, change this one line and
  // add the CNAME; canonical, OG and the sitemap all derive from it.
  site: 'https://altugerken-commits.github.io',

  // Honour the PORT assigned by the harness so multiple sessions can run
  // this project side by side without fighting over 4321.
  server: {
    port: Number(process.env.PORT) || 4321,
  },

  fonts: [
    {
      // Geist — the grotesk the Soft Structuralism direction runs on, and one
      // of the two faces both taste skills name explicitly. It replaces
      // Cormorant Garamond, which belonged to an editorial direction that no
      // longer exists: a high-contrast Garamond at display weight fights the
      // machined geometry of the products rather than framing it.
      //
      // A variable range in one file. Geist ships as a true variable font on
      // Google Fonts, so 300..700 is a single download covering the whole
      // scale — Cormorant needed discrete instances because it does not.
      provider: fontProviders.google(),
      name: 'Geist',
      cssVariable: '--font-sans',
      weights: ['300 700'],
      styles: ['normal'],
      // latin-ext is NON-NEGOTIABLE: g-breve, s-cedilla and dotted-I live in
      // Latin Extended-A, not in `latin`. Without it "Altuğ" and "Özyeğin"
      // render the ğ in a fallback face mid-word. Verified against the Google
      // Fonts CSS before the swap: Geist serves latin-ext covering
      // U+0100–02BA, and ğ is U+011F.
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      optimizedFallbacks: true,
    },
    {
      // Geist Mono carries the spec-sheet voice: labels, dimensions, counts.
      // Same superfamily as the display face, so the two share proportions and
      // the metadata reads as part of the drawing rather than as a foreign
      // annotation — which is what JetBrains Mono did next to a Garamond.
      provider: fontProviders.google(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      weights: ['400 500'],
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

  // sitemap reads `site` above, so it stays correct through a domain change.
  integrations: [react(), sitemap()]
});