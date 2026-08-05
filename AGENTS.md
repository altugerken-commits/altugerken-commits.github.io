## The site team

This project has a small custom subagent team in `.claude/agents/`, purpose-built for building this industrial designer's portfolio. Typical flow for a new page or feature:

1. **design-director** — decides layout, typography, color, and structure; writes a brief to `design/`.
2. **frontend-engineer** — implements the brief in Astro + Tailwind (components, pages, content collection schema).
3. **content-strategist** — turns raw project photos/notes into structured case-study content and writes the copy.
4. **qa-reviewer** — checks the real running site (responsive, accessible, performant, no console errors) before anything is called done.
5. **deploy-ops** — production builds, SEO/OG meta, sitemap, and actual deployment; always confirms before publishing live.

Invoke the relevant one directly by name for a task, or just describe the task and let it route to the right agent(s) in sequence (design → build → content → QA → ship).

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
