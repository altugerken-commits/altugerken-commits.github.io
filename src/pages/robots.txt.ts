import type { APIRoute } from 'astro';

// Generated, not static. The Sitemap line needs an ABSOLUTE url, so as a file in
// public/ it meant a second hardcoded copy of the site address — one that would
// silently rot the moment the domain changed and leave crawlers pointed at a
// sitemap that no longer exists. Derived here from `site` in astro.config.mjs,
// the same value canonical, OG and the sitemap itself are built from.
export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('`site` must be set in astro.config.mjs');

  // A template literal with real newlines rather than an array joined on an
  // escape — nothing here needs escaping, so nothing here can be mis-escaped.
  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
