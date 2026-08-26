import { spatialFromRoute, type SpatialState } from '~/lib/spatial';

/** Single reactive spatial state derived from the Nuxt route. */
export function useSpatialState() {
  const route = useRoute();
  return computed<SpatialState>(() => spatialFromRoute({ path: route.path }));
}
