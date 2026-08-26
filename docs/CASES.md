# Case pages (editorial inspection)

Home is 3D spatial navigation. Case pages are HTML/CSS documents — **no Three.js / WebGL**. GSAP is allowed **only** for restrained ScrollTrigger entry on visual media (gallery / mobile / slices) and for `Navigator` route transitions. Tokens and layout: [`app/assets/css/case.css`](../app/assets/css/case.css). Content pipeline (normalize, `v-if`, absence = `null`): [`CONTENT.md`](CONTENT.md).

Principles: scientific / technical / editorial / minimal. Large type, hairlines, numbered sections, 12-col compositional grid, generous negative space, restrained accent. Not cyberpunk, not dashboard, not agency cards. Do not add decorative HUD chrome for atmosphere.

## Components

| File | Role |
|------|------|
| [`CaseShell.vue`](../app/components/case/CaseShell.vue) | Page chrome: edge grid, L-ticks, logo, `CASE / NN`, Index; optional featured backdrop |
| [`CaseHeader.vue`](../app/components/case/CaseHeader.vue) | Index, title (USP-style scramble reveal), `titleEn`, excerpt; facts only when there is no CMS body |
| [`CaseHeroMedia.vue`](../app/components/case/CaseHeroMedia.vue) | Hero video only (flat, no 3D) |
| [`CaseVideo.vue`](../app/components/case/CaseVideo.vue) | Presentational `<video>` used **inside** the hero only |
| [`CaseSection.vue`](../app/components/case/CaseSection.vue) | Numbered label + body; `visual` full-bleed / `center` cols 4–10 |
| [`CaseContent.vue`](../app/components/case/CaseContent.vue) | Editorial Overview: 3-col label + 6-col CMS body + optional facts |
| [`CaseFacts.vue`](../app/components/case/CaseFacts.vue) | Compact CLIENT / STACK / URL — each field only if present |
| [`CaseGallery.vue`](../app/components/case/CaseGallery.vue) | Inner-pages: `landing_screen` + repeater (3-col / masonry) |
| [`CaseMobile.vue`](../app/components/case/CaseMobile.vue) | Composite phone mockup (`screenshot_image`) — flat image, `--case-mobile-max` width |
| [`CaseSlices.vue`](../app/components/case/CaseSlices.vue) | Decomposed `screen-mobile` grid via `block_ratio` (center col, like Screens) |
| [`CaseLightbox.vue`](../app/components/case/CaseLightbox.vue) | Dark overlay, technical index, close / prev-next |
| [`CaseNavigation.vue`](../app/components/case/CaseNavigation.vue) | Prev / Index / Next |

Route: [`app/pages/portfolio/[slug].vue`](../app/pages/portfolio/[slug].vue). Presentation helpers (hero, image URL, section numbers, **slice math**) live in [`app/domain/portfolio/presentation.ts`](../app/domain/portfolio/presentation.ts). Scroll entry: [`useCaseScrollEntry`](../app/composables/useCaseScrollEntry.ts). Slice bottom runway: [`useCaseSliceBottomSpace`](../app/composables/useCaseSliceBottomSpace.ts). Lightbox: [`useCaseLightbox`](../app/composables/useCaseLightbox.ts). Title scramble reuses [`textScramble`](../app/lib/hero-ui/textScramble.ts) (plain text from `stripTags`, not all-caps).

## Tokens

Set `--case-accent` from `case.accentColor` on the page; otherwise ink. **Never** use accent as the page background (`--wl-bg` stays).

| Token | Use |
|-------|------|
| `--case-accent` | Lines, ticks, hover borders |
| `--case-accent-ink` | `color-mix` of accent + bright ink — readable labels on dark bg |
| `--case-space-hero` / `--case-space-section` / `--case-space-visual` / `--case-space-footer` | Vertical rhythm |
| `--case-pad-x` / `--case-pad-y` | Body inset inside corner ticks |
| `--text-case-title` / `--text-case-title-split` | Large titles (not all-caps — long RU names) |
| `--text-case-intro` | Header excerpt |
| `--text-case-body` | CMS Overview body (~1–1.0625rem; not the tiny intro size) |
| `--case-media-max` | Cap tall **CMS prose** media only — **not** gallery / landing screens |
| `--case-screen-max` | Desktop screens: `min(52rem, 78vw)` absolute + relative |
| `--case-mobile-max` | Composite mockup width: `min(20rem, 34vw)` — no frame/backing on image |
| `--case-mobile-caption-max` | Caption on mobile: `44rem` (two editorial cols on lg) |

Display type is `--font-ui` (JetBrains Mono). There is no second display face.

## Chrome

Fixed overlay, same visual language as HUD (edge grid + four L-ticks), quieter, no `⟨ SYS · МОЛЕКУЛА ⟩`. Top-left: `[ МАРК ] ЛОГО` → `/`. Top-right: `CASE / NN` (1-based index from slim sort) + Index → `/portfolio`. No giant decorative “CASE”. In-content index is `text-meta` once above the title.

## Grid

`.case-grid` is 12 columns. Named zones include `.case-zone-center` (cols 4–10 on lg — Screens and Slices). Mobile: one column + pad tokens.

Hero layouts:

- **split** — video: text cols 1–5, visual 6–12
- **text** — no hero media (featured is backdrop only)

Hero media is **video only** (flat, no 3D). **`landing_screen`** is Screens index 0 (with repeater). **Featured image** is a fixed backdrop under the chrome grid. `screenshot_image` is not a hero.

**Overview (CMS content)** is its own 12-col composition, not `CaseSection` body (cols 4–12):

- label `01 / Overview` — cols 1–4
- `.case-content__body` — cols 4–10 (6 columns; no `max-width: 65ch`, not centered)
- `.case-content__facts` — cols 10–13 when any fact exists; otherwise that span stays empty (negative space)

CMS markup is styled as `.case-content__prose` (paragraphs, headings, lists, links, strong) — not a single typography utility. Hairlines sit on `h1`/`h2`/`h3` that are not the first child: controlled width with a fade-out (h3 shorter), not between every paragraph.

## Visual media blocks

Page order: Header + Hero → Overview → Screens (inner-pages) → Mobile → Slices → Footer.

Optional; missing blocks leave no reserved gap. Numbered sections count **visible** blocks only.

### Desktop screens (inner-pages)

Data: `landing_screen` (index 0) + `repeater[].repeater_field`. Section in center column (cols 4–9 / `.case-zone-center`).

| Mode | When | Layout | GSAP |
|------|------|--------|------|
| **Grid** | ≥2 screens | &lt;1024: 2-col CSS masonry; ≥1024: always 3 flex cols via `balanceCaseScreenColumns` (items[0] pinned first in col0; taller stacks prefer earlier cols / descending; then equalize; no 2-col collapse); stair on col0/col1 | rotateY 72→0, origin center, scrub `bottom+=12%`→`top 30%` |
| **Landing-only** | only `landing_screen` | one full-width card, no stair | rotateX 82→0 + translateZ −125, ease power2.out |

Stair (desktop, first card in col): `--stair-0` `clamp(7rem, 28vw, 18rem)`, `--stair-1` `clamp(3.5rem, 14vw, 9rem)`. Reset under `prefers-reduced-motion`.

Perspective desktop stage: 1000px / origin 50% 42%. Card shadow `10px 18px 36px rgba(0,0,0,0.28)`. Full intrinsic height; width via `--case-screen-max` on landing-only.

### Mobile slices

Same center column as Screens (`.case-zone-center`, cols 4–9 on lg) — not full-bleed. Breakpoint **768**. Perspective 960px / origin 50% 100%. Brick stagger `--slice-col-stagger: clamp(4rem, 15vw, 10rem)`. Scrub multi-stop rotateX 72→0 + Z + Y-lag (`--slice-scroll-lag-odd/even`).

Bottom spacing: `--slice-bottom-space` from `useCaseSliceBottomSpace` — `stagger + max(0, lastTriggerTop + 0.70·vh − scrollHeight)` (two-pass measure; no fixed `65vh` runway). Fallback CSS = stagger only. Reset under `prefers-reduced-motion`.

### Motion presets (`useCaseScrollEntry`)

- **screensGrid** — rotateY open
- **landingOnly** — rotateX + Z sheet
- **slices** — 8-stop timeline with odd/even lag

Respect `prefers-reduced-motion` (no GSAP; stair margins reset). Do not put `overflow: hidden` on the visual field (clips 3D). Without `.js-enabled`, CSS `animation-timeline: view()` fallbacks run (`inner-page-enter-*`, `portfolio-parallax-odd/even`).

### Mobile modes (filled fields must render)

| Mode | When | Source |
|------|------|--------|
| **Slices** | `screen-mobile` + image dimensions | CSS `background-position-y` cards; `block_ratio` defaults to `1/2.3` if empty |
| **Composite mockup** | `screenshot_image` present | Same slice scroll pipeline (one cell, even lag); shown even when slices exist |
| **Fallback mockup** | `screen-mobile` but no usable dimensions, and no `screenshot_image` | Full tall screen as specimen |

Do not drop filled `screen-mobile` / `screenshot_image`. Both sections may appear on the same case.

**Composite mockup (Mobile):** flat `screenshot_image` (no card frame). lg grid: mockup `--case-mobile-max` + caption spanning two `22rem` tracks (`--case-mobile-caption-max`). Body zone cols 4–12.

### Lightbox

Minimal dark overlay, technical index, close; gallery prev/next. Full source image (slices open full `screen-mobile`).

## Gotchas

- Do not put Three.js on case pages.
- `case_dark_bg_color` is a **subtle accent**, not a full-page wash. Mix with bright ink for text (`--case-accent-ink`) — raw hex is often too dark on `--wl-bg`.
- Slim index `_fields` include `title` for prev/next labels (`getCasePosition`).
- Case pages must not set `html.hero-lock`. Document scroll is on `html` only (`main.css`) — avoid `overflow-y: auto` on `body` / `#__nuxt` (double scrollbar with 3D overflow).
- Legacy mapping: `screenshot_image` = composite mockup; `screen-mobile` = slice source — do not swap.
