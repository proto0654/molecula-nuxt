import { Vector2, Vector3, type Camera, type Vector3Like } from 'three';

const scratchClip = new Vector3();

/**
 * Alloc-free project into caller-owned NDC / pixel vectors.
 * Returns whether the point is inside the clip volume and NDC square.
 */
export function projectToScreenInto(
  worldPosition: Vector3Like,
  camera: Camera,
  viewport: { width: number; height: number },
  outNdc: Vector2,
  outPixels: Vector2,
): boolean {
  scratchClip.set(worldPosition.x, worldPosition.y, worldPosition.z).project(camera);
  outNdc.set(scratchClip.x, scratchClip.y);
  outPixels.set(
    (scratchClip.x * 0.5 + 0.5) * viewport.width,
    (-scratchClip.y * 0.5 + 0.5) * viewport.height,
  );

  return (
    scratchClip.z >= -1 &&
    scratchClip.z <= 1 &&
    scratchClip.x >= -1 &&
    scratchClip.x <= 1 &&
    scratchClip.y >= -1 &&
    scratchClip.y <= 1
  );
}

/**
 * Projects a world-space point into NDC and pixel coordinates.
 * Prefer `projectToScreenInto` on the render path.
 */
export function projectToScreen(
  worldPosition: Vector3Like,
  camera: Camera,
  viewport: { width: number; height: number },
): { ndc: Vector2; pixels: Vector2; visible: boolean } {
  const ndc = new Vector2();
  const pixels = new Vector2();
  const visible = projectToScreenInto(
    worldPosition,
    camera,
    viewport,
    ndc,
    pixels,
  );
  return { ndc, pixels, visible };
}
