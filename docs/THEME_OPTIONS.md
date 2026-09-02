# Theme options — WordPress → Nuxt

Global site chrome and UI copy from **ACF Options** (`GET /acf/v3/options/options`). Same payload as contacts, hero tag cloud, and service detail chrome.

**API host:** `https://api.weblaba.ru/wp-json` (`NUXT_PUBLIC_WP_API_BASE`).

---

## Architecture

| Layer | Path | Role |
|-------|------|------|
| Raw types | `app/types/wp/raw.ts` | `ThemeOptionsAcf` |
| UI string keys | `app/types/wp/uiStrings.ts` | `UI_STRING_KEYS`, `UiStringKey` |
| Domain | `app/types/wp/domain.ts` | `ThemeOptions`, `ScrollToTopSettings`, … |
| Normalize | `app/domain/options/normalizeThemeOptions.ts` | ACF → `ThemeOptions` |
| Hero nav merge | `app/domain/hero/normalizeHeroNavigation.ts` | WP rows + `navigationConfig` structure |
| Hero chrome aria | `app/domain/options/heroChromeCopy.ts` | `header_*`, `drawer_*`, `hero_logo_alt` |
| Fetch | `app/composables/useThemeOptionsAcf.ts` | Single `useAsyncData` key: `theme-options-acf` |
| SSR cache | `useThemeOptionsAcfState()` | `useState` — survives dev hydration when `payloadExtraction` is off |
| Plugin | `app/plugins/theme-options.ts` | Prefetch before layout chrome renders |
| Consumer API | `app/composables/useThemeOptions.ts` | `options`, `t(key)`, coverage log hook |
| Fallback strings | `app/composables/useUiString.ts` | `useUiString(key, fallback)` |

**Rules**

- Hero / WebGL never blocks on fetch — hardcoded `navigationConfig` is the fallback; WP copy merges when `hero_nav_items` is present.
- One fetch key for all consumers (`useThemeOptionsAcf` / `useThemeOptionsAcfData`).
- RU fields only in UI; `*_en` keys stay on raw type for a future `/en/` pass.

---

## Dev coverage log

In **development**, after theme options load once per session, the console prints:

```
[theme-options] coverage
```

### Table columns

| Column | Meaning |
|--------|---------|
| `field` | ACF key or UI string key |
| `wp` | `ok` — non-empty in live API; `empty` — missing or blank |
| `wired` | `true` — Nuxt reads and renders; `false` — planned, not connected |
| `consumer` | Component / composable / note |

### Summary lines (not errors)

1. **Structural fields empty in WP** — repeaters / IDs missing; code defaults apply (`hero_nav_items` → hardcoded nav copy, empty `gtm_container_id` → no GTM script).
2. **Wired UI strings empty in WP** — field is connected but blank in Options; in-code fallback from `useUiString(key, fallback)`.
3. **Present in WP but not wired in UI** — value exists in API but no component uses it yet; safe to fill in WP ahead of the next iteration.

If **all** fields are empty, a warning suggests checking `.env` / `NUXT_PUBLIC_WP_API_BASE`.

**Source of truth for the table:** `app/domain/options/logThemeOptionsCoverage.ts` (`UI_STRING_CONSUMERS`, `STRUCTURAL_FIELDS`). Update this file when wiring a new field.

---

## Field status (2026-09, production API)

### Structural

| Field | Wired | Live WP | Consumer |
|-------|-------|---------|----------|
| `hero_nav_items` | yes | **empty** | `MolecularHero` → `mergeHeroNavigation` |
| `hero_tag_cloud` | yes | 7 rows | `useHeroTagCloud` |
| `weblaba_contacts` | yes | ok | `useContacts` |
| `scroll_to_top_*` | yes | enabled | `SiteScrollToTop` |
| `schema_org_*` | yes | ok | `useSiteIntegrations` (home JSON-LD) |
| `gtm_container_id` | yes | **empty** | `useSiteIntegrations` GTM script |

### UI strings — wired

| Key | Consumer |
|-----|----------|
| `footer_*` | `SiteFooterLegal` |
| `contact_popup_*` | `useContacts` → contact page |
| `header_home_aria`, `drawer_*`, `hero_logo_alt` | Hero chrome aria (`SiteHeader`, `MobileNavOverlay`) |
| `case_nav_*`, `case_back_to_portfolio` | `DetailNav`, portfolio slug back link |
| `portfolio_heading_current`, `portfolio_archive_description` | Portfolio archive + SEO |
| `services_*` (chrome + archive) | Service detail chrome, services archive |
| `seo_hidden_h1` | Home SEO |
| `hero_order_label` | Service CTA label (via `normalizeServiceChrome`) |
| `screenshot_lightbox_*` | `CaseLightbox` aria |

### UI strings — not wired yet (next iterations)

| Key | Notes |
|-----|-------|
| `header_portfolio_*`, `header_about_*` | Off-home header chips — no UI slot yet |
| `portfolio_heading_legacy`, `portfolio_link_current` | Legacy category archive (`portfolio_category: legacy`) |
| `hero_portfolio_label` | Hero portfolio shortcut |
| `lang_switch_aria` | `/en/` locale switch |
| `case_thanks_message` | Case page thanks block (value **present** in WP) |
| `case_mobile_signature_default_*` | `CaseMobileSignature` fallback |
| `case_content_default_*` | Case body fallback when CMS blocks empty |

### Empty in WP, wired with code fallback

- `portfolio_archive_description`
- `services_heading_archive`
- `services_archive_description`
- `services_back_to_archive`

---

## Layout chrome

Wired in `app/layouts/default.vue`:

- `SiteFooterLegal` — disclaimer, cookie notice, copyright
- `SiteScrollToTop` — scroll-to-top button (Nuxt auto-import name for `components/site/ScrollToTop.vue`)
- `useSiteIntegrations()` — GTM + Organization schema

---

## Hero navigation copy

Repeater spec and seed: [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md).

Runtime: `mergeHeroNavigation(wpRows, navigationConfig.items)` → `mountHeroApp.setNavigationItems()` updates header, nav rail, mobile overlay labels, atom captions, blurbs, USPs. Structure (`id`, `atomId`, `route`) stays in code.

---

## Next iterations

1. **WP:** Fill `hero_nav_items` (5 rows), `gtm_container_id`, archive UI strings (`services_*`, `portfolio_archive_description`).
2. **Nuxt:** Wire `case_thanks_message`, case default blocks, legacy portfolio labels.
3. **Nuxt:** Off-home header chips (`header_portfolio_*`, `header_about_*`).
4. **i18n:** `lang_switch_aria` + `*_en` fields when `/en/` ships.

---

## Related

- [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md) — hero nav repeater ACF spec + seed
- [`api-real-response.md`](api-real-response.md) — live REST shapes
- [`CONTENT.md`](CONTENT.md) — CPT normalize / prerender
