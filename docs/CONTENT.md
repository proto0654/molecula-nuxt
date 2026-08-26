# Content pipeline (WordPress → Nuxt)

Headless consumption of production WordPress REST. WP remains source of truth; the Nuxt app never invents CMS data.

## Flow

```
pages / composables
  → app/api/*          (ofetch; no REST URLs in components)
  → app/domain/*       (normalize raw → Case / NavigationMenu)
  → app/types/wp/*     (raw + domain types)
  → components/archive/*  (editorial listing)
  → components/case/*     (conditional blocks)
```

Live response notes: [`api-real-response.md`](api-real-response.md).

## API layer (`app/api/`)

| Module | Role |
|--------|------|
| `client.ts` | `wpFetch` / `wpFetchPaginated` + `X-WP-Total` / `X-WP-TotalPages` |
| `portfolio.ts` | list page, posts by ids, case by slug, categories, slim index, slugs |
| `menus.ts` | `menus/v1` only (core `/wp/v2/menus` is 401) |
| `pages.ts` / `media.ts` | thin wrappers |

Base URL: `runtimeConfig.public.wpApiBase` (`NUXT_PUBLIC_WP_API_BASE`). Build/prerender falls back to env via `getWpApiBaseFromEnv()`.

## Normalization

[`normalizePortfolioPost`](../app/domain/portfolio/normalizePortfolio.ts) maps `WpPortfolioPost` → `Case`.

Rules:

- Absence stays `null` / `[]` — never placeholder objects that break `v-if`
- ACF media/repeater `false` → `null` / `[]`
- Empty text `""` → `null`
- Image `sizes`: string URL keys only (no invented WebP)
- Prev/next: slim index sorted `menu_order ASC`, then `date DESC` ([`getCasePosition`](../app/domain/portfolio/adjacent.ts)) — not archive-page array index. Slim `_fields` include `title` for footer labels.
- Archive listing uses the same slim sort, then `include` + `orderby=include` for the current page. Row numbers are 1-based positions in that index.

## Routes

| Route | Source |
|-------|--------|
| `/` | Molecular hero (`ClientOnly` → `MolecularHero`) |
| `/portfolio` | `usePortfolio(page)` — slim-index pagination (`include` ids), editorial rows |
| `/portfolio/[slug]` | `CaseShell` + video hero + featured backdrop + Overview / Interface (`landing_screen`+repeater) / Mobile / Slices / NEXT |

Hero: video only (flat). Interface = `landing_screen` (index 0) + repeater — desktop always 3 flex cols via `balanceCaseScreenColumns` (first screen pinned in col0; taller stacks prefer earlier cols, then equalize); &lt;1024: 2-col CSS masonry. Section numbers sequential among visible blocks (`getCaseComposition`, including NEXT).

Mobile field mapping: slices from `screen-mobile` (`block_ratio` defaults to `1/2.3`); composite mockup from `screenshot_image` whenever set (can coexist with slices). Filled media is never discarded.

SEO: `useSeoMeta` title + plain excerpt on case pages.

Presentation helpers: [`app/domain/portfolio/presentation.ts`](../app/domain/portfolio/presentation.ts) (hero kind/layout, `getCaseComposition`, image URL, slice layout, `balanceCaseScreenColumns`). Archive row helpers: [`archive.ts`](../app/domain/portfolio/archive.ts) (`NN`, specimen, meta fallback). Does not change the `Case` model shape beyond normalize mapping.

## Prerender / Pages

[`nuxt.config.ts`](../nuxt.config.ts) `nitro:config` hook fetches all publish slugs and queues `/portfolio/{slug}`. GitHub Pages uses `npm run generate` (static); no Nitro runtime.

Deploy: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) with `NUXT_APP_BASE_URL=/molecule/` and `NUXT_PUBLIC_WP_API_BASE`.

## Gotchas

- Components must not call WordPress URLs directly.
- Document scroll is locked only on home (`html.hero-lock`); portfolio/case pages scroll normally ([`main.css`](../app/assets/css/main.css)).
- Case visual system: [`CASES.md`](CASES.md) / [`case.css`](../app/assets/css/case.css). Archive listing: [`archive.css`](../app/assets/css/archive.css). Keep conditional rendering; absence stays `null` / `[]`. No Three.js on archive or case pages.
- `wpFetch` must not call `useRuntimeConfig()` after `await` inside `useAsyncData` (NUXT_E1001). Resolve base via `tryUseNuxtApp()?.$config` with env fallback ([`client.ts`](../app/api/client.ts)).
