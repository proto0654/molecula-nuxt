import {
  Raycaster,
  Vector2,
  type Camera,
  type Mesh,
  type Object3D,
} from 'three';

export type AtomHoverListener = (atomId: string | null) => void;

/**
 * Pointer → NDC → Raycaster → atom mesh → atomId.
 * Raycasts only when marked dirty (pointer moved or orientation changed).
 */
export class AtomHover {
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly scratchPickNdc = new Vector2();
  private readonly listeners = new Set<AtomHoverListener>();

  private hoveredAtomId: string | null = null;
  private dirty = false;

  /** Normalized device coords from the latest pointer sample. */
  setPointerNdc(x: number, y: number): void {
    this.ndc.set(x, y);
    this.dirty = true;
  }

  /** Mark for a fresh pick (e.g. molecule orientation changed under a still pointer). */
  markDirty(): void {
    this.dirty = true;
  }

  getHoveredAtomId(): string | null {
    return this.hoveredAtomId;
  }

  /**
   * Subscribe to hover enter/leave. Fires with the new atom id, or `null` on leave.
   * Returns an unsubscribe function.
   */
  onAtomHover(listener: AtomHoverListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * One-shot pick at NDC (e.g. click). Does not change hover dirty/hover state.
   * Pass only atom meshes; world matrices must be current.
   */
  pickAt(
    ndcX: number,
    ndcY: number,
    camera: Camera,
    atomMeshes: readonly Object3D[],
  ): string | null {
    this.raycaster.setFromCamera(this.scratchPickNdc.set(ndcX, ndcY), camera);
    const hits = this.raycaster.intersectObjects(atomMeshes as Object3D[], false);
    if (hits.length === 0) return null;
    const id = (hits[0].object as Mesh).userData.atomId;
    return typeof id === 'string' ? id : null;
  }

  /**
   * Runs at most once per call when dirty. Pass only atom meshes (never bonds).
   * Call after world matrices for those meshes are up to date.
   */
  update(camera: Camera, atomMeshes: readonly Object3D[]): void {
    if (!this.dirty) return;
    this.dirty = false;

    this.raycaster.setFromCamera(this.ndc, camera);
    const hits = this.raycaster.intersectObjects(atomMeshes as Object3D[], false);

    let nextId: string | null = null;
    if (hits.length > 0) {
      const mesh = hits[0].object as Mesh;
      const id = mesh.userData.atomId;
      if (typeof id === 'string') {
        nextId = id;
      }
    }

    this.setHoveredAtomId(nextId);
  }

  /** Clear hover state (e.g. pointer left the window). */
  clear(): void {
    this.dirty = false;
    this.setHoveredAtomId(null);
  }

  private setHoveredAtomId(atomId: string | null): void {
    if (atomId === this.hoveredAtomId) return;
    this.hoveredAtomId = atomId;
    for (const listener of this.listeners) {
      listener(atomId);
    }
  }
}
