import {
  type Camera,
  type Object3D,
  Vector3,
} from 'three';
import { Text } from 'troika-three-text';

/**
 * Camera-facing troika text on an atom sphere surface.
 * Must be parented under the atom mesh; call `update(camera)` each frame
 * after the atom's `matrixWorld` is current.
 */
export class AtomLabel {
  readonly text: Text;
  private readonly radius: number;

  private readonly scratchCamera = new Vector3();
  private readonly scratchAtom = new Vector3();
  private readonly scratchNormal = new Vector3();
  private readonly scratchLabel = new Vector3();

  constructor(content: string, radius: number, fontSize = radius * 0.7) {
    this.radius = radius;

    this.text = new Text();
    this.text.text = content;
    this.text.fontSize = fontSize;
    this.text.color = 0xd6dbe0;
    this.text.anchorX = 'center';
    this.text.anchorY = 'middle';
    this.text.sync();
  }

  get object(): Object3D {
    return this.text;
  }

  /**
   * Places the label on the sphere surface toward the camera and billboards it.
   * Expects parent (atom mesh) `matrixWorld` to already be up to date.
   */
  update(camera: Camera): void {
    const parent = this.text.parent;
    if (!parent) return;

    camera.getWorldPosition(this.scratchCamera);
    parent.getWorldPosition(this.scratchAtom);

    this.scratchNormal
      .copy(this.scratchCamera)
      .sub(this.scratchAtom);

    if (this.scratchNormal.lengthSq() < 1e-12) return;
    this.scratchNormal.normalize();

    this.scratchLabel
      .copy(this.scratchAtom)
      .addScaledVector(this.scratchNormal, this.radius);

    parent.worldToLocal(this.scratchLabel);
    this.text.position.copy(this.scratchLabel);
    this.text.lookAt(this.scratchCamera);
  }

  dispose(): void {
    this.text.dispose();
  }
}
