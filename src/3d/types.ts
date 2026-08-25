export type AtomConfig = {
  id: string;
  /** Chemical symbol used for sphere color (`COLOR_BY_LABEL`). */
  label: string;
  /** Section word drawn on the atom (first letter sits where `label` used to). */
  caption?: string;
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
