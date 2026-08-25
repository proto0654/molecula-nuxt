export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AtomData {
  id: string;
  element: string;
  position: Vec3;
  radius: number;
  color: number;
}

export interface BondData {
  id: string;
  fromAtomId: string;
  toAtomId: string;
}

export interface MoleculeData {
  id: string;
  atoms: AtomData[];
  bonds: BondData[];
}
