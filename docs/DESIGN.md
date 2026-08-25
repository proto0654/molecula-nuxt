# HUD design tokens and decorative patterns

Source of truth for the overlay look. **CSS custom properties** live in [`src/styles.css`](../src/styles.css) (`:root`). Scene hex values are duplicated in Three.js modules — keep both tables in sync when changing the palette.

Principles: the molecule is primary; HUD is secondary. No cards, no filled buttons, no dashboard chrome. Negative space in the center (grid masked out). Thin type, wide tracking, monospace.

## CSS tokens (`:root`)

| Token | Value | Use |
|-------|--------|-----|
| `--color-bg` | `#0f1115` | Page, scene clear, transition veil |
| `--color-ink` | `#d6dbe0` | Default HUD / body text |
| `--color-ink-bright` | `#f4f6f8` | Nav hover / `.is-active` |
| `--color-ink-title` | `#e8ecef` | Destination title |
| `--color-ink-white` | `#fff` | Committed nav label, return hover |
| `--ink-04` … `--ink-78` | `rgb(214 219 224 / α)` | Grid, corners, meta, idle nav |
| `--font-ui` | `ui-monospace`, Cascadia / SF Mono / Consolas | All HUD type |
| `--text-meta` | `0.625rem` | `SYS // …`, `⟨ NAV ⟩`, destination kicker |
| `--text-index` | `0.5625rem` | Nav `01`–`05` |
| `--text-nav` | `0.6875rem` | Nav labels, return control |
| `--track-meta` / `--track-mark` / `--track-nav` / `--track-title` | `0.22em`–`0.32em` | Uppercase tracking |
| `--grid-size` | `56px` (`44` tablet, `36` mobile) | HUD grid cell |
| `--corner-size` | `18px` (`12` mobile) | L-ticks |
| `--z-hud` / `--z-nav` / `--z-overlay` | `1` / `2` / `3` | Canvas → HUD → nav → veil |
| `--glyph-angle-open` / `--glyph-angle-close` | `⟨ ` / ` ⟩` | Committed nav wrap |
| `--bp-mobile-max` | `767px` | Match `main.ts` `MOBILE_MQ` |
| `--bp-tablet-min` / `--bp-tablet-max` | `768px` / `1023px` | Match `TABLET_MQ` |
| `--bp-desktop-min` | `1024px` | Full captions |

Reuse these variables for any new overlay (footer, legal, section chrome). Do not introduce filled boxes or extra borders unless a pattern below already uses a 1px tick.

## Scene tokens (Three.js)

Not CSS — hex in module constants. Background **must** equal `--color-bg`.

| Token (conceptual) | Hex | File |
|--------------------|-----|------|
| Scene / clear | `0x0f1115` | `MoleculeScene` |
| Carbon sphere | `0x2a3038` | `Atom.ts` `COLOR_BY_LABEL.C` |
| Hydrogen sphere | `0x5a636e` | `Atom.ts` `COLOR_BY_LABEL.H` |
| Caption letter | `0xd6dbe0` | `AtomLabel` `LETTER_COLOR` (same as `--color-ink`) |
| Caption remainder | `0xb8c0c8` | `AtomLabel` `REMAINDER_COLOR` |
| Caption blurb | `0x8b949e` | `AtomLabel` `BLURB_COLOR` |
| Halo rings | `0xd6dbe0` | `AtomHalo` `RING_COLOR` |
| Highlight emissive | `0x6a7a8a` @ 0.45 | `Atom.ts` |

Spheres stay darker than captions so troika type does not melt into the atom.

## Decorative patterns (copy these, do not invent new chrome)

### 1. Edge grid

- 1px lines at `--ink-04` on `--grid-size`.
- Radial **mask**: center transparent so the molecule sits in empty space; grid reads only at the edges.
- `pointer-events: none`. Markup: `.hud__grid` via [`HudFrame`](../src/ui/HudFrame.ts).

### 2. Corner ticks

- Four L-shapes: 1px `--ink-28`, only two sides each (`.hud__corner--tl` … `--br`).
- Inset so they do not collide with nav ( `--hud-inset` ).
- Not a full rectangular frame.

### 3. Meta kicker

- Uppercase, `--text-meta`, wide tracking.
- Copy shape: `SYS // MOLECULE` (system id `//` subsystem).
- Angle-bracket marks: `⟨ NAV ⟩`, `⟨ SECTION ⟩`.

### 4. Hairline rule

- Nav top: 1px gradient `transparent → --ink-28 → transparent` (`.nav::before`).
- Use instead of a box around controls.

### 5. Indexed text nav

- `01` muted index + uppercase label. Separators `·` (hidden on mobile).
- No background, no border. Hover / `.is-active` only brightens ink.
- Commit: wrap label with `⟨ … ⟩` via CSS `content` tokens — still not a button chrome.

### 6. Destination stub

- Same kicker + tracked title + `// /route` + `[ ← RETURN ]` as a text control (no fill).
- Veil is solid `--color-bg`, not a card.

### 7. Atom caption block (troika, not DOM)

- First letter centered on the camera-facing surface point; remainder to local `+X`.
- On commit, typewriter `// blurb` under the title in the **same** group.
- Screen-flat: scene-parented group, `quaternion.copy(camera.quaternion)`, scale by distance. Lift toward camera (`SURFACE_PAD`) so glyphs clear the sphere.
- Halo: 3 `LineLoop`s, pulse on hover, freeze on commit; not raycast targets.

## Copy conventions

- Nav / HUD: English uppercase labels (`HOME`, `ABOUT`, …).
- Blurbs: lowercase techno one-liners prefixed `// ` in the 3D typewriter.
- Decorative Unicode allowed: `⟨ ⟩`, `⟦ ⟧`, `·`, `//`. Avoid emoji and heavy box drawing.

## Do / do not

| Do | Do not |
|----|--------|
| Thin mono, tracking, angle brackets | Cards, shadows, filled nav pills |
| Grid + L-ticks + one hairline | Full HUD rectangles around the molecule |
| Dark spheres, light type | Light atoms that match caption color |
| Overlay `pointer-events: none` except nav / return | Capture pointer on the grid or corners |
