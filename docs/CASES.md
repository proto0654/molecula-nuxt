# Case pages (editorial inspection)

Home is 3D spatial navigation. Case pages are HTML/CSS documents — **no Three.js / WebGL**, no GSAP scroll (GSAP stays on `Navigator` route transitions). Tokens and layout: [`app/assets/css/case.css`](../app/assets/css/case.css). Content pipeline (normalize, `v-if`, absence = `null`): [`CONTENT.md`](CONTENT.md).

Principles: scientific / technical / editorial / minimal. Large type, hairlines, numbered sections, 12-col compositional grid, generous negative space, restrained accent. Not cyberpunk, not dashboard, not agency cards. Do not add decorative HUD chrome for atmosphere.

## Components

| File | Role |
|------|------|
| [`CaseShell.vue`](../app/components/case/CaseShell.vue) | Page chrome: edge grid, L-ticks, logo, `CASE / NN`, Index |
| [`CaseHeader.vue`](../app/components/case/CaseHeader.vue) | Index, title, `titleEn`, excerpt, sparse CLIENT/STACK/URL |
| [`CaseHeroMedia.vue`](../app/components/case/CaseHeroMedia.vue) | One hero: video → landing → featured |
| [`CaseVideo.vue`](../app/components/case/CaseVideo.vue) | Presentational `<video>` used **inside** the hero only |
| [`CaseSection.vue`](../app/components/case/CaseSection.vue) | Numbered label + body on the 12-col grid |
| [`CaseContent.vue`](../app/components/case/CaseContent.vue) / Gallery / Mobile / Slices | Conditional blocks |
| [`CaseNavigation.vue`](../app/components/case/CaseNavigation.vue) | Prev / Index / Next |

Route: [`app/pages/portfolio/[slug].vue`](../app/pages/portfolio/[slug].vue). Presentation helpers (hero kind/layout, image URL, section numbers) live in [`app/domain/portfolio/presentation.ts`](../app/domain/portfolio/presentation.ts) — they do **not** change the `Case` model.

## Tokens

Set `--case-accent` from `case.accentColor` on the page; otherwise ink. **Never** use accent as the page background (`--wl-bg` stays).

| Token | Use |
|-------|-----|
| `--case-accent` | Lines, ticks, hover borders |
| `--case-accent-ink` | `color-mix` of accent + bright ink — readable labels on dark bg |
| `--case-space-hero` / `--case-space-section` / `--case-space-visual` / `--case-space-footer` | Vertical rhythm |
| `--case-pad-x` / `--case-pad-y` | Body inset inside corner ticks |
| `--text-case-title` / `--text-case-title-split` | Large titles (not all-caps — long RU names) |
| `--case-media-max` / `--case-mobile-max` | Cap tall CMS screenshots so a missing block is not replaced by a 10k-px image |

## Chrome

Fixed overlay, same visual language as HUD (edge grid + four L-ticks), quieter, no `⟨ SYS · МОЛЕКУЛА ⟩`. Top-left: `[ МАРК ] ЛОГО` → `/`. Top-right: `CASE / NN` (1-based index from slim sort) + Index → `/portfolio`. No giant decorative “CASE”. In-content index is `text-meta` once above the title.

## Grid

`.case-grid` is 12 columns. Named zones (`.case-zone-editorial`, `.case-zone-visual`, `.case-zone-label`, `.case-zone-body`) — not a literal 3+6+3 everywhere. Mobile: one column + pad tokens.

Hero layouts (from available media, not per-slug hacks):

- **split** — video or `landingScreen`: text cols 1–5, visual 6–12
- **stack** — featured only: title then visual below, offset
- **text** — no media

Hero source priority: `video` → `landingScreen` → `featuredImage`. Video is not duplicated later. `screenshot_image` is not a hero.

## Blocks

Page order: Header + Hero → Content → Gallery → Mobile → Slices → Footer.

Optional; missing blocks leave no reserved gap. Numbered sections (`01` / Content) count **visible** blocks only. Metadata (CLIENT / STACK / URL) renders only when `client` / `technologies` / `projectUrl` are non-null — usually all empty; do not invent TYPE/ROLE/PLATFORM.

Gallery is static (asymmetric, no animation). Mobile/slices images are height-capped; slice-grid animation is out of scope.

## Gotchas

- Do not put Three.js on case pages.
- `case_dark_bg_color` is a **subtle accent**, not a full-page wash. Mix with bright ink for text (`--case-accent-ink`) — raw hex is often too dark on `--wl-bg`.
- Slim index `_fields` include `title` for prev/next labels (`getCasePosition`).
- Case pages must not set `html.hero-lock`.
