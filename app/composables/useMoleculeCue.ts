import type { InjectionKey } from 'vue';

export type EntityLightSweepDirection = 1 | -1;

export type MoleculeCueApi = {
  playEntityLightSweep: (direction?: EntityLightSweepDirection) => void;
};

export const MOLECULE_CUE_KEY = Symbol('moleculeCue') as InjectionKey<MoleculeCueApi>;

/** Module bridge — pages are layout siblings of MolecularHero, not inject descendants. */
let cueApi: MoleculeCueApi | null = null;

export function registerMoleculeCue(api: MoleculeCueApi | null): void {
  cueApi = api;
}

export function playEntityLightSweep(
  direction: EntityLightSweepDirection = 1,
): void {
  cueApi?.playEntityLightSweep(direction);
}

export function provideMoleculeCue(api: MoleculeCueApi): void {
  provide(MOLECULE_CUE_KEY, api);
  registerMoleculeCue(api);
}

export function useMoleculeCue(): MoleculeCueApi | null {
  return inject(MOLECULE_CUE_KEY, cueApi);
}
