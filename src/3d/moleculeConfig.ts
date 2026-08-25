import {
  ATOM_ORBIT_PLACEMENT,
  PERIPHERAL_ATOM_IDS,
  pointOnOrbit,
  type PeripheralAtomId,
} from './moleculeOrbits';
import type { MoleculeConfig } from './types';

const CAPTION_BY_ID: Record<PeripheralAtomId, string> = {
  H1: 'About',
  H2: 'Services',
  H3: 'Work',
  H4: 'Contact',
};

function peripheralPosition(id: PeripheralAtomId): [number, number, number] {
  const placement = ATOM_ORBIT_PLACEMENT[id]!;
  return pointOnOrbit(placement.orbit, placement.theta);
}

/**
 * Hub + peripherals at equal *spherical* angles about the hub
 * (tetrahedron for 4), each on its own orbit with varied radius.
 * Captions match nav.
 */
export const moleculeConfig: MoleculeConfig = {
  atoms: [
    {
      id: 'C',
      label: 'C',
      caption: 'Home',
      position: [0, 0, 0],
      radius: 0.32,
    },
    ...PERIPHERAL_ATOM_IDS.map((id) => ({
      id,
      label: 'H' as const,
      caption: CAPTION_BY_ID[id],
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
