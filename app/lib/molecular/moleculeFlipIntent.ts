import type { EntityLightSweepDirection } from '~/composables/useMoleculeCue';

/** Set on prev/next pointerdown before the route swap. */
let pendingSweepDirection: EntityLightSweepDirection | null = null;

export function armFlipSweepDirection(
  direction: EntityLightSweepDirection,
): void {
  pendingSweepDirection = direction;
}

export function takeFlipSweepDirection(): EntityLightSweepDirection | null {
  const direction = pendingSweepDirection;
  pendingSweepDirection = null;
  return direction;
}
