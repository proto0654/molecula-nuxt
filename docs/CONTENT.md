# Content pipeline (WordPress → Nuxt)

Headless consumption of production WordPress REST. WP remains source of truth; the Nuxt app never invents CMS data.

## Flow

```
pages / composables
  → app/api/*          (ofetch; no REST URLs in components)
  → app/domain/*       (normalize raw → Case / NavigationMenu)
  → app/types/wp/*     (raw + domain types)
  → components/case/*  (conditional blocks)
```

Live response notes: [`api-real-response.md`](api-real-response.md).

## API layer (`app/api/`)

| Module | Role |
|--------|------|
| `client.ts` | `wpFetch` / `wpFetchPaginated` + `X-WP-Total` / `X-WP-TotalPages` |
| `portfolio.ts` | list page, case by slug, categories, slim index, slugs |
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

## Routes

| Route | Source |
|-------|--------|
| `/` | Molecular hero (`ClientOnly` → `MolecularHero`) |
| `/portfolio` | `usePortfolio(page)` — server pagination via WP headers |
| `/portfolio/[slug]` | `CaseShell` + hero (`video` → `landingScreen` → `featuredImage`) + conditional Content / Gallery / Mobile / Slices / Navigation |

Hero layout: `split` (video or landing) or `stack` (featured only). Video is not repeated below the hero. Section numbers are sequential among visible blocks only.

SEO: `useSeoMeta` title + plain excerpt on case pages.

Presentation helpers: [`app/domain/portfolio/presentation.ts`](../app/domain/portfolio/presentation.ts) (hero kind/layout, image URL, section numbers). Does not change the `Case` model.

## Prerender / Pages

[`nuxt.config.ts`](../nuxt.config.ts) `nitro:config` hook fetches all publish slugs and queues `/portfolio/{slug}`. GitHub Pages uses `npm run generate` (static); no Nitro runtime.

Deploy: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) with `NUXT_APP_BASE_URL=/molecule/` and `NUXT_PUBLIC_WP_API_BASE`.

## Gotchas

- Components must not call WordPress URLs directly.
- Document scroll is locked only on home (`html.hero-lock`); portfolio/case pages scroll normally ([`main.css`](../app/assets/css/main.css)).
- Case visual system: [`CASES.md`](CASES.md) / [`case.css`](../app/assets/css/case.css). Keep conditional rendering; absence stays `null` / `[]`. No Three.js on case pages.
