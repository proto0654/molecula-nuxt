import type { MoleculeData } from './types';

/** Minimal water-like layout for the base hero scene. */
export const moleculeConfig: MoleculeData = {
  id: 'water',
  atoms: [
    {
      id: 'O',
      element: 'O',
      position: { x: 0, y: 0, z: 0 },
      radius: 0.35,
      color: 0xe74c3c,
    },
    {
      id: 'H1',
      element: 'H',
      position: { x: 0.9, y: 0.55, z: 0 },
      radius: 0.22,
      color: 0xecf0f1,
    },
    {
      id: 'H2',
      element: 'H',
      position: { x: -0.9, y: 0.55, z: 0 },
      radius: 0.22,
      color: 0xecf0f1,
    },
  ],
  bonds: [
    { id: 'O-H1', fromAtomId: 'O', toAtomId: 'H1' },
    { id: 'O-H2', fromAtomId: 'O', toAtomId: 'H2' },
  ],
};
