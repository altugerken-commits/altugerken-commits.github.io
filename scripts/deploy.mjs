// Manual deploy to GitHub Pages.
//
// This exists because CI could not be wired: the gh CLI token carries
// `gist, read:org, repo` but NOT `workflow`, and GitHub refuses to let an OAuth
// app push a file under .github/workflows/ without it. The workflow is written
// and waiting at .github/workflows/deploy.yml — run
//
//   gh auth refresh -s workflow
//
// then commit and push that file, and this script becomes redundant.
//
// Until then: build, then force-push dist/ to the gh-pages branch as an
// orphan history. Orphan on purpose — the built output is a snapshot, not a
// lineage, and keeping every past build would grow the repo without ever being
// read.
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
const capture = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8' }).trim();

const sha = capture('git', ['rev-parse', '--short', 'HEAD']);
const url = capture('git', ['remote', 'get-url', 'origin']);
const name = capture('git', ['config', 'user.name']);
const email = capture('git', ['config', 'user.email']);

console.log(`\nbuilding ${sha} ...`);
rmSync('dist', { recursive: true, force: true });
// Astro is invoked directly with this Node binary, not through npm. That
// sidesteps two Windows problems at once: since the CVE-2024-27980 fix Node
// refuses to spawn a .cmd without shell: true (EINVAL), and passing an argument
// array WITH a shell concatenates rather than escapes it (DEP0190), which also
// breaks on any path containing a space. Spawning node on a .mjs needs neither.
run(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build']);

// WITHOUT THIS THE SITE SHIPS WITH NO STYLES. Pages runs Jekyll by default, and
// Jekyll excludes every path beginning with an underscore — which is exactly
// where Astro puts its CSS, JS and fonts (_astro/).
writeFileSync('dist/.nojekyll', '');

console.log('\npushing to gh-pages ...');
const git = (...args) => run('git', ['-C', 'dist', ...args]);
rmSync('dist/.git', { recursive: true, force: true });
git('init', '-q');
git('config', 'user.name', name);
git('config', 'user.email', email);
git('checkout', '-q', '-b', 'gh-pages');
git('add', '-A');
git('commit', '-q', '-m', `deploy: build of ${sha}`);
git('push', '-qf', url, 'gh-pages');

console.log('\ndone -> https://altugerken-commits.github.io/');
console.log('Pages rebuilds within about a minute.');
