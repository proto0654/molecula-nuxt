# Hero navigation — WordPress page fields & seed

Spec for molecular hero copy on the **five navigation pages**. Nuxt merges page `post_title` + ACF `hero_*` into `navigationConfig` via `mergeHeroNavigation()` / `useMoleculeHeroNav`. Structure (`id` / `atomId` / `route`) stays in code with empty copy until pages resolve — hero never blocks on fetch.

**Not** Theme Options. The Options repeater `hero_nav_items` is **deprecated / removed**. HUD verbs / menu labels / Index·CASE chrome: [`THEME_OPTIONS.md`](THEME_OPTIONS.md).

Live pages: one request per slug (`getMoleculeHeroPages`) — multi-`slug=` returns only one page on this WP.

Coverage: browser `[molecule-hero-nav] coverage`. Options chrome: [`THEME_OPTIONS.md`](THEME_OPTIONS.md).

---

## Where fields live

| What | Where in WP |
|------|-------------|
| Field group | **Molecule Hero** (`group_weblaba_molecule_hero_page_fields`) |
| Location | Front page **or** pages `about`, `services`, `portfolio`, `contact` |
| Storage | Per-page ACF — **not** Options |

Atom label = page **title** (`post_title` / `post_title_en` for future `/en/`). No separate label field.

Structural mapping stays in Nuxt:

| Stays in code | Why |
|---------------|-----|
| `id` (`home`, `about`, …) | `NavigationState`, autoplay order |
| `atomId` (`C`, `H1`–`H4`) | Molecule graph / focus / bonds |
| `route` | Router + spatial mapping |

| Page slug (prod) | `nav_id` | `atomId` | Route |
|------------------|----------|----------|-------|
| `home-2` (front) | `home` | `C` | `/` |
| `about` | `about` | `H1` | `/about` |
| `services` | `services` | `H2` | `/services` |
| `portfolio` | `work` | `H3` | `/portfolio` |
| `contact` | `contact` | `H4` | `/contact` |

---

## ACF fields (per page)

| Label | Name | Type | Notes |
|-------|------|------|-------|
| Molecule USP headline | `hero_usp` | text | HUD scramble after focus |
| Molecule blurb | `hero_blurb` | textarea | Typewriter part 1 |
| Molecule blurb CTA tail | `hero_blurb_cta` | text | Grammatical tail after Options `{кликай\|тапай}` — prefer `, …` / space-led EN; **not** a button label |
| Molecule USP headline (EN) | `hero_usp_en` | text | `/en/` via `pickLocalized` |
| Molecule blurb (EN) | `hero_blurb_en` | textarea | |
| Molecule blurb CTA tail (EN) | `hero_blurb_cta_en` | text | Same join rules as RU |

`emptyToNull` / merge `trim` strip a leading space on EN tails; [`navBlurbCta`](../app/lib/navigation/buildAtomBlurb.ts) re-inserts a space unless the tail starts with punctuation.

**Defaults / import:** theme `inc/page-molecule-hero-defaults.php` + **Tools → Molecule Hero Import** (or WebLaba Migrations → Run Molecule Hero Import). Import also clears deprecated Options `hero_nav_items`.

---

## Nuxt runtime

1. `getMoleculeHeroPages()` — slim `_fields=id,slug,title,acf` (generate / `nuxt dev` only)
2. Plugin [`molecule-hero-nav.ts`](../app/plugins/molecule-hero-nav.ts) prefetches into payload; production SPA reads `_payload.json` (no client REST)
3. `normalizeMoleculeHeroPages()` → `HeroNavItemRow[]`
4. `mergeHeroNavigation(rows, navigationConfig.items)` in `useMoleculeHeroNav()` (**lazy** — molecule mounts with empty copy until payload resolves)
5. `MolecularHero` watches `navItems` and calls `setNavigationItems`

```
displayBlurb = buildAtomBlurb({ blurb, blurbCta })
```

Verb from [`pointerInput.ts`](../app/lib/a11y/pointerInput.ts).

---

## Seed values (RU / EN)

`blurb_cta` is a **grammatical tail after** Theme Options `{кликай|тапай}` — prefer `, чтобы …` before infinitives (or conjugated like `, обсудим …` on hub). Target length ~15–19 characters.

| nav_id | label | usp | blurb | blurb_cta |
|--------|-------|-----|-------|-----------|
| `home` | Главная / Home | Кастомные сервисы под ваш процесс | От идеи до продакшена: код, UX и интеграции без посредников | `, обсудим проект` |
| `about` | О нас / About | Архитектура, UI и код в одних руках | Один инженер вместо агентства — прямой контакт и ясный результат | `, чтобы узнать стек` |
| `services` | Услуги / Services | От лендинга до ИИ-агентов и API | Web, боты, Mini Apps, интеграции, рефакторинг и дизайн-системы | `, чтобы выбрать` |
| `work` | Портфолио / Portfolio | Разборы интерфейсов и интеграций | Обзор, UI, mobile и срезы — без воды, с деталями реализации | `, чтобы открыть` |
| `contact` | Контакты / Contact | Telegram, телефон, почта — напрямую | Короткий контекст задачи достаточно — уточню детали в диалоге | `, чтобы написать` |

EN pairs: `hero_usp_en` / `hero_blurb_en` / `hero_blurb_cta_en` — see [`seed/hero-navigation-options.seed.json`](seed/hero-navigation-options.seed.json).

---

## Deploy checklist (WP)

1. Deploy `weblaba-rework` with `group_weblaba_molecule_hero_page_fields` registered.
2. Open each molecule page — **Molecule Hero** meta box should appear.
3. Run **Molecule Hero Import** (or fill fields manually from the table).
4. Verify REST: `acf.hero_usp` / `hero_blurb` / `hero_blurb_cta` on each of the five pages.
5. Nuxt: focus an atom — blurb/USP match WP; until import, hardcoded `navigationConfig` shows.

---

## Related

- WP canon: `weblaba-rework/docs/headless-field-map.md` § Molecule navigation pages
- [`THEME_OPTIONS.md`](THEME_OPTIONS.md) — Options chrome only (not hero copy)
- [`CONTENT.md`](CONTENT.md) § Hero navigation
- [`WEBGL_HERO.md`](WEBGL_HERO.md) § Navigation
