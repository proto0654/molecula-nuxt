# HUD design tokens and decorative patterns

Source of truth for the overlay look. **CSS custom properties** live in [`src/styles.css`](../src/styles.css) (`:root`). Scene hex values are duplicated in Three.js modules — keep both tables in sync when changing the palette.

Principles: the molecule is primary; HUD is secondary. No cards, no filled buttons, no dashboard chrome. On desktop the hero reads as a **spatial navigation system** (rail + stage), not an app chrome panel. Negative space follows the molecule; thin type, wide tracking, monospace.

## CSS tokens (`:root`)

| Token | Value | Use |
|-------|--------|-----|
| `--color-bg` | `#14161c` | Page, scene clear, transition veil |
| `--color-ink` | `#d6dbe0` | Default HUD / body text |
| `--color-ink-bright` | `#f4f6f8` | Nav hover / `.is-active` |
| `--color-ink-title` | `#e8ecef` | Destination title |
| `--color-ink-white` | `#fff` | Committed nav label, return hover |
| `--ink-04` … `--ink-78` | `rgb(214 219 224 / α)` | Legacy alpha steps |
| `--ui-muted` | → `--ink-42` | Meta / status / coords |
| `--ui-primary` | → `--color-ink` | Default chrome text |
| `--accent` | → `--color-ink-white` | Committed marker / signal |
| `--grid-opacity` | `0.045` | Edge grid stroke alpha |
| `--frame-opacity` | `0.28` | Corner ticks / active rail marker |
| `--line-opacity` | `0.22` | Divider, SVG connector |
| `--font-ui` | `ui-monospace`, Cascadia / SF Mono / Consolas | All HUD type |
| `--text-meta` | `0.625rem` | `SYS // …`, header, status |
| `--text-index` | `0.5625rem` | Nav `01`–`05` |
| `--text-nav` | `0.6875rem` | Nav labels, return control |
| `--track-meta` / `--track-mark` / `--track-nav` / `--track-title` | `0.22em`–`0.32em` | Uppercase tracking |
| `--grid-size` | `56px` (`44` tablet, `36` mobile) | HUD grid cell |
| `--corner-size` | `18px` (`12` mobile) | L-ticks |
| `--sidebar-width` | `clamp(220px, 20vw, 280px)` | Desktop rail width |
| `--hud-inset-desktop` | top / right / bottom / left — left matches other edges so the rail sits **inside** the frame | Frame inset ≥1024 |
| `--z-hud` / `--z-nav` / `--z-connector` / `--z-header` / `--z-overlay` / `--z-debug` | `1` / `2` / `2` / `2` / `3` / `10` | Canvas → HUD → chrome → veil |
| `--glyph-angle-open` / `--glyph-angle-close` | `⟨ ` / ` ⟩` | Committed nav wrap (tablet/mobile) |
| `--bp-mobile-max` | `767px` | Match `main.ts` `MOBILE_MQ` |
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
| Caption letter | `0xd6dbe0` | `AtomLabel` `LETTER_COLOR` (same as `--color-ink`) |
| Caption remainder | `0xb8c0c8` | `AtomLabel` `REMAINDER_COLOR` |
| Caption blurb | `0x8b949e` | `AtomLabel` `BLURB_COLOR` |
| Selection rings | `0xb8c0c8` | `AtomSelectionIndicator` `RING_COLOR` |
| Selection wireframe | `0xd6dbe0` @ 0.22 | `MoleculeScene` `EdgesGeometry` shell |
| Decorative orbits / node | `0x5c656e` / `0x6a737c` @ ~0.14–0.18 | `DecorativeNodes` (HIGH only) |
| Composition crosshair | `0xd6dbe0` @ ~0.09–0.12 | `CompositionGuides` (behind hub) |
| Highlight emissive | `0x4a525a` @ 0.1 | `Atom.ts` |
| Bonds | `0x5a636c` dashed @ 0.55 | `MoleculeScene` `LineDashedMaterial` |

Matte faceted graphite (`flatShading`, roughness ~0.94, near-zero metalness — no Fresnel / gloss). Stay darker than captions so troika type does not melt into the mesh.

## Decorative patterns (copy these, do not invent new chrome)

### 1. Edge grid

- 1px lines at `--grid-opacity` on `--grid-size`.
- Radial **mask**: center transparent so the molecule sits in empty space; grid reads only at the edges.
- Desktop: mask centered near ~62% X (main stage). Tablet/mobile: centered.
- `pointer-events: none`. Markup: `.hud__grid` via [`HudFrame`](../src/ui/HudFrame.ts).

### 2. Corner ticks + coords

- Four L-shapes: 1px `--frame-opacity`, only two sides each (`.hud__corner--tl` … `--br`).
- Sparse guide hairlines live in WebGL ([`CompositionGuides`](../src/3d/CompositionGuides.ts)): camera-facing cross behind hub `C`, depth-tested so the molecule draws in front. Fade with zoom/fill.
- Corner coordinate marks (`0.0` / `1.0`) — decorative only (HTML).
- Inset via `--hud-inset` / `--hud-inset-desktop` (desktop left inset is a normal edge pad so the sidebar is inside the frame).
- Not a full rectangular frame.

### 3. Desktop header

- [`DesktopHeader`](../src/ui/DesktopHeader.ts): `[ MARK ] LOGO` · `SYS // MOLECULE` · `NODE 04 / WORK`.
- Light absolute overlay; no background blocks. Hidden below 1024px (`.hud__meta` keeps `SYS // MOLECULE` on tablet/mobile).

### 4. Hairline rule / rail divider

- Tablet/mobile nav top: 1px gradient (`.nav::before`).
- Desktop: thin right-edge divider on the rail (`.nav::after`) at `--line-opacity`.

### 5. Indexed text nav

- `01` muted index + uppercase label.
- **Desktop (≥1024):** left vertical rail (`--sidebar-width`), column stack. Footer `NODE nn` + `SIGNAL ACTIVE|READY|IDLE` is centered under the **full** HUD frame (not the rail alone). Active via brighter text + thin left marker — no pills / filled rects.
- **Tablet/mobile:** bottom bar; separators `·` (hidden on mobile). Commit wraps label with `⟨ … ⟩`.
- No background, no border.

### 6. SVG navigation connector

- [`NavigationConnector`](../src/ui/NavigationConnector.ts): elbow polyline from rail item → projected atom; tiny tip marker; stops short of the mesh.
- States: idle hidden · hover fade-in · active stay visible · zoom fades with `zoomProgress`/`fillProgress`.
- Endpoint tracks `projectAtom` 1:1. Soft distance fade when the span is extreme.
- 1px stroke; short opacity pulse on section change. No glow, no looping dash.

### 7. Destination stub

- Same kicker + tracked title + `// /route` + `[ ← RETURN ]` as a text control (no fill).
- Veil is solid `--color-bg`, not a card.

### 8. Atom caption block (troika, not DOM)

- First letter centered on the camera-facing surface point; remainder to local `+X`.
- On commit, typewriter `// blurb` under the title in the **same** group.
- Screen-flat: scene-parented group, `quaternion.copy(camera.quaternion)`, scale by distance. Lift toward camera (`SURFACE_PAD`) so glyphs clear the atom.
- Selection: `AtomSelectionIndicator` — concentric `LineLoop`s + radial ticks + center cross (quality may hide extras), pulse on hover, freeze on commit; not raycast targets.
- Selected wireframe: shared `EdgesGeometry` icosahedron shell (~1.04× radius) on the **committed** atom only; quality may disable it.
- Decorative ghost: orbital rings that peripheral atoms sit on + tiny wireframe node on `moleculeGroup`; HIGH only; fades with zoom/fill.

## 3D vs HTML

Three.js: molecule, bonds, troika captions, selection indicator, wireframe, decorative ghost, composition crosshair (behind hub), lights, composition bias (world offset from viewport fraction).  
HTML/CSS/SVG: grid, corners, header, nav rail, SVG connector, overlay.  
Bridge: world → `projectAtom` / `projectToScreenInto` → CSS pixels. Connector never mutates Three.js objects. Composition bias never reads CSS sidebar width.

## Copy conventions

- Nav / HUD: English uppercase labels (`HOME`, `ABOUT`, …).
- Blurbs: lowercase techno one-liners prefixed `// ` in the 3D typewriter.
- Decorative Unicode allowed: `⟨ ⟩`, `⟦ ⟧`, `·`, `//`. Avoid emoji and heavy box drawing.

## Do / do not

| Do | Do not |
|----|--------|
| Thin mono, tracking, angle brackets | Cards, shadows, filled nav pills |
| Grid + L-ticks + hairlines + SVG elbow | Full HUD rectangles / WebGL HUD geometry |
| Dark matte faceted atoms, light type | Glossy / smooth spheres; light atoms that match caption color |
| Overlay `pointer-events: none` except nav / return | Capture pointer on the grid, corners, or connector |
| Desktop rail as light overlay | Application dashboard chrome |
