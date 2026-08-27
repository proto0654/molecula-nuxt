# HUD design tokens and decorative patterns

Source of truth for the overlay look. **CSS custom properties** live in [`app/assets/css/main.css`](../app/assets/css/main.css) (`:root`). Scene hex values are duplicated in Three.js modules — keep both tables in sync when changing the palette.

Principles: the molecule is primary; HUD is secondary. No cards, no filled buttons, no dashboard chrome. On desktop the hero reads as a **spatial navigation system** (rail + stage), not an app chrome panel. Negative space follows the molecule; thin type, wide tracking, monospace.

## Document scroll

- Default: `html` / `body` / `#__nuxt` scroll (`overflow-y: auto`).
- Home only: `html.hero-lock` (set from [`app/pages/index.vue`](../app/pages/index.vue)) restores fullscreen `overflow: hidden` for the molecular hero.
- Portfolio / case pages must **not** set `hero-lock`.

Headless UI aliases: `--wl-bg`, `--wl-text`, `--wl-muted`, `--wl-line`, `--wl-accent` (map onto the HUD palette).

## CSS tokens (`:root`)

| Token | Value | Use |
|-------|--------|-----|
| `--color-bg` | `#14161c` | Page, scene clear, transition veil |
| `--color-ink` | `#d6dbe0` | Default HUD / body text |
| `--color-ink-bright` | `#f4f6f8` | Nav hover / `.is-active` |
| `--color-ink-title` | `#e8ecef` | Destination title |
| `--color-ink-white` | `#fff` | Committed nav label, return hover |
| `--ink-04` … `--ink-78` | `rgb(214 219 224 / α)` | Legacy alpha steps |
| `--ui-muted` | → `--ink-42` | Meta / status |
| `--ui-primary` | → `--color-ink` | Default chrome text |
| `--accent` | → `--color-ink-white` | Committed marker / signal |
| `--grid-opacity` | `0.032` | Edge grid stroke alpha |
| `--frame-opacity` | `0.28` | Corner ticks / active rail marker |
| `--line-opacity` | `0.22` | Divider, SVG connector |
| `--font-ui` | `'JetBrains Mono'`, ui-monospace fallbacks | HUD / titles / markers (self-hosted Cyrillic) |
| `--font-body` | `'Exo 2'`, system sans | Case reading text — prose, intro, captions (300 / 400) |
| `--text-meta` | `0.625rem` | `⟨ SYS · … ⟩`, header, status |
| `--text-index` | `0.5625rem` | Nav `01`–`05` |
| `--text-nav` | `0.6875rem` | Nav labels, return control |
| `--track-meta` / `--track-mark` / `--track-nav` / `--track-title` | `0.22em`–`0.32em` | Uppercase tracking |
| `--grid-size` | `56px` (`44` tablet, `36` mobile) | HUD grid cell |
| `--corner-size` | `18px` (`12` mobile) | L-ticks |
| `--sidebar-width` | `clamp(220px, 20vw, 280px)` | Desktop rail width |
| `--hud-inset-desktop` | `1.5rem` all sides — corner ticks on this frame | Frame inset ≥1024 |
| `--hud-header-inset` | frame inset + corner size + `--hud-chrome-pad` | Desktop header / rail align inside ticks |
| `--z-hud` / `--z-nav` / `--z-connector` / `--z-header` / `--z-overlay` / `--z-debug` | `1` / `2` / `2` / `2` / `3` / `10` | Inside stage/chrome: HUD → nav → veil |
| `--z-stage` / `--z-backdrop` / `--z-page` / `--z-chrome` | `0` / `1` / `2` / `4` | Canvas → persistent featured wash (+ accent overlay) → NuxtPage → molecular chrome |
| `--glyph-angle-open` / `--glyph-angle-close` | `⟨ ` / ` ⟩` | Committed nav wrap (tablet/mobile) |
| `--bp-mobile-max` | `767px` | Match `mountHeroApp` `MOBILE_MQ` |
| `--bp-tablet-min` / `--bp-tablet-max` | `768px` / `1023px` | Match `TABLET_MQ` |
| `--bp-desktop-min` | `1024px` | Desktop composition + full captions |

Reuse these variables for any new overlay. Do not introduce filled boxes or extra borders unless a pattern below already uses a 1px tick.

## Scene tokens (Three.js)

Not CSS — hex in module constants. Background **must** equal `--color-bg`.

| Token (conceptual) | Hex | File |
|--------------------|-----|------|
| Scene / clear / fog | `0x14161c` | `MoleculeScene` |
| Carbon (hub) | `0x3a4048` | `Atom.ts` `COLOR_BY_LABEL.C` |
| Hydrogen (peripheral) | `0x25292e` | `Atom.ts` `COLOR_BY_LABEL.H` |
| Caption letter (idle) | `0x000000` | Fully black non-focused title |
| Caption letter (active) | `0xd6dbe0` | Committed atom title (`--color-ink`) |
| Caption remainder (idle) | `0x000000` | Matches idle letter |
| Caption remainder (active) | `0xb8c0c8` | Committed remainder |
| Caption blurb | `0x8b949e` | `AtomLabel` `BLURB_COLOR` |
| Selection rings / ticks / cross | `0xb8c0c8` | `AtomSelectionIndicator` `RING_COLOR` (base) |
| Selection chrome (settled freeze) | `0x000000` | Lerp after approach settle; opacity unchanged |
| Selection wireframe | `0xd6dbe0` @ 0.22 | `MoleculeScene` `EdgesGeometry` shell (base); same black lerp when settled |
| Decorative orbits / nodes | black @ ~0.42 / active `#3a3e44` @ ~0.55; nodes `0x6a737c` | `DecorativeNodes` (HIGH only) |
| Highlight emissive | `0x4a525a` @ 0.1 | `Atom.ts` |
| Bonds | `0x5a636c` dashed @ 0.55 | `MoleculeScene` `LineDashedMaterial` |

Matte faceted graphite (`flatShading`, roughness ~0.94, near-zero metalness — no Fresnel / gloss). Stay darker than captions so troika type does not melt into the mesh.

## Decorative patterns (copy these, do not invent new chrome)

### 1. Edge grid

- 1px lines at `--grid-opacity` on `--grid-size`.
- Radial **mask**: center transparent so the molecule sits in empty space; grid reads only at the edges.
- Desktop **home** (`.molecular-chrome.is-home`): mask centered near ~62% X (stage bias beside the rail). Desktop **off-home** / tablet / mobile: near center (matches centered composition profiles).
- `pointer-events: none`. Markup: `.hud__grid` via [`HudFrame`](../src/ui/HudFrame.ts).

### 2. Corner ticks

- Four L-shapes: 1px `--frame-opacity`, only two sides each (`.hud__corner--tl` … `--br`).
- Inset via `--hud-inset` / `--hud-inset-desktop` (desktop uses equal edges; rail and header sit inside the frame).
- Not a full rectangular frame. No corner coordinate marks.

### 3. Site header

- [`SiteHeader`](../app/lib/hero-ui/SiteHeader.ts):
  - **Desktop (≥1024):** `[ МАРК ] ЛОГО` · slide progress track (viewport center, replaces former `⟨ SYS · МОЛЕКУЛА ⟩`) · `УЗЕЛ 04 / РАБОТЫ`. Inset from corner ticks via `--hud-header-inset`. Pointer-events none; no background blocks.
  - **Mobile (≤767):** shared 3-col grid (`--mobile-header-grid`: side · center · side) — col 1 `[ МАРК ] ЛОГО`, col 3 `МЕНЮ / NAV` (home + off-home). Off-home col 2: SiteChrome meta (`CASE / NN`, `ARCHIVE`, section label) at ~0.469rem, muted `--ink-32` / `--ink-28`. Safe-area top padding. No hamburger glyph, no card.
  - **Off-home desktop/tablet (≥768):** centered indexed route links (direct `transitionTo`); NODE hidden; SiteChrome meta stays top-right.
  - **Tablet home:** header hidden; `.hud__meta` keeps `⟨ SYS · МОЛЕКУЛА ⟩`.

### 4. Hairline rule / rail divider

- Tablet/mobile nav top: 1px gradient (`.nav::before`).
- Desktop: thin right-edge divider on the rail (`.nav::after`) at `--line-opacity`.

### 5. Indexed text nav

- `01` muted index + uppercase label.
- **Desktop (≥1024):** left vertical rail (`--sidebar-width`), column stack. Footer `УЗЕЛ nn` + `АКТИВЕН|ГОТОВ|ПРОСТОЙ` is centered under the **full** HUD frame (not the rail alone). Active via brighter text + wider tracking + thin left marker — no pills / filled rects.
- **Tablet (768–1023):** bottom bar; separators `·`. Commit wraps label with `⟨ … ⟩`.
- **Mobile (≤767):** bottom stack: slide progress (`nav__stack`, relative) + `/ NAV` + indexed labels (horizontal scroll; enlarged type ~0.94rem label / 0.81rem index; active item scrolled into view). Inset via `--nav-mobile-bottom` inside `--hud-inset-mobile-bottom`. Safe-area bottom. Tap vs scroll-drag via `attachTapGuard`. Full index opens in [`MobileNavOverlay`](../app/lib/hero-ui/MobileNavOverlay.ts). Home only — hidden off-home.
- No background, no border.

### 6. Mobile nav overlay

- Full-viewport veil (`--color-bg`), not a card. Large numbering, thin item hairlines, subtle crosshair, status strip.
- Open from MENU; close via CLOSE / ESC / backdrop / item select.
- **Home mobile:** same `selectItem` path as the rail (two-step molecule commit).
- **Off-home mobile:** direct `transitionTo` per item — no atom commit step.

### 7. SVG navigation connector

- [`NavigationConnector`](../app/lib/hero-ui/NavigationConnector.ts): elbow polyline from rail item → projected atom; tiny tip marker; stops short of the mesh.
- States: idle hidden · **hover** (distinct preview while committed) routes to preview item · **active** tracks committed · zoom fades with `zoomProgress`/`fillProgress`.
- CSS: `.is-hover` softer stroke/fill than `.is-active` (`main.css`).
- Endpoint tracks `projectAtom` 1:1. Soft distance fade when the span is extreme.
- 1px stroke; short opacity pulse on section change. No glow, no looping dash.
- Desktop-only (`≥1024`).

### 8. Destination stub

- Same kicker + tracked title + `// /route` + `[ ← НАЗАД ]` as a text control (no fill).
- Veil is solid `--color-bg`, not a card. `.transition-overlay` is `position: fixed` on `document.body` ([`routeVeil`](../app/lib/navigation/routeVeil.ts)); `.is-route-veil` sits above inner chrome (`z-index: 50`) during a real route hop.
- `prefers-reduced-motion: reduce` disables HUD/USP/nav CSS transitions and View Transition animations (`main.css`).

### 9. Atom caption block (troika, not DOM)

- First letter centered on the camera-facing surface point; remainder to local `+X`.
- Idle titles are pure black; committed and hover-preview atoms brighten letter + remainder via `setAtomTitleHighlight` (orchestrated in `applyVisuals`; blurb is separate).
- On commit, typewriter `// blurb` under the title in the **same** group.
- Screen-flat: scene-parented group, `quaternion.copy(camera.quaternion)`, scale by distance. Lift toward camera (`SURFACE_PAD`) so glyphs clear the atom.
- Selection: `AtomSelectionIndicator` — concentric billboarded `LineLoop`s + radial ticks + center cross (quality may hide extras), pulse on hover, freeze on commit; camera-quat billboard under molecule parent; not raycast targets. Settled off-home freeze lerps color to black (`setDimmed`); leave restores `RING_COLOR`.
- Wireframe: committed static shell (`setWireframeAtom`) + accent shell for hover preview / autoplay-next pulse (`setAccentWireframeAtom`); shared `EdgesGeometry` icosahedron (~1.04× radius); quality may disable both. Same settled-freeze black lerp via `MoleculeScene.setChromeDimmed`.
- Decorative ghost: one hub-centered orbit per peripheral (black idle / dark gray active) + wireframe fragments on `moleculeGroup`; HIGH only; fades with zoom/fill.

### 10. USP headline

- [`UspHeadline`](../src/ui/UspHeadline.ts): short sentence per section (`navigationConfig.usp`).
- **Desktop:** left void between rail and molecule; vertically centered (`top: 50%`); larger adaptive type (`clamp` ~1.35–2.15rem).
- **Mobile:** golden section between header bottom and molecule center (`screenY` via `--composition-screen-y`); smaller segment on top (`1/φ²`); type `clamp` ~1.45–2rem — hierarchically above troika atom captions.
- **Tablet:** top band under meta, centered.
- Appears only after focus settle; scramble via [`textScramble`](../src/ui/textScramble.ts) (~1s); uppercase tracked; muted ink while scrambling, bright when locked. Hidden measure span reserves final line breaks; scramble charset is limited to target glyphs so lines do not jump. Zoom/fill fades via `--usp-zoom-fade`.
- No card, no background, `pointer-events: none`.

## 3D vs HTML

Three.js: molecule, bonds, troika captions, billboarded selection rings, wireframe, decorative orbits/nodes, lights, composition profile (world offset from viewport fractions + approach).  
HTML/CSS/SVG: grid, corners, header, USP headline, nav rail, mobile nav overlay, screen-space SVG connector, overlay.  
Bridge: world → `projectAtom` / `projectToScreenInto` → CSS pixels. Connector never mutates Three.js objects. Composition profile never reads CSS sidebar width.

## Copy conventions

- UI language: **Russian** (`html lang="ru"`). Nav / HUD uppercase tracked labels (`ГЛАВНАЯ`, `О НАС`, …).
- Blurbs: lowercase techno one-liners (RU) prefixed `// ` in the 3D typewriter; on mobile, break onto a second line at the content ` / ` separator.
- USPs: short RU headlines in HUD space, uppercase tracked (`text-transform: uppercase`).
- Fonts: self-hosted **JetBrains Mono** — `public/fonts/JetBrainsMono-*.woff2` for CSS HUD/titles; `*.ttf` for troika (`AtomLabel`) because troika needs ttf/woff, not woff2. Case reading text: self-hosted **Exo 2** Light/Regular (`Exo2-*-*.woff2` subsets) via `--font-body`.
- Case / section titles: all-caps scramble via `SiteScrambleTitle`, armed until `!is-awaiting-pose` (and case body idle). Absolute paint layer + locked non-letters. Archive/section body fade uses `usePageContentReveal` on the same settle.
- Decorative Unicode allowed: `⟨ ⟩`, `⟦ ⟧`, `·`, `//`. Avoid emoji and heavy box drawing.

## Do / do not

| Do | Do not |
|----|--------|
| Thin mono, tracking, angle brackets | Cards, shadows, filled nav pills |
| Grid + L-ticks + hairlines + SVG elbow | Full HUD rectangles / WebGL HUD geometry |
| Dark matte faceted atoms, light type | Glossy / smooth spheres; light atoms that match caption color |
| Overlay `pointer-events: none` except nav / return | Capture pointer on the grid, corners, or connector |
| Desktop rail as light overlay | Application dashboard chrome |

Case page visual system (12-col editorial, overlay on frozen molecule): [`CASES.md`](CASES.md).
