# Content pipeline (WordPress → Nuxt)

Headless consumption of production WordPress REST. WP remains source of truth; the Nuxt app never invents CMS data.

## Flow

```
pages / composables
  → app/api/*          (ofetch; no REST URLs in components)
  → app/domain/*       (normalize raw → Case / Service / AboutPage / ContactPage / NavigationMenu)
  → app/types/wp/*     (raw + domain types)
  → components/archive/* + components/service/*  (editorial listing + service detail)
  → components/case/*     (conditional case blocks)
  → components/about/*    (about photo / skills / CTA)
  → components/contact/*  (contact links from theme options)
```

Live response notes: [`api-real-response.md`](api-real-response.md).

## API layer (`app/api/`)

| Module | Role |
|--------|------|
| `client.ts` | `wpFetch` / `wpFetchPaginated` + `X-WP-Total` / `X-WP-TotalPages` |
| `portfolio.ts` | list page, posts by ids, case by slug, categories, slim index, slugs |
| `services.ts` | posts by ids, service by slug, slim index, slugs |
| `options.ts` | ACF theme options (`/acf/v3/options/options`) — RU chrome for services + contacts |
| `menus.ts` | `menus/v1` only (core `/wp/v2/menus` is 401) |
| `pages.ts` / `media.ts` | page by slug (`_embed=wp:term` for about tags) / media |

Base URL: `runtimeConfig.public.wpApiBase` (`NUXT_PUBLIC_WP_API_BASE`). Build/prerender falls back to env via `getWpApiBaseFromEnv()`.

## Normalization

Shared media/text helpers live in [`app/domain/wp/`](../app/domain/wp/normalizeMedia.ts) (`emptyToNull`, ACF image, featured embed, tag names from `_embedded["wp:term"]`).

[`normalizePortfolioPost`](../app/domain/portfolio/normalizePortfolio.ts) maps `WpPortfolioPost` → `Case`.

[`normalizeServicePost`](../app/domain/services/normalizeService.ts) maps `WpServicePost` → `Service` (RU only). Empty `service-repeater` → `[]` (hide offers). Offer anchors: slug from `cf_title`, else `usluga-{n}`, collisions `-2`, `-3`. `cf_features` and `service-thumb` are ignored. Featured image is stored for the archive specimen; service detail does not render it.

[`normalizeAboutPage`](../app/domain/about/normalizeAbout.ts) maps page `about` → `AboutPage`. Empty `about-repeater` → `[]` (hide skills) — **no PHP demo-skill fallback**. Empty photo → no placeholder image.

[`normalizeContactPage`](../app/domain/contacts/normalizeContacts.ts) maps ACF options → `ContactPage`. Empty / false `weblaba_contacts` → `[]` (no PHP Telegram+phone fallback). Rows without `label` or `url` are dropped; unknown `icon` → `link`. RU only.

**EN fields are typed on raw ACF and documented below; normalizers and UI do not read them yet.**

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
| `/portfolio/[slug]` | `CaseShell` + video hero + layout featured wash / accent overlay + Overview / Interface (`landing_screen`+repeater) / Mobile / Slices / NEXT |
| `/services` | `useServices(page)` — slim-index pagination, editorial rows **without** featured wash |
| `/services/[slug]` | `ServiceShell` + title/tags hero + intro (`contentHtml`) + offer repeater (price + «от» + order CTA) + prev/next |
| `/about` | `SectionShell` + photo/tags + H1 + intro + skills repeater + CTA → `/contact` |
| `/contact` | `SectionShell` + H1 «Контакты» + popup title/text + `weblaba_contacts` links |

Hero: video only (flat). Interface = `landing_screen` (index 0) + repeater — desktop always 3 flex cols via `balanceCaseScreenColumns` (first screen pinned in col0; taller stacks prefer earlier cols, then equalize); &lt;1024: 2-col CSS masonry. Section numbers sequential among visible blocks (`getCaseComposition`, including NEXT).

Service detail composition: hero (title + tags, no featured) → intro if content → offers if rows (`services_section_heading` H2 only when both heading and rows exist) → NEXT. Price CTA only when `cf_price` is set. Chrome strings from theme options: `services_section_heading`, `services_price_from` (fallback «от»), `hero_order_label` (fallback «Заказать»).

About order: photo + tags → H1 → intro → skills (H2 `about_section_title` only if title and rows) → CTA if `about_cta_label`.

Contact order: H1 «Контакты» → kicker `contact_popup_title` → intro `contact_popup_text` → all normalized contacts (not filtered by `show_in_socialbar`). `_blank` gets `rel="noopener noreferrer"`. About / service CTAs stay `NuxtLink` to `/contact` (no popup overlay).

SEO: `useSeoMeta` title + plain excerpt on case / service / about / contact pages.

Presentation helpers: [`app/domain/portfolio/presentation.ts`](../app/domain/portfolio/presentation.ts) (hero kind/layout, `getCaseComposition`, image URL, slice layout, `balanceCaseScreenColumns`). Archive row helpers: [`archive.ts`](../app/domain/portfolio/archive.ts) (`NN`, specimen, meta fallback). Service archive: [`app/domain/services/archive.ts`](../app/domain/services/archive.ts) (featured specimen, tags meta or chrome «Услуга»). Does not change the `Case` model shape beyond normalize mapping.

## EN fields (typed, unused in UI)

When `/en/` is wired, resolve as follows. Until then the app reads RU only.

| Surface | RU (rendered now) | EN (raw / later) | Later resolve |
|---------|-------------------|------------------|---------------|
| Service title | `title.rendered` | `acf.post_title_en` / `meta.weblaba_title_en` | `weblaba_title_en \|\| post_title_en`, else RU |
| Service intro | `content.rendered` | `acf.post_content_en` | EN if non-empty, else RU |
| Offers | `service-repeater` (`cf_title`, `cf_text`, `cf_price`) | `service-repeater_en` (`cf_*_en`) | localized repeater; **price prefers RU `cf_price`** (₽) |
| Service chrome | `services_section_heading`, `services_price_from`, `hero_order_label` | `*_en` on the same options keys | localized option |
| About title / intro | page title / content | `post_title_en`, `post_content_en` | same as service |
| About skills / CTA / H2 | `about-repeater`, `about_cta_label`, `about_section_title` | `about-repeater_en`, `*_en` | localized; photo has no EN pair |
| Contacts | `weblaba_contacts.label`, `contact_popup_title`, `contact_popup_text` | `label_en`, `contact_popup_*_en` | localized option / row |
| Trap | — | EN repeater without `post_title_en` / `post_content_en` | hero stays RU |

Mobile field mapping (cases): slices from `screen-mobile` (`block_ratio` defaults to `1/2.3`); composite mockup from `screenshot_image` whenever set (can coexist with slices); signature `podpis_vozle_mokapa_mobily_pravo` beside mockup, or its own section before slices when slices-only. Filled media/signature is never discarded.

## Prerender / Pages

[`nuxt.config.ts`](../nuxt.config.ts) `nitro:config` hook fetches publish slugs and queues `/portfolio/{slug}` and `/services/{slug}`. GitHub Pages uses `npm run generate` (static); no Nitro runtime.

Deploy: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) with `NUXT_APP_BASE_URL=/molecula-nuxt/` and `NUXT_PUBLIC_WP_API_BASE`. Preview: [proto0654.github.io/molecula-nuxt](https://proto0654.github.io/molecula-nuxt/).

## Gotchas

- Components must not call WordPress URLs directly.
- Document scroll is locked only on home (`html.hero-lock`); portfolio/case pages scroll normally ([`main.css`](../app/assets/css/main.css)).
- Case visual system: [`CASES.md`](CASES.md) / [`case.css`](../app/assets/css/case.css). Archive listing: [`archive.css`](../app/assets/css/archive.css). Services: [`services.css`](../app/assets/css/services.css) (no wash). About: [`about.css`](../app/assets/css/about.css). Contact: [`contact.css`](../app/assets/css/contact.css). Keep conditional rendering; absence stays `null` / `[]`. No Three.js on archive, case, service, about, or contact pages.
- Service archive return uses session key `wl:archive-return:services` (portfolio keeps `wl:archive-return`).
- `wpFetch` must not call `useRuntimeConfig()` after `await` inside `useAsyncData` (NUXT_E1001). Resolve base via `tryUseNuxtApp()?.$config` with env fallback ([`client.ts`](../app/api/client.ts)).
