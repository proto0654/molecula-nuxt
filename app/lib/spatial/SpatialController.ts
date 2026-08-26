import type { MoleculeController } from '../molecular/MoleculeController';
import type { NavigationState } from '../navigation/NavigationState';
import {
  atomIdForSection,
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
    const modeChanged = this.state.mode !== state.mode;
    if (key === this.lastKey && !options.immediate) {
      return;
    }
    this.lastKey = key;
    this.state = state;
    this.onModeChange?.(state);

    if (state.mode === 'home') {
      this.completeHandoff?.();
      this.navigationState.setCommitted(HOME_ITEM_ID);
      this.controller.setMode('home');
      this.controller.restoreOverview({ immediate: options.immediate });
      this.unwindApproach(options.immediate);
      this.controller.unfreeze();
      this.onHomeActivated?.();
      return;
    }

    this.completeHandoff?.();
    this.controller.setMode(state.mode);
    this.applyNonHomeFocus(state);
    // Live Navigator hops already sit on the approach pose — do not snap/refocus.
    if (options.immediate || !this.controller.isAtApproach()) {
      this.controller.holdApproach({ immediate: true });
    }
    this.controller.freeze();

    if (modeChanged) {
      this.controller.setAtomBlurb(null, null);
    }
  }

  private applyNonHomeFocus(state: SpatialState): void {
    switch (state.mode) {
      case 'section': {
        const sectionId = state.sectionId;
        if (sectionId) {
          this.navigationState.setCommitted(
            atomIdForSection(sectionId) ? sectionId : null,
          );
          this.controller.focusSection(sectionId);
        }
        break;
      }
      case 'portfolio-archive':
      case 'case': {
        this.navigationState.setCommitted(itemIdForContext('portfolio'));
        this.controller.focusContext('portfolio');
        if (state.mode === 'case' && state.entityId) {
          this.controller.focusEntity(state.entityId);
        }
        break;
      }
      case 'service-archive':
      case 'service': {
        this.navigationState.setCommitted(itemIdForContext('services'));
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
}
