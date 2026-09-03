# WordPress REST API — real response notes

Inspected against production: `https://weblaba.ru/wp-json/` (2026-08-26). **Live API host since 2026-09:** `https://api.weblaba.ru/wp-json/` (WordPress moved to subdomain; response shape unchanged).

Source of truth remains WordPress. Local/Nuxt app only consumes.

## Endpoints

| Resource | Path | Status |
|----------|------|--------|
| Portfolio list | `/wp/v2/portfolio` | OK |
| Portfolio by id | `/wp/v2/portfolio/{id}` | OK |
| Portfolio by slug | `/wp/v2/portfolio?slug=` | OK |
| Categories | `/wp/v2/portfolio_category` | OK (1 term: `legacy`) |
| Services list | `/wp/v2/services` | OK (CPT; `_embed=wp:featuredmedia,wp:term`) |
| Services by slug | `/wp/v2/services?slug=` | OK |
| Tags | `/wp/v2/tags` | OK (`post_tag` on portfolio **and** services / about) |
| Pages | `/wp/v2/pages` | OK (`about` uses `template: page-about`) |
| ACF options | `/acf/v3/options/options` | OK (public theme chrome) |
| Media | `/wp/v2/media/{id}` | OK |
| Menus (plugin) | `/menus/v1/menus`, `/menus/v1/menus/{slug}`, `/menus/v1/locations` | OK |
| Core menus | `/wp/v2/menus` | **401** `rest_cannot_view` — do not use |
| `wp-api-menus/v2` | `/wp-api-menus/v2/menus` | **404** — do not use |

## Pagination

Headers (also in `Access-Control-Expose-Headers`):

- `X-WP-Total` — e.g. `59`
- `X-WP-TotalPages` — depends on `per_page` (e.g. `30` at `per_page=2`)
- `Link` — `rel="next"` / `prev`

Use headers; do not hardcode page counts.

## CORS

`Access-Control-Allow-Origin` reflects request `Origin` (verified for `http://localhost:3000` and `https://proto0654.github.io`).

## Portfolio post (core)

Typical fields used by the headless app:

- `id`, `slug`, `status`, `type`, `link`, `date`
- `title.rendered`, `content.rendered`, `excerpt.rendered`
- `featured_media` (id)
- `menu_order`
- `tags` — number[] (`post_tag`); often `[]` on newer cases
- `portfolio_category` — number[]; often `[]`; legacy archive uses `124`
- `acf` — object (ACF to REST API); **not** `fields`

`_embed=wp:featuredmedia` adds `_embedded["wp:featuredmedia"][0]` with `source_url`, `alt_text`, `media_details.sizes`.

## ACF on portfolio (`acf`)

Keys observed on live posts:

| Key | Empty / missing shape | Present shape |
|-----|----------------------|---------------|
| `landing_screen` | `false` | ACF image object |
| `screen-mobile` | `false` | ACF image object |
| `screenshot_image` | `false` (common) | ACF image object |
| `repeater` | `false` | `[{ repeater_field: AcfImage }, ...]` |
| `video` | `false` | ACF file/video object (`url`, `mime_type`, …) |
| `block_ratio` | `false` / absent | string e.g. `"1/2.3"` |
| `podpis_vozle_mokapa_mobily_pravo` | `""` / `false` | HTML string |
| `case_dark_bg_color` | `""` / `false` | `"#597f7f"` |
| `case_dark_bg_color_lock` | — | boolean |
| `post_title_en` / `post_content_en` | null / string | string / HTML |
| `client` / `project_url` / `technologies` | `""` often | string |
| `*_en` caption/client/tech variants | `""` | string / HTML |

**Important:** fields vary per case. `false` means “no media/repeater”, not an error. Empty string `""` for text should normalize to `null` for conditional UI.

No separate WebP URLs in JSON — only registered size names (below).

### ACF image object (compact)

```
id, url, alt, width, height, mime_type,
sizes: {
  thumbnail, medium, medium_large, large,
  1536x1536, 2048x2048,
  weblaba-screen, weblaba-landing,
  // plus *-width / *-height numeric companions
}
```

### Featured `_embed` sizes

`thumbnail`, `weblaba-screen`, `weblaba-landing`, `full` (not the full ACF size set).

### Media endpoint sizes

Same as featured embed for sample id `13342`: `thumbnail`, `weblaba-screen`, `weblaba-landing`, `full`.

## Categories

Only one term returned:

- `id: 124`, `slug: legacy`, `name: Архив проектов`, `count: 36`

## Menus (`menus/v1`)

- List: menus include `main`, `main-en`, `main-short`, `social`, `uslugi`, …
- Locations: `main`, `social`, `main_en`
- Item fields used: `title`, `url`, `menu_order`, `menu_item_parent`, `classes`, `object`, `type`, optional `slug`
- Flat list (parent `"0"` for top-level); hierarchy via `menu_item_parent`

## Ordering note (prev/next)

`?orderby=menu_order&order=asc` does **not** apply secondary `date DESC` among equal `menu_order`. WordPress REST has no composite order. Adjacent-case logic needs a slim index sorted client/server-side as `menu_order ASC`, then `date DESC` — not the index of the current archive page.

## Pages (sample)

`about` (`template: page-about`, id `12896`), `home-2`, `portfolio`, `privacy-policy`.

About ACF (RU rendered; EN typed, unused in UI):

| Key | Role |
|-----|------|
| `about_photo` | hero image; `false` → no photo (no placeholder) |
| `about_section_title` / `_en` | H2 over skills |
| `about-repeater` | `[{ cf_title, cf_text }]` |
| `about-repeater_en` | `[{ cf_title_en, cf_text_en }]` |
| `about_cta_label` / `_en` | CTA → `/contact` |
| `post_title_en` / `post_content_en` | i18n later |

Embed `_embed=wp:term` for hero tags.

## Services CPT

`GET /wp/v2/services` — 6 published posts (2026-08-27). Taxonomies: `post_tag`. Order: `menu_order ASC`, then `date DESC`. Featured image is listing-only (some posts `featured_media: 0`).

ACF on a service post:

| Key | Role |
|-----|------|
| `service-repeater` | `[{ cf_title, cf_text, cf_price, cf_features }]` — features not rendered |
| `service-repeater_en` | `[{ cf_title_en, cf_text_en, cf_price_en, cf_features_en }]` — unused in UI |
| `post_title_en` / `post_content_en` | also on `meta` (`weblaba_title_en`) — unused in UI |
| `service-thumb` | legacy; often `false` — ignore |

Theme options chrome (same options payload):

| Key | Live RU | EN |
|-----|---------|-----|
| `services_section_heading` | `Предлагаемые услуги и сервисы:` | `Offered services and amenities:` |
| `services_price_from` | `от` | `from` |
| `hero_order_label` | `Заказать` | `Order` |
| `contact_popup_title` | `Свяжитесь со мной` | `Contact me` |
| `contact_popup_text` | messenger CTA copy | EN pair |
| `weblaba_contacts` | repeater (see below) | `label_en` per row |
| `hero_tag_cloud` | repeater: `label` + `tier` (`primary` / `secondary`) | none |
| `hero_nav_items` | repeater wired in Nuxt; **empty on live API** — fill per [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md) |
| `footer_*`, `scroll_to_top_*`, `schema_org_*` | wired in Nuxt (`SiteFooterLegal`, `SiteScrollToTop`, JSON-LD) |
| `gtm_container_id` | wired; **empty** on live API |
| Header/drawer aria, archive headings, case nav, lightbox aria | wired — see [`THEME_OPTIONS.md`](THEME_OPTIONS.md) |
| `header_portfolio_*`, `header_about_*` | in API; **skipped** — duplicate of hero nav labels |
| `case_thanks_message`, legacy portfolio strings, `lang_switch_aria` | in API; **not wired** in UI yet |

Contacts repeater (`weblaba_contacts`, 2026-08-27): Telegram, `tel:`, VK, mailto. Fields: `label`, `label_en`, `url`, `icon` (Iconify id, e.g. `bx:bxltelegram`, `mdi:vk`), `target` (`_self` / `_blank`), `show_in_header` (legacy), `show_in_socialbar`. No WP page with slug `contact` — options only. Empty repeater is `false` / `[]`; Nuxt does not inject PHP Telegram+phone defaults.

Hero tag cloud (`hero_tag_cloud`, 2026-08-30): `AI` / `SYSTEMS` / `DESIGN` (primary), `MCP` / `RAG` / `AGENTS` / `AUTOMATIONS` (secondary). Empty repeater is `false` / `[]`.

Nuxt archive is compact rows (like portfolio), **not** the WP `all_services` dump of full repeaters on one page. Detail is `/services/:slug`.

Full theme-options wiring + dev coverage log: [`THEME_OPTIONS.md`](THEME_OPTIONS.md).

## Gaps / non-issues

- Do not invent WebP variants in the API layer.
- Do not treat missing ACF blocks as errors.
- Do not use core `/wp/v2/menus`.
