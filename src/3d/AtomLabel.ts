import { Group, type Camera, type Object3D, Vector3 } from 'three';
import { Text } from 'troika-three-text';

/** Idle titles stay muted so the committed atom reads as primary. */
const LETTER_COLOR_IDLE = 0x000000;
const LETTER_COLOR_ACTIVE = 0xd6dbe0;
const REMAINDER_COLOR_IDLE = 0x000000;
const REMAINDER_COLOR_ACTIVE = 0xb8c0c8;
const BLURB_COLOR = 0x8b949e;
const REMAINDER_GAP = 0.08;
const TYPE_SECONDS = 0.028;
/** Camera distance at rest framing — scale 1 here keeps the original glyph size. */
const REF_DISTANCE = 4.5;
/** Extra lift toward the camera, in letter-font units, so title + blurb clear the sphere. */
const SURFACE_PAD = 0.55;

function splitCaption(caption: string): { letter: string; rest: string } {
  const trimmed = caption.trim();
  if (trimmed.length <= 1) {
    return { letter: trimmed, rest: '' };
  }
  return { letter: trimmed[0] ?? '', rest: trimmed.slice(1) };
}

/**
 * Troika overlay pinned to an atom, parented to the scene (not the mesh).
 * Plane is copied from the camera so glyphs stay screen-flat — no perspective
 * skew. Scale tracks distance so size stays constant in pixels.
 */
export class AtomLabel {
  readonly object: Group;
  private readonly letter: Text;
  private readonly remainder: Text;
  private readonly blurb: Text;
  private radius: number;
  private readonly letterFontSize: number;
  private readonly remainderBaseFontSize: number;
  private remainderScale = 1;
  private remainderVisible = true;
  private titleActive = false;

  private fullBlurb = '';
  private typed = '';
  private typeAccum = 0;
  private typing = false;

  private readonly scratchCamera = new Vector3();
  private readonly scratchAtom = new Vector3();
  private readonly scratchNormal = new Vector3();
  private readonly scratchLabel = new Vector3();

  constructor(caption: string, radius: number, fontSize = radius * 0.7) {
    this.radius = radius;
    this.letterFontSize = fontSize;
    this.remainderBaseFontSize = fontSize * 0.92;

    const { letter, rest } = splitCaption(caption);

    this.object = new Group();
    this.object.name = 'atom-label';
    this.object.raycast = () => {};
    this.object.frustumCulled = false;

    this.letter = new Text();
    this.letter.text = letter;
    this.letter.fontSize = fontSize;
    this.letter.color = LETTER_COLOR_IDLE;
    this.letter.anchorX = 'center';
    this.letter.anchorY = 'middle';
    this.letter.raycast = () => {};
    this.letter.frustumCulled = false;
    this.letter.sync(() => this.layoutBlock());

    this.remainder = new Text();
    this.remainder.text = rest;
    this.remainder.fontSize = this.remainderBaseFontSize;
    this.remainder.color = REMAINDER_COLOR_IDLE;
    this.remainder.anchorX = 'left';
    this.remainder.anchorY = 'middle';
    this.remainder.raycast = () => {};
    this.remainder.frustumCulled = false;
    this.remainder.visible = rest.length > 0;
    this.remainder.position.x = fontSize * 0.38;
    this.remainder.sync();

    this.blurb = new Text();
    this.blurb.text = '';
    this.blurb.fontSize = fontSize * 0.38;
    this.blurb.color = BLURB_COLOR;
    this.blurb.anchorX = 'left';
    this.blurb.anchorY = 'top';
    this.blurb.maxWidth = fontSize * 14;
    this.blurb.visible = false;
    this.blurb.position.y = -fontSize * 0.72;
    this.blurb.raycast = () => {};
    this.blurb.frustumCulled = false;
    this.blurb.sync();

    this.object.add(this.letter, this.remainder, this.blurb);
  }

  /**
   * Bright title for the committed / focused atom; muted for the rest.
   */
  setTitleActive(active: boolean): void {
    if (this.titleActive === active) return;
    this.titleActive = active;
    this.letter.color = active ? LETTER_COLOR_ACTIVE : LETTER_COLOR_IDLE;
    this.remainder.color = active
      ? REMAINDER_COLOR_ACTIVE
      : REMAINDER_COLOR_IDLE;
    this.letter.sync();
    this.remainder.sync();
  }

  /** Surface radius used for camera-facing lift (hub compact layout). */
  setSurfaceRadius(radius: number): void {
    this.radius = Math.max(radius, 1e-6);
  }

  setRemainderVisible(visible: boolean): void {
    this.remainderVisible = visible;
    this.remainder.visible = visible && this.remainder.text.length > 0;
  }

  setRemainderScale(scale: number): void {
    const next = Math.max(0.5, scale);
    if (next === this.remainderScale) return;
    this.remainderScale = next;
    this.remainder.fontSize = this.remainderBaseFontSize * next;
    this.remainder.sync(() => this.layoutBlock());
  }

  /** Type `// blurb` under the title. Pass null to hide immediately. */
  setBlurb(blurb: string | null): void {
    this.setTitleActive(blurb !== null);
    this.typing = false;
    this.typeAccum = 0;
    this.typed = '';
    if (!blurb) {
      if (!this.fullBlurb && !this.blurb.visible) return;
      this.fullBlurb = '';
      this.blurb.text = '';
      this.blurb.visible = false;
      this.blurb.sync();
      return;
    }
    this.fullBlurb = `// ${blurb}`;
    this.blurb.text = '';
    this.blurb.visible = true;
    this.typing = true;
    this.blurb.sync();
  }

  tickTypewriter(delta: number): void {
    if (!this.typing) return;
    this.typeAccum += delta;
    const count = Math.min(
      this.fullBlurb.length,
      Math.floor(this.typeAccum / TYPE_SECONDS) + 1,
    );
    if (count <= this.typed.length) return;
    this.typed = this.fullBlurb.slice(0, count);
    this.blurb.text = this.typed;
    this.blurb.sync();
    if (this.typed.length >= this.fullBlurb.length) {
      this.typing = false;
    }
  }

  /**
   * Pins the block to the atom in world space. Must be parented to the scene,
   * not the atom mesh — otherwise the molecule rotation leaks into the glyphs.
   */
  update(camera: Camera, atomObject: Object3D): void {
    camera.getWorldPosition(this.scratchCamera);
    atomObject.getWorldPosition(this.scratchAtom);

    this.scratchNormal.copy(this.scratchCamera).sub(this.scratchAtom);
    if (this.scratchNormal.lengthSq() < 1e-12) return;
    this.scratchNormal.normalize();

    this.scratchLabel
      .copy(this.scratchAtom)
      .addScaledVector(
        this.scratchNormal,
        this.radius + this.letterFontSize * SURFACE_PAD,
      );

    this.object.position.copy(this.scratchLabel);
    this.object.quaternion.copy(camera.quaternion);

    const distance = this.scratchCamera.distanceTo(this.scratchLabel);
    this.object.scale.setScalar(distance / REF_DISTANCE);
  }

  dispose(): void {
    this.typing = false;
    this.letter.dispose();
    this.remainder.dispose();
    this.blurb.dispose();
  }

  private layoutBlock(): void {
    const info = this.letter.textRenderInfo;
    if (!info) return;
    const left = info.blockBounds[0];
    const right = info.blockBounds[2];
    this.remainder.position.x = right + this.letterFontSize * REMAINDER_GAP;
    this.remainder.visible =
      this.remainderVisible && this.remainder.text.length > 0;
    this.blurb.position.x = left;
    this.blurb.position.y = -this.letterFontSize * 0.72;
  }
}
