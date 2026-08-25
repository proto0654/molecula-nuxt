import { type Object3D, type Vector3Like } from 'three';
import { Text } from 'troika-three-text';

export class AtomLabel {
  readonly text: Text;

  constructor(content: string, position: Vector3Like, fontSize = 0.28) {
    this.text = new Text();
    this.text.text = content;
    this.text.fontSize = fontSize;
    this.text.color = 0xd6dbe0;
    this.text.anchorX = 'center';
    this.text.anchorY = 'middle';
    this.text.position.set(position.x, position.y + 0.55, position.z);
    this.text.sync();
  }

  get object(): Object3D {
    return this.text;
  }

  dispose(): void {
    this.text.dispose();
  }
}
