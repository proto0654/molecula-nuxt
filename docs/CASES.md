# Case pages (editorial inspection)

Home is 3D spatial navigation. Archive and case pages are HTML/CSS documents **over** the persistent frozen molecule (transparent page background — no scrim wash). Do not remount Three.js on these routes — see [`SPATIAL.md`](SPATIAL.md). GSAP is allowed **only** for restrained ScrollTrigger entry, in-page case→case reveal, and `Navigator` route transitions. Tokens and layout: [`app/assets/css/case.css`](../app/assets/css/case.css). Content pipeline (normalize, `v-if`, absence = `null`): [`CONTENT.md`](CONTENT.md).

Principles: scientific / technical / editorial / minimal. Large type, hairlines, numbered sections, 12-col compositional grid, generous negative space, restrained accent. Not cyberpunk, not dashboard, not agency cards. Do not add decorative HUD chrome for atmosphere.

## Components

| File | Role |
|------|------|
| [`CaseShell.vue`](../app/components/case/CaseShell.vue) | Page shell; density + body-phase classes. Featured wash lives in layout [`PortfolioBackdrop`](../app/components/portfolio/PortfolioBackdrop.vue). Decorative grid/frame/logo come from the persistent HUD. |
| [`CaseHeader.vue`](../app/components/case/CaseHeader.vue) | Index, title (USP-style scramble reveal), excerpt; facts only when there is no CMS body |
| [`CaseHeroMedia.vue`](../app/components/case/CaseHeroMedia.vue) | Hero video only (flat, no 3D) |
| [`CaseVideo.vue`](../app/components/case/CaseVideo.vue) | Presentational `<video>` used **inside** the hero only |
| [`CaseSectionMarker.vue`](../app/components/case/CaseSectionMarker.vue) | Shared `NN / LABEL` marker (`editorial` rail + vertical guide, `visual` hairline, `quiet` almost clean) |
| [`CaseSection.vue`](../app/components/case/CaseSection.vue) | Numbered marker + body; `visual` full-bleed / `center` cols 4–10 / `tone` |
| [`CaseContent.vue`](../app/components/case/CaseContent.vue) | Editorial Overview: 3-col label + 6-col CMS body + optional facts |
| [`CaseFacts.vue`](../app/components/case/CaseFacts.vue) | Compact CLIENT / STACK / URL — each field only if present |
| [`CaseGallery.vue`](../app/components/case/CaseGallery.vue) | Interface: `landing_screen` + repeater (3-col / masonry) |
| [`CaseMobile.vue`](../app/components/case/CaseMobile.vue) | Composite phone mockup (`screenshot_image`) — flat image, `--case-mobile-max` width; signature beside when filled |
| [`CaseMobileSignature.vue`](../app/components/case/CaseMobileSignature.vue) | `podpis_vozle_mokapa_mobily_pravo` as its own section when slices-only (no composite mockup) |
| [`CaseSlices.vue`](../app/components/case/CaseSlices.vue) | Decomposed `screen-mobile` grid via `block_ratio` (center col, like Interface) |
| [`CaseLightbox.vue`](../app/components/case/CaseLightbox.vue) | Dark overlay, technical index, close / prev-next |
| [`ArchiveDetailNav.vue`](../app/components/archive/DetailNav.vue) | Shared NEXT footer: `case-nav` tokens. Case mode (`sectionIndex`) adds numbered marker + scroll fade; archive mode (`case-nav--archive`) aligns from column 3 on desktop. Used on `/portfolio/[slug]` and `/services/[slug]`. |

Route: [`app/pages/portfolio/[slug].vue`](../app/pages/portfolio/[slug].vue). Composition + presentation helpers live in [`app/domain/portfolio/presentation.ts`](../app/domain/portfolio/presentation.ts) (`getCaseComposition`). Scroll entry: [`useCaseScrollEntry`](../app/composables/useCaseScrollEntry.ts). Case→case reveal: [`useCasePageTransition`](../app/composables/useCasePageTransition.ts). Slice bottom runway: [`useCaseSliceBottomSpace`](../app/composables/useCaseSliceBottomSpace.ts). Lightbox: [`useCaseLightbox`](../app/composables/useCaseLightbox.ts). Title scramble reuses [`textScramble`](../app/lib/hero-ui/textScramble.ts) via [`SiteScrambleTitle`](../app/components/site/ScrambleTitle.vue). Reveal is **chained** after the molecule pose veil (`is-awaiting-pose` / [`useAwaitingPose`](../app/composables/useAwaitingPose.ts)) and, on case→case, after body phase `idle` (`revealReady`). Paint layer is absolute; non-letters stay locked so soft-wrap does not drift. Archive/section pages use [`usePageContentReveal`](../app/composables/usePageContentReveal.ts) so body fade-in starts on the same settle signal.

## Composition

Fixed order. Missing blocks are omitted — no reserved gap, no leftover divider, no skipped numbers.

Narrative (not printed on the page): INTRO → INSPECT → EXPLORE → MOBILE → CONCLUDE → NEXT.

| Narrative | Block | Marker | When |
|-----------|--------|--------|------|
| INTRO | Header ± video; featured = persistent backdrop | none | always header |
| INSPECT | Overview | `NN / OVERVIEW` | `contentHtml` |
| EXPLORE | Interface (`landing_screen` + repeater) | `NN / INTERFACE` | any screen item |
| MOBILE | Composite mockup | `NN / MOBILE` | `c.mobile` |
| MOBILE | Signature (slices-only) | `NN / MOBILE` | signature filled + slices + no mockup |
| CONCLUDE | Slices | `NN / SLICES` | valid slice layout |
| NEXT | Footer | `NN / NEXT` | always (last number) |

`getCaseComposition` assigns sequential numbers to **mounted** blocks only. Slices count only when `getCaseSliceLayout` succeeds. Featured-only cases are `01 / NEXT`.

Landing stays in Interface (not hero). Hero media is **video only**.

Recipes the layout must hold together:

| | Combination |
|---|---|
| A | header + content + gallery + mobile + slices |
| B | header + gallery |
| C | header + video + content |
| D | header + landing-only + content |
| E | header + content + mobile |
| F | header + featured image only |
| G | header + gallery + slices |

Density classes on `.case-page`: `--sparse`, `--text-hero`, `--has-slices`, `--landing-only`. First body section uses `--case-space-first` (split hero uses `--case-space-hero`) so hero + section gaps do not stack. Sparse pages give the intro viewport height and pull NEXT closer. Slices already have a scroll runway — footer gap is the section token, not a second footer token.

Marker tones: **editorial** (Overview, Next) = horizontal rail + occasional vertical guide on the label column. **visual** (Interface, Slices) = `NN / LABEL` hairline, no extra HUD on cards. **quiet** (Mobile) = index only. Card labels (`LANDING / 01`, `SCREEN / NN`) stay; do not add rails per card.

## Tokens

Set `--case-accent` from `case.accentColor` **after reveal** (`@property` interpolates). Until then the page uses the ink default. **Never** use accent as the page background (`--wl-bg` stays). Atmosphere tint on `/portfolio*` goes through the layout wash’s solid overlay (`--backdrop-accent`), not a page fill.

Accent belongs on: section marker number, metadata labels, hover/active nav, selected lines. Not on section fills or gallery cards.

| Token | Use |
|-------|------|
| `--case-accent` | Lines, ticks, hover borders |
| `--case-accent-ink` | `color-mix` of accent + bright ink — readable labels on dark bg |
| `--backdrop-accent` | Layout wash solid overlay color (PortfolioBackdrop; not page bg) |
| `--case-space-hero` / `--case-space-first` / `--case-space-section` / `--case-space-visual` / `--case-space-footer` | Vertical rhythm |
| `--case-pad-x` / `--case-pad-y` | Body inset inside corner ticks |
| `--text-case-title` / `--text-case-title-split` | Large all-caps titles (USP-style tracking) |
| `--text-case-intro` | Header excerpt / mobile caption (Exo 2 300) |
| `--text-case-body` | CMS Overview body (~1–1.0625rem; Exo 2 300) |
| `--text-case-nav-title` | Footer case titles on lg (`clamp(0.9375rem, 1.35vw, 1.1875rem)`) |
| `--case-media-max` | Cap tall **CMS prose** media only — **not** gallery / landing screens |
| `--case-screen-max` | Desktop screens: `min(52rem, 78vw)` absolute + relative |
| `--case-mobile-max` | Composite mockup width: `min(20rem, 34vw)` — no frame/backing on image |
| `--case-mobile-caption-max` | Caption on mobile: `44rem` (two editorial cols on lg) |

Display titles / markers use `--font-ui` (JetBrains Mono). Reading text (Overview prose, intro, captions) uses `--font-body` (Exo 2, weight 300; `strong` keeps the same weight, brighter ink). Prose headings (`h1`–`h4` inside `.case-content__prose`) stay Mono. Tailwind preflight strips list markers — `.case-content__prose` restores square bullets (`::before` on `ul` / `.wp-block-list` items) and decimal `ol`.

## Chrome

Fixed overlay, same visual language as HUD (edge grid + four L-ticks), quieter, no `⟨ SYS · МОЛЕКУЛА ⟩`. Shared markup: [`SiteChrome.vue`](../app/components/site/SiteChrome.vue).

| Route | Header | Active |
|-------|--------|--------|
| Home | Imperative HUD [`SiteHeader`](../app/lib/hero-ui/SiteHeader.ts) | hover / commit (not URL) |
| Archive `/portfolio` | SiteChrome | `ARCHIVE` (`aria-current="page"`) |
| Case `/portfolio/[slug]` | SiteChrome | `CASE / NN` + Index → archive (restored page) |

**Mobile off-home (≤767):** one band, shared `--mobile-header-grid` with [`SiteHeader`](../app/lib/hero-ui/SiteHeader.ts): col 1 LOGO · col 2 centered SiteChrome meta (muted) · col 3 `МЕНЮ / NAV` (overlay → direct `transitionTo`). No inline section links in the header; desktop/tablet keep centered route menu in SiteHeader + meta on the right.

Top-left: `[ МАРК ] ЛОГО` → `/`. Do not put the 5-item molecular rail on archive or case.

## Grid

`.case-grid` is 12 columns. Named zones include `.case-zone-center` (cols 4–10 on lg — Interface and Slices). Mobile: one column + pad tokens.

Hero layouts:

- **split** — video: text cols 1–5, visual 6–12
- **text** — no hero media (featured is backdrop only)

Hero media is **video only** (flat, no 3D). **`landing_screen`** is Interface index 0 (with repeater). **Featured image** drives the persistent layout wash ([`PortfolioBackdrop`](../app/components/portfolio/PortfolioBackdrop.vue) / [`usePortfolioBackdrop`](../app/composables/usePortfolioBackdrop.ts)) under the chrome grid — not a per-page remount. Case **accent** is a separate solid color overlay on that layer (`opacity ~0.18`, same vertical mask) — not `color-mix` into the image and never `--wl-bg`. `screenshot_image` is not a hero.

**Overview (CMS content)** is its own 12-col composition, not `CaseSection` body (cols 4–12):

- marker `NN / OVERVIEW` — cols 1–4 (editorial rail + vertical guide on lg)
- `.case-content__body` — cols 4–10 (6 columns; no `max-width: 65ch`, not centered)
- `.case-content__facts` — cols 10–13 when any fact exists; otherwise that span stays empty (negative space)

CMS markup is styled as `.case-content__prose` (paragraphs, headings, lists, links, strong, figcaption) — not a single typography utility. `p` / `li` / `.wp-block-paragraph` share one inherited `--text-case-body` size (WP `has-*-font-size` classes are neutralized). Paragraph gap ~`1.15em`; list items ~`0.7em`. Hairlines sit on `h1`/`h2`/`h3` that are not the first child: controlled width with a fade-out (h3 shorter), not between every paragraph.

## Visual media blocks

Page order: Header + Hero → Overview → Interface → Mobile → Signature (slices-only) → Slices → NEXT.

Optional; missing blocks leave no reserved gap. Numbered sections count **visible** blocks only.

### Desktop screens (Interface)

Data: `landing_screen` (index 0) + `repeater[].repeater_field`. Section in center column (cols 4–9 / `.case-zone-center`). Mobile masonry respects the same `--case-pad-x` page inset as other blocks — no extra breakout beyond the layout frame.

| Mode | When | Layout | GSAP |
|------|------|--------|------|
| **Grid** | ≥2 screens | &lt;1024: 2-col CSS masonry; ≥1024: always 3 flex cols via `balanceCaseScreenColumns` (items[0] pinned first in col0; taller stacks prefer earlier cols / descending; then equalize; no 2-col collapse); stair on col0/col1 | rotateY 72→0, origin center, scrub `bottom+=12%`→`top 30%` |
| **Landing-only** | only `landing_screen` | one full-width card, no stair | rotateX 82→0 + translateZ −125, ease power2.out |

Stair (desktop, first card in col): `--stair-0` `clamp(7rem, 28vw, 18rem)`, `--stair-1` `clamp(3.5rem, 14vw, 9rem)`. Reset under `prefers-reduced-motion`.

Perspective desktop stage: 1000px / origin 50% 42%. Card shadow `10px 18px 36px rgba(0,0,0,0.28)`. Full intrinsic height; width via `--case-screen-max` on landing-only.

### Mobile slices

Same center column as Interface (`.case-zone-center`, cols 4–9 on lg) — not full-bleed. Breakpoint **768**. Perspective 960px / origin 50% 100%. Brick stagger `--slice-col-stagger: clamp(4rem, 15vw, 10rem)`. Scrub multi-stop rotateX 72→0 + Z + Y-lag (`--slice-scroll-lag-odd/even`).

Bottom spacing: `--slice-bottom-space` from `useCaseSliceBottomSpace` — `stagger + max(0, lastTriggerTop + 0.70·vh − scrollHeight)` (two-pass measure; no fixed `65vh` runway). Fallback CSS = stagger only. Reset under `prefers-reduced-motion`.

### Motion hierarchy (`useCaseScrollEntry`)

| Level | Preset | Motion | Where |
|-------|--------|--------|--------|
| **1** | `fade` | opacity + translateY (play on enter) | Overview, NEXT |
| **2** | `lift` | small scale + slight rotateX | Mobile mockup |
| **3** | `screensGrid` / `landingOnly` / `slices` | existing 3D | Interface grid, landing-only, Slices only |

Do not use Level 3 on Mobile. Header title scramble is intro motion, gated on pose settle (and case body idle) — not scroll entry. Page reveal (case→case) is a separate L1 on `.case-page__body`.

Respect `prefers-reduced-motion` (no GSAP; stair margins reset). Do not put `overflow: hidden` on the visual field (clips 3D). Without `.js-enabled`, CSS `animation-timeline: view()` fallbacks run (`inner-page-enter-*`, `portfolio-parallax-odd/even`). Shared helper: [`prefersReducedMotion`](../app/lib/a11y/reducedMotion.ts) / [`useReducedMotion`](../app/composables/useReducedMotion.ts). Home Navigator zoom/fill, pointer tilt, and connector are skipped under reduced motion.

### Mobile modes (filled fields must render)

| Mode | When | Source |
|------|------|--------|
| **Slices** | `screen-mobile` + image dimensions | CSS `background-position-y` cards; `block_ratio` defaults to `1/2.3` if empty |
| **Composite mockup** | `screenshot_image` present | Level 2 lift; shown even when slices exist |
| **Fallback mockup** | `screen-mobile` but no usable dimensions, and no `screenshot_image` | Full tall screen as specimen |
| **Signature** | `podpis_vozle_mokapa_mobily_pravo` filled | Beside composite/fallback mockup; if slices-only (no mockup), own editorial section immediately before Slices |

Do not drop filled `screen-mobile` / `screenshot_image` / mobile signature. Both mockup and slices may appear on the same case.

**Composite mockup (Mobile):** flat `screenshot_image` (no card frame). lg grid: mockup `--case-mobile-max` + caption spanning two `22rem` tracks (`--case-mobile-caption-max`). Body zone cols 4–12.

### Lightbox

Minimal dark overlay, technical index, close; gallery prev/next. Full source image (slices open full `screen-mobile`).

## Archive

[`/portfolio`](../app/pages/portfolio/index.vue) is an editorial index, not a molecular scene and not agency cards. CSS: [`archive.css`](../app/assets/css/archive.css).

Numbered rows (`NN` from slim production order — same as `CASE / NN`): title, category/meta, compact specimen (`featuredImage ?? landingScreen`). Pagination `01 02 03 →` as crawlable `NuxtLink`s. Desktop 12-col; tablet compressed row; mobile stacks specimen above text. Hover: small specimen shift + title + accent line + arrow (off under reduced motion). Featured wash + accent overlay are **CSS-only** per row (`:hover` / `:focus-within` on `.archive-row__backdrop`) — no JS preview store. Landing-only rows have no wash layer.

## Footer / NEXT

Numbered editorial section. Order: **Next** + case title, **Previous** + case title (stacked, left-aligned on all breakpoints), **Index / Back to portfolio** (right column on lg; last in the stack on mobile). Desktop case titles use `--text-case-nav-title`. Muted `—` when there is no neighbour. Not a blog footer.

## Page transitions

Molecular → archive: [`Navigator`](../app/lib/navigation/Navigator.ts) zoom/fill/veil, then [`routeVeil`](../app/lib/navigation/routeVeil.ts) handoff so the overlay survives hero unmount. Archive dismisses the veil (opacity). Reduced motion skips zoom/fill (`immediate` overlay + navigate). Do not add a second veil or a WebGL scene on archive/case.

Archive → case: click commits featured URL + accent; case layout wash shows when washes-ready (immediate within portfolio). No View Transition specimen morph. Landing-only cases fade wash out if they have no featured. Case L1 body enter only. Do not morph into the video hero.

Entering `/portfolio*` from home/sections: pose settle, then ~700ms hold, then washes fade in (~1.15s). Archive↔case does not re-gate.

Case → archive: existing body L1 exit, then archive reveal; wash **stays** (sticky). [`sessionStorage`](../app/lib/navigation/archiveReturn.ts) `wl:archive-return` restores `?page=` and scroll to the row. Index / Back to portfolio use that href. No accent reveal on the archive.

Case → case: same `[slug].vue` watches the param, so Nuxt page transitions do not run. [`useCasePageTransition`](../app/composables/useCasePageTransition.ts) delays the route until body L1 exit, then reveals the new case (chrome stays). Previous payload is held so the generic `Loading…` string does not flash. New `--case-accent` is applied after reveal and interpolates. Featured wash + accent overlay crossfade via the same layout layer when the new case’s featured URL / accent differ.

Leaving `/portfolio*`: wash clears with a short opacity fade.

## Gotchas

- Do not put Three.js on case pages.
- `case_dark_bg_color` is a **subtle accent**, not a full-page wash. Use for UI chrome (`--case-accent-ink`) and a solid low-opacity overlay on the persistent featured wash (`--backdrop-accent`) — never as `--wl-bg`. Do not nest the overlay under the wash’s `0.22` opacity.
- Slim index `_fields` include `title` for prev/next labels (`getCasePosition`).
- Case pages must not set `html.hero-lock`. Document scroll is on `html` only (`main.css`) — avoid `overflow-y: auto` on `body` / `#__nuxt` (double scrollbar with 3D overflow).
- Legacy mapping: `screenshot_image` = composite mockup; `screen-mobile` = slice source — do not swap.
- Do not add mandatory ACF fields. Composition must work on existing data.
