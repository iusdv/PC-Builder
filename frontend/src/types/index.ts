export const PartCategory = {
  CPU: 'CPU',
  Motherboard: 'Motherboard',
  RAM: 'RAM',
  GPU: 'GPU',
  Storage: 'Storage',
  PSU: 'PSU',
  Case: 'Case',
  Cooler: 'Cooler'
} as const;

export type PartCategory = typeof PartCategory[keyof typeof PartCategory];

export const SocketType = {
  LGA1700: 'LGA1700',
  LGA1200: 'LGA1200',
  AM5: 'AM5',
  AM4: 'AM4',
  Unknown: 'Unknown'
} as const;

export type SocketType = typeof SocketType[keyof typeof SocketType];

export const RAMType = {
  DDR4: 'DDR4',
  DDR5: 'DDR5'
} as const;

export type RAMType = typeof RAMType[keyof typeof RAMType];

export const FormFactor = {
  ATX: 'ATX',
  MicroATX: 'MicroATX',
  MiniITX: 'MiniITX',
  EATX: 'EATX'
} as const;

export type FormFactor = typeof FormFactor[keyof typeof FormFactor];

export interface Part {
  id: number;
  name: string;
  manufacturer: string;
  price: number;
  imageUrl?: string;
  category: PartCategory;
  wattage: number;
  productUrl?: string;
}

export interface CPU extends Part {
  socket: SocketType;
  coreCount: number;
  threadCount: number;
  baseClock: number;
  boostClock: number;
  integratedGraphics: boolean;
}

export interface Motherboard extends Part {
  socket: SocketType;
  chipset: string;
  formFactor: FormFactor;
  memoryType: RAMType;
  memorySlots: number;
  maxMemoryGB: number;
  pCIeSlots: number;
  m2Slots: number;
  sataSlots: number;
}

export interface Cooler extends Part {
  socket: SocketType;
  coolerType: string;
  heightMM: number;
  radiatorSizeMM?: number | null;
}

export interface RAM extends Part {
  type: RAMType;
  speedMHz: number;
  capacityGB: number;
  moduleCount: number;
  cASLatency: number;
}

export interface GPU extends Part {
  chipset: string;
  memoryGB: number;
  memoryType: string;
  coreClock: number;
  boostClock: number;
  length: number;
  slots: number;
}

export interface Storage extends Part {
  type: string;
  capacityGB: number;
  interface: string;
  readSpeedMBps?: number;
  writeSpeedMBps?: number;
}

export interface PSU extends Part {
  wattageRating: number;
  efficiency: string;
  modular: boolean;
  formFactor: FormFactor;
}

export interface Case extends Part {
  formFactor: FormFactor;
  maxGPULength: number;
  color: string;
  hasSidePanel: boolean;
}

export interface Build {
  id: number;
  name: string;
  description?: string;
  shareCode?: string;
  cpuId?: number;
  coolerId?: number;
  motherboardId?: number;
  ramId?: number;
  gpuId?: number;
  storageId?: number;
  psuId?: number;
  caseId?: number;
  cpu?: CPU;
  cooler?: Cooler;
  motherboard?: Motherboard;
  ram?: RAM;
  gpu?: GPU;
  storage?: Storage;
  psu?: PSU;
  case?: Case;
  totalPrice: number;
  totalWattage: number;
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  warnings: string[];
  errors: string[];
  notes: string[];
}

export interface PartSelectionItem {
  id: number;
  name: string;
  manufacturer: string;
  price: number;
  imageUrl?: string;
  category: PartCategory;
  specs: Record<string, string>;
  isCompatible: boolean;
  incompatibilityReasons: string[];
}
