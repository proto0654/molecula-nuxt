export type AtomConfig = {
  id: string;
  label: string;
  position: [number, number, number];
  radius: number;
};

export type BondConfig = {
  id: string;
  from: string;
  to: string;
};

export type MoleculeConfig = {
  atoms: AtomConfig[];
  bonds: BondConfig[];
};
