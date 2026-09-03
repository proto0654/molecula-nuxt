# Theme options — WordPress → Nuxt

Global site chrome and UI copy from **ACF Options** (`GET /acf/v3/options/options`). Same payload as contacts, hero tag cloud, and service detail chrome.

**Molecule hero copy (labels / blurbs / USP) is not here** — it lives on the five navigation pages. See [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md).

**API host:** `https://api.weblaba.ru/wp-json` (`NUXT_PUBLIC_WP_API_BASE`).

---

## Architecture

| Layer | Path | Role |
|-------|------|------|
| Raw types | `app/types/wp/raw.ts` | `ThemeOptionsAcf` |
| UI string keys | `app/types/wp/uiStrings.ts` | `UI_STRING_KEYS`, `UiStringKey` |
| Domain | `app/types/wp/domain.ts` | `ThemeOptions`, `ScrollToTopSettings`, … |
| Normalize | `app/domain/options/normalizeThemeOptions.ts` | ACF → `ThemeOptions` |
| Hero chrome | `app/domain/options/heroChromeCopy.ts` | aria + HUD labels + nav verbs (`resolveHeroChromeCopy`) |
| Fetch | `app/composables/useThemeOptionsAcf.ts` | Single `useAsyncData` key: `theme-options-acf` |
| SSR cache | `useThemeOptionsAcfState()` | `useState` — survives dev hydration when `payloadExtraction` is off |
| Plugin | `app/plugins/theme-options.ts` | Prefetch before layout chrome renders |
| Consumer API | `app/composables/useThemeOptions.ts` | `options`, `t(key)`, coverage log hook |
| Fallback strings | `app/composables/useUiString.ts` | empty → visible `[key]` via `missingUiString` |

**Molecule hero (pages)**

| Layer | Path | Role |
|-------|------|------|
| Fetch | `getMoleculeHeroPages` / `useMoleculeHeroNav` | Five pages, lazy |
| Normalize | `normalizeMoleculeHeroPages` + `mergeHeroNavigation` | title + `hero_*` → nav items |

**Rules**

- Hero / WebGL never blocks on fetch — `navigationConfig` mounts with empty copy; page `hero_*` merges when present (`useMoleculeHeroNav` is lazy, client-only).
- Empty Options UI strings show as `[key]` (`missingUiString`) — no silent RU hardcode in Nuxt.
- One Options fetch key for chrome consumers (`useThemeOptionsAcf` / `useThemeOptionsAcfData`).
- RU fields only in UI; `*_en` keys stay on raw type for a future `/en/` pass.
- Do **not** seed or wire Options `hero_nav_items` (removed on WP).
- **WP seed:** Tools → WebLaba Migrations → **Seed empty UI string Options** writes code defaults into empty ACF Options so REST returns real values.
- **Desktop rail CTA seed:** ACF `hud_nav_go` = `Перейти`, `hud_nav_go_en` = `Go to` (typed on `ThemeOptionsAcf`; UI still RU until `/en/`).
- **Service detail nav seed:** ACF `services_nav_next_label` / `services_nav_prev_label` (+ `_en`) — see [`docs/seed/services-nav-labels.seed.json`](seed/services-nav-labels.seed.json).
- **Portfolio shelves seed:** ACF `portfolio_heading_current`, `portfolio_heading_legacy`, `portfolio_link_current`, `portfolio_archive_description` (+ `_en`) — see [`docs/seed/portfolio-shelves.seed.json`](seed/portfolio-shelves.seed.json). Counts `(N)` are appended in Nuxt, not in Options copy.

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
| `wired` | `true` — Nuxt reads and renders; `false` — unused (`skipped` in coverage = intentionally unused) |
| `consumer` | Component / composable / note |

### Summary lines (not errors)

1. **Structural fields empty in WP** — e.g. empty `gtm_container_id` → no GTM script; code defaults for scroll-top when disabled oddly.
2. **Wired UI strings empty in WP** — field is connected but blank in Options; UI shows `[field_key]` (no silent RU hardcode).
3. **Present in WP but not wired in UI** — value exists in API but no component uses it yet (excludes skipped duplicates).

If **all** fields are empty, a warning suggests checking `.env` / `NUXT_PUBLIC_WP_API_BASE`.

**Source of truth for the table:** `app/domain/options/logThemeOptionsCoverage.ts` (`UI_STRING_CONSUMERS`, `STRUCTURAL_FIELDS`). Update this file when wiring a new field.

---

## Field status (Theme Options)

This table is **Options only**. Molecule HUD copy (`hero_usp` / `hero_blurb` / page titles) is logged separately in the browser as `[molecule-hero-nav] coverage`.

### Structural (Options)

| Field | Wired | Live WP | Consumer |
|-------|-------|---------|----------|
| `hero_tag_cloud` | yes | 7 rows | `useHeroTagCloud` |
| `weblaba_contacts` | yes | ok | `useContacts` |
| `scroll_to_top_*` | yes (enabled + trigger) | enabled | `SiteScrollToTop` — HUD hairline control; WP bg/icon/size/offset unused |
| `schema_org_*` | yes | ok | `useSiteIntegrations` (home JSON-LD) |
| `gtm_container_id` | yes | **empty** | `useSiteIntegrations` GTM script |

### Molecule hero (pages — not Options)

| Source | Wired | Live WP | Consumer |
|--------|-------|---------|----------|
| Page `post_title` + `hero_usp` / `hero_blurb` / `hero_blurb_cta` | yes | **needs theme deploy + Molecule Hero Import** | `useMoleculeHeroNav` → `MolecularHero` |

### UI strings — wired

| Key | Consumer |
|-----|----------|
| `footer_*` | `SiteFooterLegal` |
| `contact_popup_*` | `useContacts` → contact page |
| `header_home_aria`, `drawer_*`, `hero_logo_alt` | Hero chrome aria (`SiteHeader`, `MobileNavOverlay`) |
| `nav_verb_*`, `hud_*` | Hero HUD + atom blurb verbs (`setChromeCopy` → SiteHeader / Navigation / MobileNavOverlay / HudFrame / `buildAtomBlurb`). Desktop committed rail CTA: `hud_nav_go` |
| `chrome_index_kicker`, `chrome_case_label`, `chrome_service_label` | SiteChrome + archive/about/contact/privacy kickers (`chrome_index_kicker` only) |
| `case_section_*` | CaseContent / Gallery / Mobile / Slices section labels |
| `case_thanks_message` | `CaseThanks` (before NEXT; empty → omit) |
| `case_nav_*`, `case_back_to_portfolio` | `DetailNav` (portfolio), portfolio slug back link |
| `services_nav_next_label`, `services_nav_prev_label`, `services_back_to_archive` | `DetailNav` (services scope) |
| `portfolio_heading_current`, `portfolio_archive_description` | Portfolio archive (current shelf) + SEO |
| `portfolio_heading_legacy`, `portfolio_link_current` | Legacy shelf `/portfolio/legacy` + cross-links with counts |
| `services_*` (chrome + archive) | Service detail chrome, services archive |
| `seo_hidden_h1` | Home SEO |
| `hero_order_label` | Service CTA label (via `normalizeServiceChrome`) |
| `screenshot_lightbox_*` | `CaseLightbox` aria |

### UI strings — not wired yet (later)

| Key | Notes |
|-----|-------|
| `lang_switch_aria` | `/en/` locale switch |
| `case_mobile_signature_default_*` | Case mobile signature fallback |
| `case_content_default_*` | Case body fallback when CMS blocks empty |

### Skipped — duplicate of page / hero nav titles

`header_portfolio_*`, `header_about_*`, `hero_portfolio_label` exist in WP (legacy PHP header / shortcut copy). Route labels come from page titles / `navigationConfig`. **Do not wire.** Coverage marks them `skipped`.

### Empty in WP, wired — shows `[key]` until Options filled / seeded

- Any wired UI string empty in REST (incl. archive SEO strings if still blank)
- After **Seed empty UI string Options**, coverage should show `wp: ok` for seeded keys

---

## Layout chrome

Wired in `app/layouts/default.vue`:

- `SiteFooterMenu` — WP `menus/v1` slug `social` via `useWpMenu` (hidden on `/contact`; pose-gated fade-up enter)
- `SiteFooterLegal` — disclaimer, cookie notice (links `/privacy-policy/` from WP HTML), copyright
- `SiteScrollToTop` — scroll-to-top button (Nuxt auto-import name for `components/site/ScrollToTop.vue`); HUD hairline square inset with `--hud-header-inset`; Options `enabled` + `trigger_px` only
- `useSiteIntegrations()` — GTM script + noscript + Organization schema

---

## Next iterations

1. **WP:** Deploy `weblaba-rework` (incl. portfolio shelf strings in `locale.php` + ACF UI tab — see [`docs/seed/portfolio-shelves.seed.json`](seed/portfolio-shelves.seed.json)), then Tools → WebLaba Migrations → **Seed empty UI string Options**.
2. Optional: fill `gtm_container_id`, archive SEO strings (empty ones show as `[key]` in UI/meta).
3. Later: case defaults (design-aware).
4. Later: i18n (`lang_switch_aria` + `*_en` / `/en/`).
5. Later: Options key for desktop routes nav `aria-label` (currently empty when missing).

---

## Related

- [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md) — page ACF molecule hero + import checklist
- [`api-real-response.md`](api-real-response.md) — live REST shapes
- [`CONTENT.md`](CONTENT.md) — CPT normalize / prerender
