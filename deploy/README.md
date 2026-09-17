# Deployment

The site is live at <https://altugerken-commits.github.io/>, served by GitHub
Pages from the `gh-pages` branch.

## Right now: manual

```bash
npm run deploy
```

Builds, writes `.nojekyll`, and force-pushes `dist/` to `gh-pages`. Pages
rebuilds within about a minute.

## Switching to automatic

`github-pages.workflow.yml` in this folder is a complete, working GitHub Actions
workflow. It is **not** at `.github/workflows/deploy.yml`, where it would
actually run, for one reason: the `gh` CLI token used to create this repo
carries `gist, read:org, repo` but not `workflow`, and GitHub refuses to let an
OAuth app push any file under `.github/workflows/`. Every push was rejected
outright, so it is parked here instead of being lost.

To turn it on:

```bash
gh auth refresh -s workflow
mkdir -p .github/workflows
git mv deploy/github-pages.workflow.yml .github/workflows/deploy.yml
git commit -m "ci: enable Pages workflow"
git push
```

From then on every push to `main` builds and deploys, and `npm run deploy`
becomes redundant.

## Custom domain

`altugerken.com` is not registered. When it is:

1. Change `site` in `astro.config.mjs` to the new origin — canonical, OG and the
   sitemap all derive from that one line.
2. Add a `CNAME` file containing the bare domain to `public/`.
3. Point the DNS `A`/`ALIAS` records at GitHub Pages.

## Two traps, written down because they cost time

**`.nojekyll` is not optional.** Pages runs Jekyll by default, and Jekyll
excludes every path beginning with an underscore — which is exactly where Astro
puts its CSS, JS and fonts (`_astro/`). Without that file the site ships with no
styles at all. `npm run deploy` writes it every time.

**Pages auto-enables itself on a `<user>.github.io` repo, from the default
branch.** So `main` — the Astro *source* — got picked up and run through Jekyll,
and the live URL served a generic Jekyll page. Changing the source to
`gh-pages` does not trigger a rebuild on its own; it needs an explicit build
request (`gh api -X POST repos/OWNER/REPO/pages/builds`) or a fresh push to the
branch.
