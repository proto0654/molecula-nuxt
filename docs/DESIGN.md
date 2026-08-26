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
| `--font-ui` | `'JetBrains Mono'`, ui-monospace fallbacks | All HUD type (self-hosted Cyrillic) |
| `--text-meta` | `0.625rem` | `⟨ SYS · … ⟩`, header, status |
| `--text-index` | `0.5625rem` | Nav `01`–`05` |
| `--text-nav` | `0.6875rem` | Nav labels, return control |
| `--track-meta` / `--track-mark` / `--track-nav` / `--track-title` | `0.22em`–`0.32em` | Uppercase tracking |
| `--grid-size` | `56px` (`44` tablet, `36` mobile) | HUD grid cell |
| `--corner-size` | `18px` (`12` mobile) | L-ticks |
| `--sidebar-width` | `clamp(220px, 20vw, 280px)` | Desktop rail width |
| `--hud-inset-desktop` | `1.5rem` all sides — corner ticks on this frame | Frame inset ≥1024 |
| `--hud-header-inset` | frame inset + corner size + `--hud-chrome-pad` | Desktop header / rail align inside ticks |
| `--z-hud` / `--z-nav` / `--z-connector` / `--z-header` / `--z-overlay` / `--z-debug` | `1` / `2` / `2` / `2` / `3` / `10` | Canvas → HUD → chrome → veil |
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
| Selection rings | `0xb8c0c8` | `AtomSelectionIndicator` `RING_COLOR` |
| Selection wireframe | `0xd6dbe0` @ 0.22 | `MoleculeScene` `EdgesGeometry` shell |
| Decorative orbits / nodes | black @ ~0.42 / active `#3a3e44` @ ~0.55; nodes `0x6a737c` | `DecorativeNodes` (HIGH only) |
| Highlight emissive | `0x4a525a` @ 0.1 | `Atom.ts` |
| Bonds | `0x5a636c` dashed @ 0.55 | `MoleculeScene` `LineDashedMaterial` |

Matte faceted graphite (`flatShading`, roughness ~0.94, near-zero metalness — no Fresnel / gloss). Stay darker than captions so troika type does not melt into the mesh.

## Decorative patterns (copy these, do not invent new chrome)

### 1. Edge grid

- 1px lines at `--grid-opacity` on `--grid-size`.
- Radial **mask**: center transparent so the molecule sits in empty space; grid reads only at the edges.
- Desktop: mask centered near ~62% X (main stage). Tablet/mobile: near center, slightly high for bottom chrome.
- `pointer-events: none`. Markup: `.hud__grid` via [`HudFrame`](../src/ui/HudFrame.ts).

### 2. Corner ticks

- Four L-shapes: 1px `--frame-opacity`, only two sides each (`.hud__corner--tl` … `--br`).
- Inset via `--hud-inset` / `--hud-inset-desktop` (desktop uses equal edges; rail and header sit inside the frame).
- Not a full rectangular frame. No corner coordinate marks.

### 3. Site header

- [`SiteHeader`](../src/ui/SiteHeader.ts):
  - **Desktop (≥1024):** `[ МАРК ] ЛОГО` · `⟨ SYS · МОЛЕКУЛА ⟩` (viewport center) · `УЗЕЛ 04 / РАБОТЫ`. Inset from corner ticks via `--hud-header-inset`. Pointer-events none; no background blocks.
  - **Mobile (≤767):** ЛОГО left + text control `МЕНЮ / NAV` (toggles to `ЗАКРЫТЬ / NAV`). Safe-area top padding. No hamburger glyph, no card.
  - **Tablet:** header hidden; `.hud__meta` keeps `⟨ SYS · МОЛЕКУЛА ⟩`.

### 4. Hairline rule / rail divider

- Tablet/mobile nav top: 1px gradient (`.nav::before`).
- Desktop: thin right-edge divider on the rail (`.nav::after`) at `--line-opacity`.

### 5. Indexed text nav

- `01` muted index + uppercase label.
- **Desktop (≥1024):** left vertical rail (`--sidebar-width`), column stack. Footer `УЗЕЛ nn` + `АКТИВЕН|ГОТОВ|ПРОСТОЙ` is centered under the **full** HUD frame (not the rail alone). Active via brighter text + wider tracking + thin left marker — no pills / filled rects.
- **Tablet (768–1023):** bottom bar; separators `·`. Commit wraps label with `⟨ … ⟩`.
- **Mobile (≤767):** compact bottom rail `/ NAV` + `01 HOME · 02 ABOUT · …` (horizontal scroll; active item scrolled into view). Safe-area bottom. Tap vs scroll-drag via `attachTapGuard`. Full index opens in [`MobileNavOverlay`](../src/ui/MobileNavOverlay.ts).
- No background, no border.

### 6. Mobile nav overlay

- Full-viewport veil (`--color-bg`), not a card. Large numbering, thin item hairlines, subtle crosshair, status strip.
- Open from MENU; close via CLOSE / ESC / backdrop / item select.
- Same `selectItem` path as the rail.

### 7. SVG navigation connector

- [`NavigationConnector`](../src/ui/NavigationConnector.ts): elbow polyline from rail item → projected atom; tiny tip marker; stops short of the mesh.
- States: idle hidden · hover fade-in · active stay visible · zoom fades with `zoomProgress`/`fillProgress`.
- Endpoint tracks `projectAtom` 1:1. Soft distance fade when the span is extreme.
- 1px stroke; short opacity pulse on section change. No glow, no looping dash.
- Desktop-only (`≥1024`).

### 8. Destination stub

- Same kicker + tracked title + `// /route` + `[ ← НАЗАД ]` as a text control (no fill).
- Veil is solid `--color-bg`, not a card.

### 9. Atom caption block (troika, not DOM)

- First letter centered on the camera-facing surface point; remainder to local `+X`.
- Idle titles are pure black; committed atom brightens letter + remainder via `setTitleActive` (tied to blurb commit).
- On commit, typewriter `// blurb` under the title in the **same** group.
- Screen-flat: scene-parented group, `quaternion.copy(camera.quaternion)`, scale by distance. Lift toward camera (`SURFACE_PAD`) so glyphs clear the atom.
- Selection: `AtomSelectionIndicator` — concentric billboarded `LineLoop`s + radial ticks + center cross (quality may hide extras), pulse on hover, freeze on commit; camera-quat billboard under molecule parent; not raycast targets.
- Selected wireframe: shared `EdgesGeometry` icosahedron shell (~1.04× radius) on the **committed** atom only; quality may disable it.
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
- Font: self-hosted **JetBrains Mono** — `public/fonts/*.woff2` for CSS HUD; `*.ttf` for troika (`AtomLabel`) because troika needs ttf/woff, not woff2.
- Decorative Unicode allowed: `⟨ ⟩`, `⟦ ⟧`, `·`, `//`. Avoid emoji and heavy box drawing.

## Do / do not

| Do | Do not |
|----|--------|
| Thin mono, tracking, angle brackets | Cards, shadows, filled nav pills |
| Grid + L-ticks + hairlines + SVG elbow | Full HUD rectangles / WebGL HUD geometry |
| Dark matte faceted atoms, light type | Glossy / smooth spheres; light atoms that match caption color |
| Overlay `pointer-events: none` except nav / return | Capture pointer on the grid, corners, or connector |
| Desktop rail as light overlay | Application dashboard chrome |
