import { ATOM_ORBIT_PLACEMENT, MOLECULE_ORBITS, pointOnOrbit } from './moleculeOrbits';
import type { MoleculeConfig } from './types';

function peripheralPosition(
  id: keyof typeof ATOM_ORBIT_PLACEMENT,
): [number, number, number] {
  const placement = ATOM_ORBIT_PLACEMENT[id]!;
  const orbit = MOLECULE_ORBITS[placement.orbitIndex]!;
  return pointOnOrbit(orbit, placement.theta);
}

/** Five-atom curated layout. Captions match nav labels. IDs are stable. */
export const moleculeConfig: MoleculeConfig = {
  atoms: [
    {
      id: 'C',
      label: 'C',
      caption: 'Home',
      position: [0, 0, 0],
      radius: 0.32,
    },
    {
      id: 'H1',
      label: 'H',
      caption: 'About',
      position: peripheralPosition('H1'),
      radius: 0.2,
    },
    {
      id: 'H2',
      label: 'H',
      caption: 'Services',
      position: peripheralPosition('H2'),
      radius: 0.2,
    },
    {
      id: 'H3',
      label: 'H',
      caption: 'Work',
      position: peripheralPosition('H3'),
      radius: 0.2,
    },
    {
      id: 'H4',
      label: 'H',
      caption: 'Contact',
      position: peripheralPosition('H4'),
      radius: 0.2,
    },
  ],
  bonds: [
    { id: 'C-H1', from: 'C', to: 'H1' },
    { id: 'C-H2', from: 'C', to: 'H2' },
    { id: 'C-H3', from: 'C', to: 'H3' },
    { id: 'C-H4', from: 'C', to: 'H4' },
  ],
};
