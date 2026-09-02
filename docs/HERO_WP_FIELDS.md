# Hero navigation — WordPress fields & seed

Spec for molecular hero copy in WordPress Options. **Wired in Nuxt** — `mergeHeroNavigation()` merges WP rows into `navigationConfig`; when `hero_nav_items` is empty, hardcoded defaults apply.

Live options endpoint (same payload as contacts / services chrome):  
`GET /acf/v3/options/options`

Coverage log + full field map: [`THEME_OPTIONS.md`](THEME_OPTIONS.md).

---

## Where to create fields

| What | Where in WP |
|------|-------------|
| Field group | **ACF → Field Groups** (new or extend existing Options group) |
| Location rule | **Options Page** is equal to **Options** |
| Storage | Theme options — **not** per-page ACF |

**Do not** put hero blurbs on the About page — hero copy is global nav chrome, like `contact_popup_text`.

**Structural mapping stays in Nuxt** until a later iteration:

| Stays in code | Why |
|---------------|-----|
| `id` (`home`, `about`, …) | `NavigationState`, autoplay order |
| `atomId` (`C`, `H1`–`H4`) | Molecule graph / focus / bonds |
| `route` | Router + spatial mapping |

Copy merges from WP repeater rows matched by `nav_id`.

---

## ACF field group: Hero navigation

### Repeater: `hero_nav_items`

| Setting | Value |
|---------|--------|
| Type | Repeater |
| Name | `hero_nav_items` |
| Min / Max rows | 5 / 5 |
| Layout | Row |

### Sub fields

| Label | Name | Type | Required | Notes |
|-------|------|------|----------|-------|
| Nav ID | `nav_id` | Text | yes | `home`, `about`, `services`, `work`, `contact` |
| Label | `label` | Text | yes | Nav rail + 3D atom caption |
| Blurb (part 1) | `blurb` | Textarea | yes | Hub may use ` / ` between two descriptive parts |
| Blurb CTA tail | `blurb_cta` | Text | no | Glued to `{кликай\|тапай}`. Include leading space or comma. Empty for hub |
| USP headline | `usp` | Text | yes | HUD scramble after focus settle |

### Optional EN (when `/en/` is wired)

`label_en`, `blurb_en`, `blurb_cta_en`, `usp_en` on the same repeater — same pattern as `services_section_heading_en`.

---

## Main menu alignment

Menu: **`menus/v1`**, slug **`main`**.

| Menu title (RU) | Path | `nav_id` |
|-----------------|------|----------|
| Главная | `/` | `home` |
| О нас | `/about` | `about` |
| Услуги | `/services` | `services` |
| Портфолио | `/portfolio` | `work` |
| Контакты | `/contact` | `contact` |

No WP Page with slug `contact` — contact body is options-only (`contact_popup_*`, `weblaba_contacts`).

---

## Runtime assembly (Nuxt, future)

[`buildAtomBlurb.ts`](../app/lib/navigation/buildAtomBlurb.ts) already assembles part 2:

```
row = hero_nav_items.find(nav_id)
displayBlurb = buildAtomBlurb({ ...structFromCode, blurb: row.blurb, blurbCta: row.blurb_cta })
```

Verb `{кликай|тапай}` from [`pointerInput.ts`](../app/lib/a11y/pointerInput.ts) (`pointer: coarse`, `hover: none`).

---

## Seed data

Full JSON: [`seed/hero-navigation-options.seed.json`](seed/hero-navigation-options.seed.json).

| nav_id | label | blurb | blurb_cta | usp |
|--------|-------|-------|-----------|-----|
| `home` | Главная | `weblaba / студия веб-продуктов` | *(empty)* | Цифровые продукты из одного узла |
| `about` | О нас | `студия weblaba` | `, будем знакомиться` | Команда, процесс, подход |
| `services` | Услуги | `разработка и дизайн` | `, чтобы выбрать услуги` | От идеи до релиза |
| `work` | Портфолио | `архив проектов` | `, переход в портфолио` | Кейсы, которые работают |
| `contact` | Контакты | `открытый канал` | ` для связи со мной` | Прямой канал без шума |

---

## Checklist

1. Add repeater + sub fields on Options.
2. Enter five rows from seed table or JSON.
3. Save Options.
4. Verify REST: `hero_nav_items` array with 5 objects.
5. ~~Extend `ThemeOptionsAcf`, `normalizeHeroNavigation()`, merge in hero bootstrap~~ **Done** — fill repeater in WP; dev console `[theme-options] coverage` confirms `hero_nav_items: ok`.

---

## Related

- [`CONTENT.md`](CONTENT.md) § Hero navigation copy
- [`WEBGL_HERO.md`](WEBGL_HERO.md) § Navigation
- [`api-real-response.md`](api-real-response.md) § Theme options
