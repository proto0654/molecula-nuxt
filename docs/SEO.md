# SEO & accessibility

Headless SEO layer for the Nuxt app: document titles, meta descriptions, Open Graph / Twitter, canonical URLs, static `robots.txt` + `sitemap.xml`, HTML entity decoding from WP, and baseline a11y landmarks.

## SEO composable

[`app/composables/usePageSeo.ts`](../app/composables/usePageSeo.ts) — single entry for pages:

- **Title:** `{page title} — WebLaba` on inner routes; home uses a **full** document title (no suffix).
- **Description:** per-page computed or constant; slug pages use WP excerpt with fallback.
- **OG / Twitter:** `ogTitle`, `ogDescription`, `ogUrl`, `ogLocale`, `ogSiteName`, optional `ogImage` (featured / about photo).
- **Canonical:** `link rel="canonical"` from `runtimeConfig.public.siteUrl` + `app.baseURL` + route path (pagination keeps `?page=N` when `N > 1`).
- **`deferTitle`:** slug pages skip title until WP data resolves (avoids flashing «Молекула»).

Env:

| Variable | Role |
|----------|------|
| `NUXT_PUBLIC_SITE_URL` | Absolute origin for canonical, OG URL, sitemap (default `https://weblaba.ru`; GitHub Pages: `https://proto0654.github.io/molecula-nuxt`) |
| `NUXT_APP_BASE_URL` | Path prefix (Pages: `/molecula-nuxt/`) |

Global favicon / apple-touch: `public/sign-weblaba.svg` + `public/sign-weblaba.png` via `nuxt.config.ts` `app.head.link` (not per-page).

## Homepage copy

[`app/domain/seo/homeSeo.ts`](../app/domain/seo/homeSeo.ts) — title + description synced from production [weblaba.ru](https://weblaba.ru/) Yoast meta (not from WP REST). Used in [`app/pages/index.vue`](../app/pages/index.vue) and the visually hidden `.home-page__seo` block for crawlers / screen readers.

## Plain text from WP HTML

[`app/domain/wp/htmlPlain.ts`](../app/domain/wp/htmlPlain.ts):

- `htmlToPlainText` — strip tags, decode `&#171;` / `&amp;` / named entities, collapse whitespace.
- `demoteCmsH1` — CMS `h1` → `h2` so page `SiteScrambleTitle` stays the only document `h1`.

Used by `stripTags`, `stripHtmlToPlain`, archive rows, DetailNav labels, SEO titles.

## Static discovery files

[`lib/seo-static.ts`](../lib/seo-static.ts) + [`nuxt.config.ts`](../nuxt.config.ts) `nitro:build:public-assets` hook writes:

- `/robots.txt` — `Allow: /`, `Sitemap: {siteUrl}/sitemap.xml`
- `/sitemap.xml` — all prerender routes (static pages + portfolio/service slugs from WP)

Route list is the same set queued in the `nitro:config` hook.

## Heading outline

| Route | Document `h1` | Section headings |
|-------|---------------|------------------|
| `/` | Hidden SEO block (`HOME_SEO_TITLE`) | — |
| Archives / about / contact / service detail | `SiteScrambleTitle` | `h2` section titles, offer/skill `h3` |
| Case detail | `CaseHeader` → ScrambleTitle | `CaseSectionMarker` → `h2`; CMS prose demoted |

## Accessibility (baseline)

- [`app/layouts/default.vue`](../app/layouts/default.vue): skip link → `<main id="main">`; `inert` on main while `is-awaiting-pose` off-home.
- [`app/lib/a11y/focusTrap.ts`](../app/lib/a11y/focusTrap.ts): focus trap + `setPageInert` for mobile nav overlay and case lightbox.
- Canvas: `role="img"` + Russian `aria-label` on `#hero-canvas` ([`mountHeroApp.ts`](../app/lib/hero/mountHeroApp.ts)).
- `:focus-visible` rings in [`main.css`](../app/assets/css/main.css); RU labels on pagination / detail nav / lightbox.

Not in scope yet: JSON-LD, Yoast fields from WP, contrast token audit, keyboard navigation into the 3D molecule.

## Gotchas

- Set **`NUXT_PUBLIC_SITE_URL`** on GitHub Pages deploy so canonical/sitemap URLs match the preview host (see [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)).
- Home tab title is the full `HOME_SEO_TITLE` string — intentionally longer than brand-only «WebLaba».
- Scramble animation paint layers stay `aria-hidden`; stable name is in `aria-label` (same pattern as USP headline after this pass).
