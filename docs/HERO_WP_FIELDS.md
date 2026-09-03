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
| Molecule blurb CTA tail | `hero_blurb_cta` | text | Glued after blurb + `{кликай\|тапай}` |

EN stubs (schema only until `/en/`): `hero_usp_en`, `hero_blurb_en`, `hero_blurb_cta_en`.

**Defaults / import:** theme `inc/page-molecule-hero-defaults.php` + **Tools → Molecule Hero Import** (or WebLaba Migrations → Run Molecule Hero Import). Import also clears deprecated Options `hero_nav_items`.

---

## Nuxt runtime

1. `getMoleculeHeroPages()` — slim `_fields=id,slug,title,acf`
2. `normalizeMoleculeHeroPages()` → `HeroNavItemRow[]`
3. `mergeHeroNavigation(rows, navigationConfig.items)` in `useMoleculeHeroNav()` (**lazy** — hero never waits on WP)
4. `MolecularHero` watches `navItems` and calls `setNavigationItems`

```
displayBlurb = buildAtomBlurb({ blurb, blurbCta })
```

Verb from [`pointerInput.ts`](../app/lib/a11y/pointerInput.ts).

---

## Seed values (RU)

| nav_id | label (title) | blurb | blurb_cta | usp |
|--------|---------------|-------|-----------|-----|
| `home` | Главная | `weblaba / студия веб-продуктов` | *(empty)* | Цифровые продукты из одного узла |
| `about` | О нас | `студия weblaba` | `, будем знакомиться` | Команда, процесс, подход |
| `services` | Услуги | `разработка и дизайн` | `, чтобы выбрать услуги` | От идеи до релиза |
| `work` | Портфолио | `архив проектов` | `, переход в портфолио` | Кейсы, которые работают |
| `contact` | Контакты | `открытый канал` | ` для связи со мной` | Прямой канал без шума |

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
