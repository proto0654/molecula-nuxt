import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Vector3,
  type Camera,
} from 'three';

/** Matches HUD `--color-ink` / guide hairlines. */
const GUIDE_COLOR = 0xd6dbe0;
const OPACITY_V = 0.12;
const OPACITY_H = 0.09;
/** Half-extent in local XY (camera-facing plane). */
const HALF_LEN = 6;
/** Push guides further into the scene so atom meshes occlude them. */
const BEHIND = 0.42;

/**
 * Screen-aligned crosshair behind the hub atom (WebGL depth).
 * Not a pick target. Fades with zoom/fill like decorative ghost.
 */
export class CompositionGuides {
  readonly object: Group;
  private readonly materialV: LineBasicMaterial;
  private readonly materialH: LineBasicMaterial;
  private readonly scratchDir = new Vector3();
  private zoomFade = 1;

  constructor() {
    this.object = new Group();
    this.object.name = 'composition-guides';
    this.object.renderOrder = -1;

    this.materialV = new LineBasicMaterial({
      color: GUIDE_COLOR,
      transparent: true,
      opacity: OPACITY_V,
      depthTest: true,
      depthWrite: false,
    });
    this.materialH = new LineBasicMaterial({
      color: GUIDE_COLOR,
      transparent: true,
      opacity: OPACITY_H,
      depthTest: true,
      depthWrite: false,
    });

    const vert = new BufferGeometry();
    vert.setAttribute(
      'position',
      new Float32BufferAttribute([0, -HALF_LEN, 0, 0, HALF_LEN, 0], 3),
    );
    const lineV = new Line(vert, this.materialV);
    lineV.name = 'composition-guide-v';
    lineV.raycast = () => {};

    const horiz = new BufferGeometry();
    horiz.setAttribute(
      'position',
      new Float32BufferAttribute([-HALF_LEN, 0, 0, HALF_LEN, 0, 0], 3),
    );
    const lineH = new Line(horiz, this.materialH);
    lineH.name = 'composition-guide-h';
    lineH.raycast = () => {};

    this.object.add(lineV, lineH);
  }

  /**
   * Billboard at hub, pushed along view so the molecule draws in front.
   */
  update(camera: Camera, hubWorld: Vector3): void {
    this.object.position.copy(hubWorld);
    this.object.quaternion.copy(camera.quaternion);
    camera.getWorldDirection(this.scratchDir);
    this.object.position.addScaledVector(this.scratchDir, BEHIND);
  }

  setZoomFade(zoom: number, fill: number): void {
    const t = Math.max(0, Math.min(1, Math.max(zoom, fill)));
    this.zoomFade = 1 - t;
    this.materialV.opacity = OPACITY_V * this.zoomFade;
    this.materialH.opacity = OPACITY_H * this.zoomFade;
    this.object.visible = this.zoomFade > 0.02;
  }

  dispose(): void {
    for (const child of this.object.children) {
      const line = child as Line;
      line.geometry.dispose();
    }
    this.materialV.dispose();
    this.materialH.dispose();
    this.object.removeFromParent();
  }
}
