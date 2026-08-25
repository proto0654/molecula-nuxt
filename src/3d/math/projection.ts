import { Vector2, Vector3, type Camera, type Vector3Like } from 'three';

/**
 * Projects a world-space point into normalized device coordinates (NDC)
 * and optional pixel coordinates for the given viewport size.
 */
export function projectToScreen(
  worldPosition: Vector3Like,
  camera: Camera,
  viewport: { width: number; height: number },
): { ndc: Vector2; pixels: Vector2; visible: boolean } {
  const clip = new Vector3(
    worldPosition.x,
    worldPosition.y,
    worldPosition.z,
  ).project(camera);

  const ndc = new Vector2(clip.x, clip.y);
  const pixels = new Vector2(
    (clip.x * 0.5 + 0.5) * viewport.width,
    (-clip.y * 0.5 + 0.5) * viewport.height,
  );

  const visible =
    clip.z >= -1 &&
    clip.z <= 1 &&
    clip.x >= -1 &&
    clip.x <= 1 &&
    clip.y >= -1 &&
    clip.y <= 1;

  return { ndc, pixels, visible };
}
