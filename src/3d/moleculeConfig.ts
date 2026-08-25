import type { MoleculeConfig } from './types';

/** Five-atom test layout (methane-like tetrahedral). Captions match nav labels. */
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
      position: [0.85, 0.85, 0.85],
      radius: 0.2,
    },
    {
      id: 'H2',
      label: 'H',
      caption: 'Services',
      position: [0.85, -0.85, -0.85],
      radius: 0.2,
    },
    {
      id: 'H3',
      label: 'H',
      caption: 'Work',
      position: [-0.85, 0.85, -0.85],
      radius: 0.2,
    },
    {
      id: 'H4',
      label: 'H',
      caption: 'Contact',
      position: [-0.85, -0.85, 0.85],
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
