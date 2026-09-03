import { getItemByAtomId } from '../navigation/navigationConfig';
import {
  ATOM_ORBIT_PLACEMENT,
  PERIPHERAL_ATOM_IDS,
  pointOnOrbit,
  type PeripheralAtomId,
} from './moleculeOrbits';
import type { MoleculeConfig } from './types';

function peripheralPosition(id: PeripheralAtomId): [number, number, number] {
  const placement = ATOM_ORBIT_PLACEMENT[id]!;
  return pointOnOrbit(placement.orbit, placement.theta);
}

function captionForAtom(atomId: string): string {
  return getItemByAtomId(atomId)?.label ?? '';
}

/**
 * Hub + peripherals at equal *spherical* angles about the hub
 * (tetrahedron for 4), each on its own orbit with varied radius.
 * Captions come from nav labels (WP page titles after hydrate).
 */
export const moleculeConfig: MoleculeConfig = {
  atoms: [
    {
      id: 'C',
      label: 'C',
      caption: captionForAtom('C'),
      position: [0, 0, 0],
      radius: 0.32,
    },
    ...PERIPHERAL_ATOM_IDS.map((id) => ({
      id,
      label: 'H' as const,
      caption: captionForAtom(id),
      position: peripheralPosition(id),
      radius: 0.2,
    })),
  ],
  bonds: PERIPHERAL_ATOM_IDS.map((id) => ({
    id: `C-${id}`,
    from: 'C',
    to: id,
  })),
};
