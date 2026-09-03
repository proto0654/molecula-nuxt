# Content pipeline (WordPress → Nuxt)

Headless consumption of production WordPress REST. WP remains source of truth; the Nuxt app never invents CMS data.

## Flow

```
pages / composables
  → app/api/*          (ofetch; no REST URLs in components)
  → app/domain/*       (normalize raw → Case / Service / AboutPage / ContactPage / HeroTag[] / NavigationMenu)
  → app/types/wp/*     (raw + domain types)
  → components/archive/* + components/service/*  (editorial listing + detail repeaters)
  → components/case/*     (conditional case blocks)
  → components/about/*    (about photo / skills / CTA on archive layout)
  → components/contact/*  (contact archive rows)
```

Live response notes: [`api-real-response.md`](api-real-response.md).

## API layer (`app/api/`)

| Module | Role |
|--------|------|
| `client.ts` | `wpFetch` / `wpFetchPaginated` + `X-WP-Total` / `X-WP-TotalPages` |
| `portfolio.ts` | list page, posts by ids, case by slug, categories, slim index, slugs |
| `services.ts` | posts by ids, service by slug, slim index, slugs |
| `options.ts` | ACF theme options (`/acf/v3/options/options`) — RU chrome for services + contacts + hero tag cloud |
| `menus.ts` | `menus/v1` only (core `/wp/v2/menus` is 401) |
| `pages.ts` / `media.ts` | page by slug (`_embed=wp:term` for about tags) / media |

Base URL: `runtimeConfig.public.wpApiBase` (`NUXT_PUBLIC_WP_API_BASE`). Build/prerender falls back to env via `getWpApiBaseFromEnv()`.

## Normalization

Shared media/text helpers live in [`app/domain/wp/`](../app/domain/wp/normalizeMedia.ts) (`emptyToNull`, ACF image, featured embed, tag names from `_embedded["wp:term"]`).

[`normalizePortfolioPost`](../app/domain/portfolio/normalizePortfolio.ts) maps `WpPortfolioPost` → `Case`.

[`normalizeServicePost`](../app/domain/services/normalizeService.ts) maps `WpServicePost` → `Service` (RU only). Empty `service-repeater` → `[]` (hide offers). Offer anchors: slug from `cf_title`, else `usluga-{n}`, collisions `-2`, `-3`. `cf_features` and `service-thumb` are ignored. Featured image is stored for the archive specimen; service detail does not render it.

[`normalizeAboutPage`](../app/domain/about/normalizeAbout.ts) maps page `about` → `AboutPage`. Empty `about-repeater` → `[]` (hide skills) — **no PHP demo-skill fallback**. Empty photo → no placeholder image.

[`normalizeContactPage`](../app/domain/contacts/normalizeContacts.ts) maps ACF options → `ContactPage`. Empty / false `weblaba_contacts` → `[]` (no PHP Telegram+phone fallback). Rows without `label` or `url` are dropped; unknown `icon` → `link`. RU only.

[`normalizeHeroTagCloud`](../app/domain/hero/normalizeHeroTagCloud.ts) maps ACF `hero_tag_cloud` → `HeroTag[]`. Empty / false repeater → `[]`. Rows without `label` are dropped; unknown `tier` → `secondary`. Rendered as a decorative Troika cloud around the molecule ([`TagCloud.ts`](../app/lib/molecular/TagCloud.ts)).

**EN fields are typed on raw ACF and documented below; normalizers and UI do not read them yet.**

Rules:

- Absence stays `null` / `[]` — never placeholder objects that break `v-if`
- ACF media/repeater `false` → `null` / `[]`
- Empty text `""` → `null`
- Image `sizes`: string URL keys only (no invented WebP); `sizeWidths` from ACF `*-width` / embed `media_details` for `srcset`
- Display: `caseImageUrl` + optional `caseImageSrcSet` (null if &lt;2 candidates) — hero, gallery, archive specimens, lightbox; CaseSlices CSS background unchanged
- Prev/next: slim index sorted `menu_order ASC`, then `date DESC` ([`getCasePosition`](../app/domain/portfolio/adjacent.ts)) — not archive-page array index. Slim `_fields` include `title` for footer labels.
- Archive listing uses the same slim sort, then `include` + `orderby=include` for the current page. Row numbers are 1-based positions in that index.

## Routes

| Route | Source |
|-------|--------|
| `/` | Molecular hero (`ClientOnly` → `MolecularHero`) |
| `/portfolio` | `usePortfolio(page)` — slim-index pagination (`include` ids), editorial rows; [`useArchivePaginationScroll`](../app/composables/useArchivePaginationScroll.ts) + `dataPage` gate on page change |
| `/portfolio/[slug]` | `CaseShell` + video hero + layout featured wash / accent overlay + Overview / Interface (`landing_screen`+repeater) / Mobile / Slices / NEXT |
| `/services` | `useServices(page)` — slim-index pagination, editorial rows **without** featured wash; same archive pagination scroll gate |
| `/services/[slug]` | `ArchiveShell` (`SERVICE / NN`) + Index kicker + title/tags + intro + offer repeater (`archive-list` rows: index, price meta, hover line/arrow, body + order CTA) + [`ArchiveDetailNav`](../app/components/archive/DetailNav.vue) |
| `/about` | `ArchiveShell` + Index kicker + title/tags + optional photo + intro + skills repeater (`archive-list`) + CTA → `/contact` |
| `/contact` | `ArchiveShell` + Index kicker «Контакты» + intro (`contact_popup_text`) + optional H2 (`contact_popup_title`) + contacts (`ContactArchiveRow` / `archive-list`) |
| `/privacy-policy` | WP page `privacy-policy` on `ArchiveShell`; linked from footer cookie HTML; prerendered + sitemap |

Hero: video only (flat). Interface = `landing_screen` (index 0) + repeater — desktop always 3 flex cols via `balanceCaseScreenColumns` (first screen pinned in col0; taller stacks prefer earlier cols, then equalize); &lt;1024: 2-col CSS masonry. Section numbers sequential among visible blocks (`getCaseComposition`, including NEXT).

Service detail composition: Index kicker + `SERVICE / NN` when indexed → intro if content → offers if rows (`services_section_heading` H2 only when both heading and rows exist) → NEXT via `ArchiveDetailNav` (same `case-nav` tokens as portfolio case; archive variant aligns from column 3). Price in row meta (`от` + amount); order CTA in row body when `cf_price` is set. Chrome strings from theme options: `services_section_heading`, `services_price_from` (fallback «от»), `hero_order_label` (fallback «Заказать»).

About order: Index kicker + H1 + tags → optional photo → intro if content → skills if rows (H2 `about_section_title` only if title and rows; `archive-list` with numbered rows) → CTA if `about_cta_label`.

Contact order: Index kicker + H1 → intro if text → optional H2 + contacts if rows. Detail repeaters use `archive-row--detail` (dividers between items only — no bottom hairline on last row).

SEO: [`usePageSeo`](../app/composables/usePageSeo.ts) on all routes — title (`— WebLaba` suffix except home full title), description, OG/Twitter, canonical. Home copy in [`homeSeo.ts`](../app/domain/seo/homeSeo.ts) (from live weblaba.ru Yoast). WP titles/excerpts via [`htmlToPlainText`](../app/domain/wp/htmlPlain.ts) (entity decode). Build writes `robots.txt` + `sitemap.xml` — see [`SEO.md`](SEO.md).

## Hero navigation copy

Molecular hero nav labels, atom captions, typewriter blurbs, and USP headlines: structure in [`navStructure.ts`](../app/lib/navigation/navStructure.ts) / empty copy in [`navigationConfig.ts`](../app/lib/navigation/navigationConfig.ts); live merge from the five WP navigation pages via [`useMoleculeHeroNav`](../app/composables/useMoleculeHeroNav.ts). Blurb verbs + HUD chrome strings: Theme Options ([`THEME_OPTIONS.md`](THEME_OPTIONS.md)). `moleculeConfig` atom captions resolve from nav `label` via `getItemByAtomId` — do not duplicate label strings elsewhere.

Decorative tag cloud around the molecule: ACF options `hero_tag_cloud` via [`useHeroTagCloud`](../app/composables/useHeroTagCloud.ts) → [`TagCloud`](../app/lib/molecular/TagCloud.ts). Not interactive.

| Field | Rendered as | Fallback | Live WP |
|-------|-------------|------------------|---------------------|
| `label` | Nav rail, 3D atom caption | `navigationConfig.items[].label` | Page `post_title` |
| `blurb` | Typewriter under atom on commit | part 1 + `blurbCta` in config; verb from [`buildAtomBlurb`](../app/lib/navigation/buildAtomBlurb.ts) | Page ACF `hero_blurb` + `hero_blurb_cta` |
| `usp` | HUD headline after focus settle | hardcode | Page ACF `hero_usp` |

Blurbs: part 1 + `blurbCta` glued to Options verb (`nav_verb_click` / `nav_verb_tap`). Hub is descriptive only.

WP field spec + import: [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md).

Hero wiring: [`WEBGL_HERO.md`](WEBGL_HERO.md) § Navigation.

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

Deploy: [DEPLOY.md](DEPLOY.md) — production [weblaba.ru](https://weblaba.ru) via [deploy-production.yml](../.github/workflows/deploy-production.yml); preview [proto0654.github.io/molecula-nuxt](https://proto0654.github.io/molecula-nuxt/) via [deploy.yml](../.github/workflows/deploy.yml) (`NUXT_PUBLIC_INDEXABLE=false`). WP API: `https://api.weblaba.ru/wp-json`.

## Gotchas

- Components must not call WordPress URLs directly.
- Document scroll is locked only on home (`html.hero-lock`); portfolio/case pages scroll normally. `html` uses `scrollbar-gutter: stable both-edges` ([`main.css`](../app/assets/css/main.css)) so scrollbar appearance does not shift layout on route change.
- Case visual system: [`CASES.md`](CASES.md) / [`case.css`](../app/assets/css/case.css). Archive listing + detail repeaters: [`archive.css`](../app/assets/css/archive.css). Services + about editorial tokens: [`services.css`](../app/assets/css/services.css). About photo: [`about.css`](../app/assets/css/about.css). Shared footer nav: [`DetailNav.vue`](../app/components/archive/DetailNav.vue) auto-imports as **`ArchiveDetailNav`**. Keep conditional rendering; absence stays `null` / `[]`. No Three.js on archive, case, service, about, or contact pages.
- Service archive return uses session key `wl:archive-return:services` (portfolio keeps `wl:archive-return`).
- `wpFetch` must not call `useRuntimeConfig()` after `await` inside `useAsyncData` (NUXT_E1001). Resolve base via `tryUseNuxtApp()?.$config` with env fallback ([`client.ts`](../app/api/client.ts)).
