import type { RouteLocationRaw } from 'vue-router';

export type TransitionToOptions = {
  /** Skip molecular zoom choreography (foundation only). */
  immediate?: boolean;
  replace?: boolean;
  external?: boolean;
};

export type TransitionHandler = (
  route: RouteLocationRaw,
  options?: TransitionToOptions,
) => void | Promise<void>;

let handler: TransitionHandler | null = null;

/**
 * Register the active navigation backend (usually Nuxt `navigateTo`).
 * Call from Vue setup / MolecularHero mount.
 */
export function setTransitionHandler(next: TransitionHandler | null): void {
  handler = next;
}

/**
 * Foundation API for molecular → route transitions.
 * Full zoom choreography stays in Navigator; this owns the route hop.
 */
export async function transitionTo(
  route: RouteLocationRaw,
  options: TransitionToOptions = {},
): Promise<void> {
  if (handler) {
    await handler(route, options);
    return;
  }
  // Fallback when no Vue handler registered (should be rare).
  if (typeof window !== 'undefined') {
    const path = typeof route === 'string' ? route : 'path' in route && route.path ? route.path : '/';
    if (options.replace) {
      window.location.replace(path);
    } else {
      window.location.assign(path);
    }
  }
}

export const TransitionController = {
  transitionTo,
  setHandler: setTransitionHandler,
};
