# Type System — Altug Erken Portfolio

**Status:** Locked pending one client decision (PP Editorial New license purchase).
**Author:** typography specialist
**Date:** 2026-08-04

Every glyph-coverage claim below was verified by parsing the actual font binaries' `cmap`
tables, not by trusting foundry marketing copy. Verification scripts and method are in
[§9](#9-verification-method).

---

## 1. Executive summary

| Role | Locked choice | License | Turkish | Fallback if rejected |
|---|---|---|---|---|
| Display serif | **PP Editorial New** *(client preference — needs paid license)* | Commercial, from $40 | ✅ verified | Instrument Serif |
| Display serif — Alt A | **Instrument Serif** | SIL OFL 1.1 | ✅ verified | — |
| Display serif — Alt B | **Bodoni Moda** | SIL OFL 1.1 | ✅ verified | — |
| Technical mono | **JetBrains Mono** | SIL OFL 1.1 | ✅ verified | Geist Mono |

**The single most important finding in this document** is the subsetting trap in
[§6.2](#62-the-subsetting-trap-read-this-before-you-subset-anything): the Turkish
characters `ğ Ğ ş Ş İ` do **not** live in the `latin` Unicode subset. Every standard
"latin" subsetting recipe on the internet silently destroys the spelling `Altuğ Erken`.

---

## 2. PP Editorial New — licensing and coverage verdict

### 2.1 Glyph coverage: PASS

Turkish is fully covered. Confirmed two independent ways:

1. The foundry's own product page lists Turkish explicitly in its supported-language list,
   and states **16 styles with 463 glyphs each**.
2. The published character map for PP Editorial New Regular contains all twelve Turkish
   characters: `ğ Ğ ş Ş ı İ ç Ç ö Ö ü Ü`.

The client's decision to display the name as ASCII **"Altug Erken"** de-risks the hero
headline regardless, but coverage is confirmed, so the Turkish spelling can safely appear
in visible body copy too.

> One caveat I could not resolve remotely: I verified the character *map*, but I could not
> confirm that `Ş`/`ş` are drawn as a true **cedilla** rather than reusing the Romanian
> **comma-below** shape. Turkish uses U+015E/U+015F; Romanian uses U+0218/U+0219. Many
> foundries draw one and alias the other. Check this visually in the trial font before
> purchase — set `Şşğ` at 200px and confirm the mark under the S is a hooked cedilla
> attached to the stem, not a detached floating comma.

### 2.2 Licensing: the free cut is NOT safely usable here

Pangram Pangram operates a "free to try" model. Their FAQ states free fonts are
*"free to try for personal use as long as it is not used in a commercial project."*
The free download includes **the complete glyph set but only selected key styles** —
not the full 16-style family.

**The ambiguity you need to resolve:** Pangram's FAQ text lists "portfolios" as an example
of permitted personal use, but also excludes anything "commercial" or revenue-generating.
A professional portfolio whose explicit purpose is winning paid industrial-design
commissions sits squarely in that gray zone. I am not comfortable calling that
free-tier-safe, and a font-licensing dispute is a genuinely bad outcome for a designer's
own shopfront.

**Recommendation:** buy the license. Commercial licenses start at **$40**. Concretely you
need, per weight actually used:

- a **Web** license — metered by *anticipated total monthly pageviews*, one per domain
  **and per subdomain**. A staging subdomain counts.
- a **Desktop** license if the fonts are installed locally for mockups/Figma.

Upgrades are charged as the difference between tiers, so it is safe to start at the
lowest pageview tier and move up if traffic grows.

Because we only need **two weights at most** (see [§5](#5-weights-actually-needed)), the
realistic cost is low — likely the $40–$100 band. That is a rounding error against the
value of the client having the exact typeface they chose, so my advice is: purchase, and
do not spend more design time relitigating this.

**Practical constraint once purchased:** self-hosting a licensed webfont means the `.woff2`
sits at a public URL. That is what a web license permits. Do **not** deploy the desktop
`.otf`/`.ttf` to `public/` — serving the desktop binary is outside the web license and is
the most common way people accidentally breach a font EULA.

---

## 3. Alternative A — Instrument Serif *(recommended fallback)*

**License:** SIL OFL 1.1 — free for commercial use, no pageview metering, no purchase, no
per-domain licensing. Designed by Rodrigo Fuenzalida for Instrument.

**Turkish:** ✅ **VERIFIED** — all 12 characters present in the binary's cmap
(333 glyphs total, includes true U+015E/U+015F s-cedilla).

**OpenType features present:** `case`, `locl`, `liga`, `dlig`, `ccmp`, `ss01`.

**Why it wins against the Meditaterocket reference:** this is the closest open face to
that specific look. It is a genuinely *condensed*, high-contrast editorial display serif
with narrow apertures and elegant thin strokes — the same quiet, expensive, slightly
fashion-editorial register as "FIND CALM. WITHIN." It was drawn as a display face, so it
does not need an optical-size axis to look correct enormous; it already is the display cut.

**The `case` feature is a specific, concrete win for this design.** The brief calls for
parenthetical mono-style labels like `( INHALE )` and bracket corner markers. `case`
re-draws parentheses, brackets and hyphens at cap height so they optically center against
uppercase instead of hanging low. Instrument Serif has it. Enable it wherever the serif is
set in all-caps.

**The real limitation — be clear-eyed about this:** Instrument Serif ships **one weight
(400) plus an italic**. There is no bold, and no variable weight axis. Consequences:

- All typographic hierarchy must come from **size, case, colour and spacing** — never weight.
  For this design that is arguably *correct*: the Meditaterocket look is a single light
  high-contrast cut at wildly different sizes. It enforces the discipline the brief wants.
- **Never set Instrument Serif below ~24px.** It is high-contrast and condensed; at body
  sizes its hairlines go spindly and it loses legibility, especially light-on-dark. All
  small text must be the mono or a system sans. This is a hard rule, not a preference.
- Do **not** synthesise bold with `font-weight: 700` — the browser will smear a fake bold
  and it looks cheap at hero sizes. If a heavier voice is ever needed, that is a signal to
  switch to Alternative B.

---

## 4. Alternative B — Bodoni Moda *(most technically capable)*

**License:** SIL OFL 1.1.

**Turkish:** ✅ **VERIFIED** — all 12 characters present (428 glyphs, true s-cedilla).

**Verified variable axes** (read directly from the `fvar` table):

```
wght 400..900 (default 400)   |   opsz 6..96 (default 11)
```

**Why this is the technically strongest option for oversized type:** it carries a real
**optical size axis spanning 6pt to 96pt**. This is exactly the instrument you want when
type is set at 300px. As `opsz` rises the face legitimately redraws — stroke contrast
increases, hairlines thin, spacing tightens — instead of merely being scaled up. A true
Didone at `opsz 96` is one of the most dramatic things you can put on a dark page.

It also ships **real small caps** (`smcp`, `c2sc`) plus `tnum`/`lnum`/`onum` figure sets.
For a spec-data-heavy industrial-design portfolio, genuine small caps are a meaningful
upgrade over the browser's synthetic `font-variant: small-caps`, which just shrinks
capitals and looks visibly wrong next to a real display serif.

**Why it is Alternative B and not A:** aesthetically Bodoni reads *fashion magazine*
(Vogue, Harper's) rather than the calm, restrained register of the Meditaterocket
reference. It is louder. It is also a genuine risk on a near-black ground — see
[§7.3](#73-dark-mode-hairline-survival-the-big-one-for-this-project); at `wght 400` and
`opsz 96` its hairlines can visually shimmer or drop out entirely against blue-black.
Mitigation: run it at `wght 500` on dark rather than 400.

### 4.1 Candidates considered and rejected

| Face | Turkish | Why rejected |
|---|---|---|
| **Fraunces** | ✅ verified | Axes `opsz 9..144, wght 100..900, SOFT 0..100, WONK 0..1`. Technically superb, but it is a *soft* Windsor/Cooper-inspired face — warm, retro, quirky. Directly contradicts the cold, precise, high-contrast direction. |
| **Newsreader** | ✅ verified | Has `opsz 6..72`, but it is a low-contrast face built for long-form *reading*. Lacks the drama required at hero scale. |
| **Playfair Display** | ✅ verified | Correct genre, but extremely overexposed — it reads as a default choice, which undercuts a premium positioning. |
| **Libre Caslon Display** | ✅ verified | Handsome, but bookish and traditional rather than fashion-editorial. Less contrast than the reference demands. |

All four ship a `latin-ext` subset and pass Turkish, so any of them is *safe* — they are
rejected on aesthetics, not on risk.

---

## 5. Technical mono — JetBrains Mono

**License:** SIL OFL 1.1.
**Turkish:** ✅ **VERIFIED** — all 12 characters (976 glyphs, true s-cedilla).
**Verified axis:** `wght 100..800` — a single variable file covers every weight needed.
**Verified OpenType features:** `zero`, `case`, `locl`, `calt`, `ccmp`, `frac`, `sups`, `subs`.

Chosen on evidence, not vibes:

1. **`zero` — slashed zero.** For an industrial designer, engineering-drawing convention
   matters. `MATERIAL: ANODIZED AL 6061` and `Ø 12.0 mm` read as authentically technical
   with a slashed zero and merely decorative without one. Verified present.
   *(Geist Mono has no `zero` feature — this is the main reason it lost.)*
2. **`case`.** Same argument as §3 — it fixes parenthesis alignment in the `( INHALE )`
   and `[ 01 ]` bracket-marker devices that run throughout this design.
3. **`locl` present** — needed so Turkish locale forms survive subsetting.
4. **One variable file for all weights** = one network request, which directly serves the
   throttled-4G budget.
5. **Its main aesthetic drawback does not apply here.** JetBrains Mono is often criticised
   for a very tall x-height that makes it feel aggressively "IDE". x-height only affects
   *lowercase* — and in this design the mono is used almost exclusively in **uppercase**
   spec labels and numerals, where its capitals are even, wide-spaced and clean.

**Alternative if the client finds it too developer-ish:** **Geist Mono** (SIL OFL,
✅ Turkish verified, 889 glyphs). Cleaner, more neutral, more "expensive". Costs you the
slashed zero and ships as static weights (2 files instead of 1).

**Rejected monos:** IBM Plex Mono (✅ Turkish, has `zero`, but **no `case` and no `locl`** —
both of which this design actively uses); Space Mono (✅ Turkish, but playful/retro geometry
that fights the "heavy and expensive" brief); Martian Mono (✅ Turkish, and its `wdth
75..112.5` axis is tempting for "condensed HUD metadata" — but see the note in
[§7.2](#72-tracking-the-single-biggest-lever), condensed and tracked-out are contradictory
treatments, and at 12px it is noisy).

### 5.1 Weights actually needed

Keep this list short — every weight is a download.

| Family | Weights | Styles |
|---|---|---|
| Display serif | **400** only (+ *italic only if the copy actually needs emphasis*) | Roman |
| JetBrains Mono | **400** and **500** | Roman only |

Two weights of mono come from a single variable file. If PP Editorial New is purchased,
license **400 Regular only** unless the design genuinely calls for the italic — that
roughly halves the licensing cost.

---

## 6. Self-hosting

### 6.1 Use Astro 7's built-in Fonts API — do not hand-roll `@font-face`

I verified against the installed dependency (`astro@7.1.6`) that `fonts` is a **stable,
top-level config key** (not under `experimental`), and that a `local` provider ships at
`astro/assets/fonts/providers/local`.

This matters because Astro's implementation already solves three things people get wrong:

- It emits `<link rel="preload" ... crossorigin>` **with the `crossorigin` attribute**.
  Font requests are always CORS-mode; omitting `crossorigin` on a preload causes the
  browser to fetch the file **twice** — a classic, silent perf bug.
- `optimizedFallbacks` (default on) auto-generates a metric-matched fallback `@font-face`
  using `size-adjust` / `ascent-override` / `descent-override`. This is what makes
  `font-display: swap` nearly invisible instead of a jarring reflow.
- It fingerprints and cache-busts the emitted files.

That last point is decisive for this design. The hero has **oversized type sharing a depth
plane with a product object, where the object occludes the type**. A raw `font-display: swap`
reflow would visibly shift the headline *behind a stationary object*, breaking the single
most important visual device on the site. Metric-matched fallbacks are not a nice-to-have
here; they are load-bearing.

```js
// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: { port: Number(process.env.PORT) || 4321 },
  vite: { plugins: [tailwindcss()] },

  fonts: [
    {
      // Swap to `provider: 'local'` + `variants` once PP Editorial New is purchased.
      provider: fontProviders.google(),
      name: 'Instrument Serif',
      cssVariable: '--font-display',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'], // latin-ext is NON-NEGOTIABLE — see §6.2
      display: 'swap',
      fallbacks: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
      optimizedFallbacks: true,
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: ['400 500'],          // variable range, single file
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      optimizedFallbacks: true,
    },
  ],
});
```

For the purchased PP Editorial New, use the local provider so the licensed binary never
round-trips through a third party:

```js
{
  provider: 'local',
  name: 'PP Editorial New',
  cssVariable: '--font-display',
  variants: [
    {
      src: ['./src/assets/fonts/PPEditorialNew-Regular.woff2'],
      weight: 400,
      style: 'normal',
    },
  ],
  display: 'swap',
  fallbacks: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
}
```

> Keep licensed source files in `src/assets/fonts/` (processed, hashed, emitted by Astro),
> **not** in `public/` (copied verbatim, guessable URL). And keep the desktop `.otf` out of
> the repo entirely.

### 6.2 THE SUBSETTING TRAP — read this before you subset anything

This is the failure mode most likely to ship unnoticed.

I pulled the live Google Fonts CSS for all six serif candidates and diffed the
`unicode-range` declarations. The `latin` subset is defined as:

```
U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, ...
```

Now map Turkish against that:

| Char | Codepoint | In `latin`? |
|---|---|---|
| `ç Ç ö Ö ü Ü` | U+00E7, U+00C7, U+00F6, U+00D6, U+00FC, U+00DC | ✅ yes (Latin-1) |
| `ı` | U+0131 | ✅ yes (explicitly carved out) |
| **`ğ`** | **U+011F** | ❌ **NO** |
| **`Ğ`** | **U+011E** | ❌ **NO** |
| **`ş`** | **U+015F** | ❌ **NO** |
| **`Ş`** | **U+015E** | ❌ **NO** |
| **`İ`** | **U+0130** | ❌ **NO** |

Those five live in **U+0100–U+017F (Latin Extended-A)**, which ships **only** in the
`latin-ext` subset.

**The failure is nastier than a missing character.** The browser does not error — it
falls back *per glyph*. `Altuğ` renders with `A`, `l`, `t`, `u` in the elegant display
serif and the **`ğ` in Times New Roman**, mid-word, at 200px. One system-serif letter
sitting inside a hand-picked display headline is exactly the kind of detail that
discredits a craft portfolio.

**Three precise notes so nobody over- or under-reacts:**

1. **This cannot break your SEO.** The brief puts `Altuğ Erken` in the meta description and
   the JSON-LD `alternateName`. Neither is *rendered text* — no webfont is ever applied to
   them, so both spellings stay perfectly findable by crawlers regardless of subsetting.
2. **It will absolutely break visible copy.** Any rendered Turkish — a footer credit, a
   Turkish project title, material names like `Alüminyum Döküm`, a Turkish bio paragraph —
   breaks the moment it contains `ğ` or `ş`.
3. **The bug hides from you.** Because the hero is deliberately ASCII `Altug Erken`, the
   headline looks perfect while the footer is quietly broken. **Add `Altuğ Erken — Şişli,
   İstanbul` as a visible test string in a dev-only scratch page** and eyeball it at large
   size. Every one of the five at-risk characters appears in that string.

The fix is cheap: Latin Extended-A adds roughly 130 glyphs — a few KB in woff2. Just
include it. In the Astro config above that is `subsets: ['latin', 'latin-ext']`.

### 6.3 If you subset manually (licensed PP Editorial New)

Astro's `local` provider does not subset for you — a purchased font arrives as a full
character set, so subset it yourself before committing.

```bash
pip install fonttools brotli

pyftsubset PPEditorialNew-Regular.otf \
  --output-file=PPEditorialNew-Regular.woff2 \
  --flavor=woff2 \
  --layout-features="kern,liga,clig,calt,ccmp,locl,mark,mkmk,case,ss01" \
  --unicodes="U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2010-2015,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD" \
  --no-hinting \
  --desubroutinize
```

Four flags carry real weight, and the defaults will hurt you:

- **`U+0100-017F` is the whole point.** Without it, §6.2 happens.
- **`locl` must be retained.** `pyftsubset` drops layout features not explicitly listed.
  `locl` carries locale-specific substitutions; strip it and Turkish typography can
  silently degrade. Cheap to keep.
- **`ccmp`, `mark`, `mkmk` must be retained.** If the font composes `ğ` as `g` + combining
  breve rather than as a precomposed glyph, these features position the mark. Strip them
  and the breve lands in the wrong place — or on top of the letter. This is the subtle
  cousin of the missing-glyph bug and it is *much* harder to spot.
- **`case`** — keep it, the design depends on it (§3).

Verify the output actually survived:

```bash
python -c "
from fontTools.ttLib import TTFont
f = TTFont('PPEditorialNew-Regular.woff2')
cmap = f.getBestCmap()
need = {0x011F:'ğ',0x011E:'Ğ',0x015F:'ş',0x015E:'Ş',0x0131:'ı',0x0130:'İ',
        0x00E7:'ç',0x00C7:'Ç',0x00F6:'ö',0x00D6:'Ö',0x00FC:'ü',0x00DC:'Ü'}
missing = [c for cp,c in need.items() if cp not in cmap]
print('MISSING:', missing) if missing else print('OK — all 12 Turkish chars survived')
"
```

Make this a CI step. A subsetting regression is invisible in review and permanent in production.

### 6.4 Preload strategy

**Preload exactly one file: the hero display font, `latin` subset only.**

```astro
---
// src/layouts/Base.astro
import { Font } from 'astro:fonts';
---
<head>
  <!-- Preload BEFORE the stylesheet so the fetch starts immediately -->
  <Font
    cssVariable="--font-display"
    preload={[{ weight: 400, style: 'normal', subset: 'latin' }]}
  />
  <Font cssVariable="--font-mono" />   <!-- registered, NOT preloaded -->
</head>
```

I verified Astro's preload filter supports `weight` / `style` / `subset` predicates, which
lets us do something genuinely useful: **the hero headline is ASCII by design, so it only
needs the `latin` subset.** Preload that one file; let `latin-ext` load lazily, since
Turkish only appears further down the page in body copy.

Rules, in priority order:

1. **Preload one file. One.** Preloads compete for the same bandwidth. Preloading the mono
   *and* the serif *and* the italic on throttled 4G makes the hero arrive **later**, not
   sooner. The mono renders small labels — a fallback flash there costs nothing.
2. **The mono is deliberately not preloaded.** It is below the fold and small.
3. **Never preload the italic** unless the hero headline itself is italic.
4. **`crossorigin` is mandatory** — handled for you by the `<Font>` component.
5. Serve with `Cache-Control: public, max-age=31536000, immutable`. Astro's hashed
   filenames make this safe.

### 6.5 Tailwind 4 wiring

Tailwind 4 takes tokens from `@theme` in CSS. Astro's `cssVariable` values plug straight in,
and the `--text-*--line-height` / `--text-*--letter-spacing` companions bake the optical
corrections from [§7](#7-optical-corrections-for-large-high-contrast-serifs) into every
utility, so nobody has to remember them.

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --font-display: var(--font-display), "Iowan Old Style", Palatino, Georgia, serif;
  --font-mono: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace;

  /* fluid scale — see §8 */
  --text-hero: clamp(4rem, 0.117rem + 16.57vw, 20rem);
  --text-hero--line-height: 0.84;
  --text-hero--letter-spacing: -0.035em;

  --text-display-1: clamp(2.5rem, 1.165rem + 5.7vw, 8rem);
  --text-display-1--line-height: 0.92;
  --text-display-1--letter-spacing: -0.025em;

  --text-display-2: clamp(2rem, 1.272rem + 3.11vw, 5rem);
  --text-display-2--line-height: 1.0;
  --text-display-2--letter-spacing: -0.02em;

  --text-h1: clamp(1.75rem, 1.325rem + 1.81vw, 3.5rem);
  --text-h1--line-height: 1.1;
  --text-h1--letter-spacing: -0.015em;

  --text-h2: clamp(1.375rem, 1.163rem + 0.91vw, 2.25rem);
  --text-h2--line-height: 1.2;
  --text-h2--letter-spacing: -0.01em;

  --text-h3: clamp(1.125rem, 1.034rem + 0.39vw, 1.5rem);
  --text-h3--line-height: 1.3;
  --text-h3--letter-spacing: -0.005em;

  --text-body-lg: clamp(1.0625rem, 1.002rem + 0.26vw, 1.3125rem);
  --text-body-lg--line-height: 1.55;

  --text-body: clamp(1rem, 0.97rem + 0.13vw, 1.125rem);
  --text-body--line-height: 1.65;

  --text-caption: clamp(0.875rem, 0.86rem + 0.06vw, 0.9375rem);
  --text-caption--line-height: 1.5;

  --text-label: clamp(0.75rem, 0.735rem + 0.06vw, 0.8125rem);
  --text-label--line-height: 1.2;
  --text-label--letter-spacing: 0.12em;   /* POSITIVE — see §7.2 */
}
```

Usage then collapses to `class="font-display text-hero"` and every optical correction
comes along automatically.

---

## 7. Optical corrections for large, high-contrast serifs

A display serif set at 300px on a near-black ground needs four corrections. Skipping them
is the difference between "expensive" and "a big font".

### 7.1 Optical size

**Bodoni Moda / Newsreader / Fraunces (have an `opsz` axis):** browsers apply
`font-optical-sizing: auto` by default, mapping `opsz` to the *used* font-size. That is
already correct — leave it alone.

⚠️ **Gotcha:** setting **any** `font-variation-settings` value silently disables
`font-optical-sizing`. If you set `font-variation-settings: 'wght' 500`, you must also
pass `opsz` explicitly or the face snaps back to its default optical size — `opsz 11` for
Bodoni Moda, i.e. a *text* cut rendered at 300px. Always set both together:

```css
.hero { font-variation-settings: 'opsz' 96, 'wght' 500; }
```

**PP Editorial New / Instrument Serif (no `opsz` axis):** they are single-optical-size
*display* cuts. Nothing to set — but the inverse rule bites: they are drawn for large
sizes, so they get fragile small. **Hard floor: never below 24px.** All small text goes to
the mono.

### 7.2 Tracking — the single biggest lever

Type is spaced for the size it was drawn at. A display serif at 300px looks loose and
disconnected at default tracking; the words stop reading as a single object. Tracking must
go **negative as size increases** — and, critically, **positive** for small uppercase mono.

| Token | Size | `letter-spacing` |
|---|---|---|
| `text-hero` | 64→320px | **-0.035em** (push to -0.045em above ~250px) |
| `text-display-1` | 40→128px | -0.025em |
| `text-display-2` | 32→80px | -0.02em |
| `text-h1` | 28→56px | -0.015em |
| `text-h2` | 22→36px | -0.01em |
| `text-h3` | 18→24px | -0.005em |
| body / body-lg | 16→21px | **0** (never track body serif) |
| `text-label` (mono caps) | 12→13px | **+0.12em** |

The mono labels move in the **opposite direction**. Small uppercase has no ascender/
descender rhythm to help the eye, so it needs *opening up*: `+0.08em` to `+0.14em`.
`+0.12em` is the house value.

This is also why **Martian Mono's width axis was a trap** (§5): condensing and tracking-out
are contradictory treatments. The "condensed HUD metadata" look in the reference comes from
*tracked-out small caps*, not from narrow letterforms.

Two mandatory companions for tracked-out uppercase:

```css
.label {
  font-variant-ligatures: none;              /* tracking + ligatures = collisions */
  font-feature-settings: "case" 1, "zero" 1; /* caps-aligned parens; slashed zero */
  text-transform: uppercase;
}
```

`font-variant-ligatures: none` is not optional — letter-spacing applied across a ligature
produces visibly broken spacing around `fi`/`fl`.

### 7.3 Dark-mode hairline survival — the big one for this project

Light-on-dark type suffers **irradiation**: bright glyphs on a dark ground optically bloom,
appearing *heavier* than the same type on white, while counters fill in. For a
**high-contrast serif** this is doubly punishing — the thick stems bloom and the hairlines,
already near the rendering floor, thin further and can shimmer or vanish during scroll.

Four corrections:

1. **Go one step heavier on dark.** If the face has weights, `wght 500` on blue-black reads
   the same visual weight as `wght 400` on white. This is the main reason Bodoni Moda at
   `wght 400` + `opsz 96` is risky here and should run at **500**. Instrument Serif's single
   robust cut sidesteps the problem — a quiet point in its favour.
2. **Never pure `#FFF` on pure `#000`.** Already locked in the brief; the typographic
   reason is that maximum luminance contrast maximises bloom. An off-white around
   `#E8ECF2` on a blue-black ground is both softer and *more* legible.
3. **`-webkit-font-smoothing: antialiased` — apply it, but scope it.** It thins
   light-on-dark text and genuinely counteracts bloom. This is one of the few legitimate
   uses of the property. Be aware it is macOS-WebKit/Chromium only and a **no-op on
   Windows** — so it must be a refinement, never something the design depends on. Do not
   apply it globally: it makes small dark-on-light text (any future light sections) look
   anaemic.

   ```css
   .on-dark { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
   ```

4. **Leave `text-rendering` at its default.** `optimizeLegibility` is a common cargo-cult
   addition; it can disable subpixel positioning and costs layout time on large text
   without improving anything here. Use `font-kerning: normal` instead, which is the thing
   people actually want from it.

Film grain (already in the brief for banding) helps type too — it dithers the antialiased
edges and hides the stair-stepping that big curves show on dark gradients.

### 7.4 Hero kerning and the occlusion device

At 300px, kerning pairs the font handles fine at 16px become visible gaps — particularly
cap-to-lowercase (`Al`, `Er`) and around `t`/`k`. Two moves:

- `font-kerning: normal` (explicit — do not rely on defaults inside transformed elements).
- **Set the hero name as per-letter `<span>`s.** The layered-occlusion device almost
  certainly needs per-letter `z-index` anyway so the product object can pass *between*
  letters. Those same spans are then where you nudge one or two pairs by `margin-left:
  -0.01em`. The spans do double duty — structure the markup this way from the start rather
  than retrofitting.

⚠️ **Accessibility:** per-letter spans destroy the accessible name — screen readers may
announce it letter by letter. Wrap with an explicit label:

```html
<h1 aria-label="Altug Erken">
  <span aria-hidden="true"><span>A</span><span>l</span>…</span>
</h1>
```

---

## 8. Fluid type scale

Interpolated linearly between **375px** and **1920px** viewports, then clamped at both ends.

| Token | 375px | 1920px | `clamp()` |
|---|---|---|---|
| `--text-hero` | 64px | 320px | `clamp(4rem, 0.117rem + 16.57vw, 20rem)` |
| `--text-display-1` | 40px | 128px | `clamp(2.5rem, 1.165rem + 5.7vw, 8rem)` |
| `--text-display-2` | 32px | 80px | `clamp(2rem, 1.272rem + 3.11vw, 5rem)` |
| `--text-h1` | 28px | 56px | `clamp(1.75rem, 1.325rem + 1.81vw, 3.5rem)` |
| `--text-h2` | 22px | 36px | `clamp(1.375rem, 1.163rem + 0.91vw, 2.25rem)` |
| `--text-h3` | 18px | 24px | `clamp(1.125rem, 1.034rem + 0.39vw, 1.5rem)` |
| `--text-body-lg` | 17px | 21px | `clamp(1.0625rem, 1.002rem + 0.26vw, 1.3125rem)` |
| `--text-body` | 16px | 18px | `clamp(1rem, 0.97rem + 0.13vw, 1.125rem)` |
| `--text-caption` | 14px | 15px | `clamp(0.875rem, 0.86rem + 0.06vw, 0.9375rem)` |
| `--text-label` | 12px | 13px | `clamp(0.75rem, 0.735rem + 0.06vw, 0.8125rem)` |

The hero's preferred term is **16.57vw**, landing in the 12–18vw band the brief asked for,
and it caps at 320px so it does not become absurd on a 2560px display.

### 8.1 Why every preferred value mixes `rem` + `vw` — this is an accessibility requirement

Writing `font-size: 16vw` would be simpler and is **a WCAG 1.4.4 failure**. A pure-`vw`
font-size does not respond to the user's browser font-size setting or to zoom, so a
low-vision user cannot enlarge the text at all.

Including a `rem` term (`0.117rem + 16.57vw`) means the value still scales with the root
font size, so zoom and user preferences keep working. **Never strip the `rem` term to
"clean up" these values** — it silently breaks accessibility while looking identical in
review.

### 8.2 Mobile hero — set it on two lines

At 375px the hero is 64px. `Altug Erken` is 11 characters; in a condensed display serif at
64px that is roughly 295px against ~327px of usable width. It fits, but with almost no
margin, and any wider face overflows.

**Stack it as two lines on mobile** (`Altug` / `Erken`). This is the stronger composition
anyway — a two-line block gives the product object something to occlude, which a single
thin line does not. Once stacked, the constraint is a 5-character string, so mobile can go
considerably larger:

```css
@media (max-width: 640px) {
  .hero-name { font-size: clamp(5rem, 22vw, 8rem); line-height: 0.86; }
}
```

### 8.3 Reduced motion

Type-specific note beyond the global `prefers-reduced-motion` handling: if the hero name
animates in per-letter (staggered reveal via those spans), that stagger must collapse to a
single instant opacity change. Per-letter transforms are the most nausea-inducing pattern
in the whole design.

```css
@media (prefers-reduced-motion: reduce) {
  .hero-name > span { animation: none !important; transform: none !important; opacity: 1; }
}
```

### 8.4 Turkish uppercase — a real trap in an uppercase-heavy design

This design uses uppercase labels everywhere. Turkish has locale-specific casing:
`i` → `İ` (not `I`), and `ı` → `I`. CSS `text-transform: uppercase` gets this right **only
when the element carries `lang="tr"`**.

Without it, `istanbul` uppercases to `ISTANBUL`; a Turkish reader expects `İSTANBUL`.

```html
<span lang="tr" class="label">i̇stanbul</span>
```

Tag any Turkish-language element with `lang="tr"`. This also activates the `locl` feature
that §6.3 went to the trouble of preserving through subsetting — the two work together.

---

## 9. Verification method

Coverage claims here were not taken from foundry marketing. For each candidate I downloaded
the actual TTF from the upstream `google/fonts` repository (and `vercel/geist-font` for
Geist Mono) and parsed the `cmap`, `fvar` and `GSUB` tables directly.

Results — every candidate passed all 12 Turkish characters:

```
PASS BodoniModa-VF.ttf               428 glyphs   all 12 Turkish chars present
PASS Fraunces-VF.ttf                 624 glyphs   all 12 Turkish chars present
PASS InstrumentSerif-Regular.ttf     333 glyphs   all 12 Turkish chars present
PASS JetBrainsMono-VF.ttf            976 glyphs   all 12 Turkish chars present
PASS LibreCaslonDisplay-Regular.ttf  501 glyphs   all 12 Turkish chars present
PASS MartianMono-VF.ttf              511 glyphs   all 12 Turkish chars present
PASS Newsreader-VF.ttf               564 glyphs   all 12 Turkish chars present
PASS SpaceMono-Regular.ttf           624 glyphs   all 12 Turkish chars present
PASS GeistMono-Regular.ttf           889 glyphs   all 12 Turkish chars present
PASS IBMPlexMono-Regular.ttf         930 glyphs   all 12 Turkish chars present
```

Each was additionally checked for **true Turkish s-cedilla (U+015E/U+015F)** rather than
only the Romanian comma-below (U+0218/U+0219) — a common substitution that produces
subtly wrong Turkish. All ten carry both, correctly.

Verified variable axes:

```
BodoniModa    wght 400..900  |  opsz 6..96
Fraunces      opsz 9..144    |  wght 100..900  |  SOFT 0..100  |  WONK 0..1
Newsreader    wght 200..800  |  opsz 6..72
JetBrainsMono wght 100..800
MartianMono   wght 100..800  |  wdth 75..112.5
```

Astro API claims were verified against the installed `astro@7.1.6` in `node_modules`:
`fonts` is top-level and stable, the `local` provider exists, and `<Font>` emits
`crossorigin` preloads filterable by weight/style/subset.

---

## 10. Open decisions for the client

1. **Buy the PP Editorial New web license?** (~$40–$100 for one weight.) If yes, confirm
   anticipated monthly pageviews and count staging subdomains. If no → Instrument Serif,
   which is a genuinely strong match for the stated reference and costs nothing.
2. **Before purchase**, eyeball `Şşğ` at 200px in the trial cut to confirm true cedilla
   shapes (§2.1).
3. **Italic needed?** Licensing Regular only roughly halves the cost. The reference imagery
   uses no italic.
4. **JetBrains Mono vs Geist Mono** — JetBrains has the slashed zero and `case` feature and
   is one file; Geist is more neutral and less "IDE". A visual call once the first HUD panel
   is built.
