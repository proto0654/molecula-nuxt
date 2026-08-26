export type SpatialMode =
  | 'home'
  | 'section'
  | 'portfolio-archive'
  | 'service-archive'
  | 'case'
  | 'service';

export type SpatialContext = 'portfolio' | 'services';

export type SpatialState = {
  mode: SpatialMode;
  sectionId?: string;
  context?: SpatialContext;
  entityId?: string;
};

/** Minimal route shape — Vue Router / Nuxt `path` without `baseURL`. */
export type SpatialRouteInput = {
  path: string;
};
