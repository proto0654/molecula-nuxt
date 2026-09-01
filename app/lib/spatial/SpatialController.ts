import { prefersReducedMotion } from '../a11y/reducedMotion';
import { approachFramingForAtom } from '../molecular/composition/approachFraming';
import type { MoleculeController } from '../molecular/MoleculeController';
import type { NavigationState } from '../navigation/NavigationState';
import {
  atomIdForSection,
  atomIdForSpatialState,
  HOME_ITEM_ID,
  itemIdForContext,
} from './spatialAtoms';
import { spatialStateKey } from './spatialFromRoute';
import type { SpatialState } from './types';

export type SpatialApplyOptions = {
  /** Snap focus/zoom so the first paint is already in the mode pose. */
  immediate?: boolean;
};

export type SpatialControllerOptions = {
  completeHandoff?: () => void;
  /**
   * True when Navigator is already approaching this atom — leave the live
   * GSAP timeline (do not kill / rewind).
   */
  isLiveApproach?: (atomId: string | null) => boolean;
  /** Off-home atom change while already at approach: pullback → focus → approach. */
  retargetApproach?: (atomId: string) => void;
  /** Leave rest / partial approach: animated focus → zoom+fill (no route emit). */
  approachTo?: (atomId: string) => void;
  onModeChange?: (state: SpatialState) => void;
  /** After home commit/restore — arm hub blurb + USP in the hero layer. */
  onHomeActivated?: () => void;
};

/**
 * Maps spatial state onto the molecule + nav commit.
 * Does not read URLs — callers pass `SpatialState` from `spatialFromRoute`.
 */
export class SpatialController {
  private state: SpatialState = { mode: 'home' };
  private lastKey = '';
  private readonly controller: MoleculeController;
  private readonly navigationState: NavigationState;
  private readonly completeHandoff: (() => void) | undefined;
  private readonly isLiveApproach: ((atomId: string | null) => boolean) | undefined;
  private readonly retargetApproach: ((atomId: string) => void) | undefined;
  private readonly approachTo: ((atomId: string) => void) | undefined;
  private readonly onModeChange: ((state: SpatialState) => void) | undefined;
  private readonly onHomeActivated: (() => void) | undefined;

  constructor(
    controller: MoleculeController,
    navigationState: NavigationState,
    options: SpatialControllerOptions = {},
  ) {
    this.controller = controller;
    this.navigationState = navigationState;
    this.completeHandoff = options.completeHandoff;
    this.isLiveApproach = options.isLiveApproach;
    this.retargetApproach = options.retargetApproach;
    this.approachTo = options.approachTo;
    this.onModeChange = options.onModeChange;
    this.onHomeActivated = options.onHomeActivated;
  }

  get snapshot(): SpatialState {
    return this.state;
  }

  get targetAtomId(): string | null {
    return this.controller.getFocusedAtomId();
  }

  apply(state: SpatialState, options: SpatialApplyOptions = {}): void {
    const key = spatialStateKey(state);
    const prev = this.state;
    const modeChanged = prev.mode !== state.mode;
    if (key === this.lastKey && !options.immediate) {
      return;
    }

    if (!options.immediate && !prefersReducedMotion()) {
      this.maybeCueArchiveTransition(prev, state);
    }

    this.lastKey = key;
    this.state = state;

    const nextAtomId = atomIdForSpatialState(state);
    const live =
      !options.immediate &&
      state.mode !== 'home' &&
      (this.isLiveApproach?.(nextAtomId) ?? false);

    // Abort only when this apply is a new destination — never kill a live
    // Navigator approach to the same atom (route commit during the last frames).
    if (!live) {
      this.completeHandoff?.();
    }
    this.onModeChange?.(state);

    if (state.mode === 'home') {
      this.navigationState.setCommitted(HOME_ITEM_ID);
      this.controller.setMode('home');
      this.controller.restoreOverview({ immediate: options.immediate });
      this.unwindApproach(options.immediate);
      this.controller.unfreeze();
      this.onHomeActivated?.();
      return;
    }

    this.controller.setMode(state.mode);

    const prevAtomId = this.controller.getFocusedAtomId();
    const atomChanged = nextAtomId !== null && nextAtomId !== prevAtomId;
    const atApproach = this.controller.isAtApproach();
    const snap =
      options.immediate || prefersReducedMotion() || !this.approachTo;

    if (snap) {
      const atomId = atomIdForSpatialState(state);
      if (atomId) {
        this.controller.setApproachFraming(approachFramingForAtom(atomId));
      }
      this.controller.setCompositionFramingOverride(null);
      // Focus before nav commit so applyVisuals sees the route atom, not hub.
      this.focusNonHome(state);
      this.controller.holdApproach({ immediate: true });
      this.commitNonHome(state);
    } else if (live) {
      // Navigator still owns zoom/fill/orbit — do not retarget or snap.
      this.commitNonHome(state);
    } else if (atApproach && atomChanged && nextAtomId && this.retargetApproach) {
      // Defer focusAtom until after pullback — retarget owns the choreography.
      this.commitNonHome(state);
      this.retargetApproach(nextAtomId);
    } else if (atApproach && !atomChanged) {
      // Live Navigator handoff: same atom already in approach pose.
      this.commitNonHome(state);
    } else if (nextAtomId) {
      // Same verb as a rest/partial hop off-home: Navigator owns focus → approach.
      this.commitNonHome(state);
      this.approachTo(nextAtomId);
    } else {
      this.focusNonHome(state);
      this.controller.holdApproach({ immediate: true });
      this.commitNonHome(state);
    }

    this.controller.freeze();

    if (modeChanged) {
      this.controller.setAtomBlurb(null, null);
    }
  }

  /** Nav commit only — no molecule focus. */
  private commitNonHome(state: SpatialState): void {
    switch (state.mode) {
      case 'section': {
        const sectionId = state.sectionId;
        if (sectionId) {
          this.navigationState.setCommitted(
            atomIdForSection(sectionId) ? sectionId : null,
          );
        }
        break;
      }
      case 'portfolio-archive':
      case 'case': {
        this.navigationState.setCommitted(itemIdForContext('portfolio'));
        break;
      }
      case 'service-archive':
      case 'service': {
        this.navigationState.setCommitted(itemIdForContext('services'));
        break;
      }
      default:
        break;
    }
  }

  /** Molecule focus verbs for the committed non-home state. */
  private focusNonHome(state: SpatialState): void {
    switch (state.mode) {
      case 'section': {
        const sectionId = state.sectionId;
        if (sectionId) this.controller.focusSection(sectionId);
        break;
      }
      case 'portfolio-archive':
      case 'case': {
        this.controller.focusContext('portfolio');
        if (state.mode === 'case' && state.entityId) {
          this.controller.focusEntity(state.entityId);
        }
        break;
      }
      case 'service-archive':
      case 'service': {
        this.controller.focusContext('services');
        if (state.mode === 'service' && state.entityId) {
          this.controller.focusEntity(state.entityId);
        }
        break;
      }
      default:
        break;
    }
  }

  /** Home only: leave the approach pose. */
  private unwindApproach(immediate?: boolean): void {
    if (immediate) {
      this.controller.setZoomProgress(0);
      this.controller.setFillProgress(0);
      return;
    }
    this.controller.clearZoom();
    this.controller.setFillProgress(0);
  }

  private maybeCueArchiveTransition(
    prev: SpatialState,
    next: SpatialState,
  ): void {
    const portfolioHop =
      prev.context === 'portfolio' &&
      next.context === 'portfolio' &&
      ((prev.mode === 'portfolio-archive' && next.mode === 'case') ||
        (prev.mode === 'case' && next.mode === 'portfolio-archive'));
    const servicesHop =
      prev.context === 'services' &&
      next.context === 'services' &&
      ((prev.mode === 'service-archive' && next.mode === 'service') ||
        (prev.mode === 'service' && next.mode === 'service-archive'));

    if (portfolioHop || servicesHop) {
      this.controller.playArchiveTransitionCue();
    }
  }
}
