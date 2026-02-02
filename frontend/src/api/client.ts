import axios from 'axios';
import type {
  CPU,
  Cooler,
  Motherboard,
  RAM,
  GPU,
  Storage,
  PSU,
  Case,
  Build,
  CompatibilityCheckResult,
  Part,
  PartCategory,
  PartSelectionItem,
  PagedResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5144/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Parts API
export const partsApi = {
  getAllParts: (params?: {
    search?: string;
    category?: PartCategory;
    manufacturer?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    includeNoImage?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get<Part[]>('/parts', { params }),

  getPart: (id: number) => api.get<Part>(`/parts/${id}`),

  getSelection: (params: {
    category: PartCategory;
    buildId?: number;
    compatibleOnly?: boolean;
    search?: string;
    manufacturer?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    pageSize?: number;
  }) => api.get<PagedResult<PartSelectionItem>>('/parts/select', { params }),

  getSelectionMeta: (params: {
    category: PartCategory;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    includeNoImage?: boolean;
  }) => api.get<{ manufacturers: string[] }>('/parts/select/meta', { params }),

  getCPUs: () => api.get<CPU[]>('/parts/cpus'),
  getCPU: (id: number) => api.get<CPU>(`/parts/cpus/${id}`),
  createCPU: (cpu: Partial<CPU>) => api.post<CPU>('/parts/cpus', cpu),
  updateCPU: (id: number, cpu: Partial<CPU>) => api.put(`/parts/cpus/${id}`, cpu),
  deleteCPU: (id: number) => api.delete(`/parts/cpus/${id}`),

  getCoolers: () => api.get<Cooler[]>('/parts/coolers'),
  getCooler: (id: number) => api.get<Cooler>(`/parts/coolers/${id}`),
  createCooler: (cooler: Partial<Cooler>) => api.post<Cooler>('/parts/coolers', cooler),
  updateCooler: (id: number, cooler: Partial<Cooler>) => api.put(`/parts/coolers/${id}`, cooler),
  deleteCooler: (id: number) => api.delete(`/parts/coolers/${id}`),
  
  getMotherboards: () => api.get<Motherboard[]>('/parts/motherboards'),
  getMotherboard: (id: number) => api.get<Motherboard>(`/parts/motherboards/${id}`),
  createMotherboard: (motherboard: Partial<Motherboard>) => api.post<Motherboard>('/parts/motherboards', motherboard),
  updateMotherboard: (id: number, motherboard: Partial<Motherboard>) => api.put(`/parts/motherboards/${id}`, motherboard),
  deleteMotherboard: (id: number) => api.delete(`/parts/motherboards/${id}`),
  
  getRAMs: () => api.get<RAM[]>('/parts/rams'),
  getRAM: (id: number) => api.get<RAM>(`/parts/rams/${id}`),
  createRAM: (ram: Partial<RAM>) => api.post<RAM>('/parts/rams', ram),
  updateRAM: (id: number, ram: Partial<RAM>) => api.put(`/parts/rams/${id}`, ram),
  deleteRAM: (id: number) => api.delete(`/parts/rams/${id}`),

  getGPUs: () => api.get<GPU[]>('/parts/gpus'),
  getGPU: (id: number) => api.get<GPU>(`/parts/gpus/${id}`),
  createGPU: (gpu: Partial<GPU>) => api.post<GPU>('/parts/gpus', gpu),
  updateGPU: (id: number, gpu: Partial<GPU>) => api.put(`/parts/gpus/${id}`, gpu),
  deleteGPU: (id: number) => api.delete(`/parts/gpus/${id}`),

  getStorages: () => api.get<Storage[]>('/parts/storages'),
  getStorage: (id: number) => api.get<Storage>(`/parts/storages/${id}`),
  createStorage: (storage: Partial<Storage>) => api.post<Storage>('/parts/storages', storage),
  updateStorage: (id: number, storage: Partial<Storage>) => api.put(`/parts/storages/${id}`, storage),
  deleteStorage: (id: number) => api.delete(`/parts/storages/${id}`),

  getPSUs: () => api.get<PSU[]>('/parts/psus'),
  getPSU: (id: number) => api.get<PSU>(`/parts/psus/${id}`),
  createPSU: (psu: Partial<PSU>) => api.post<PSU>('/parts/psus', psu),
  updatePSU: (id: number, psu: Partial<PSU>) => api.put(`/parts/psus/${id}`, psu),
  deletePSU: (id: number) => api.delete(`/parts/psus/${id}`),

  getCases: () => api.get<Case[]>('/parts/cases'),
  getCase: (id: number) => api.get<Case>(`/parts/cases/${id}`),
  createCase: (pcCase: Partial<Case>) => api.post<Case>('/parts/cases', pcCase),
  updateCase: (id: number, pcCase: Partial<Case>) => api.put(`/parts/cases/${id}`, pcCase),
  deleteCase: (id: number) => api.delete(`/parts/cases/${id}`),
};

// Builds API
export const buildsApi = {
  getBuilds: () => api.get<Build[]>('/builds'),
  getBuild: (id: number) => api.get<Build>(`/builds/${id}`),
  getBuildByShareCode: (shareCode: string) => api.get<Build>(`/builds/share/${shareCode}`),
  createBuild: (build: Partial<Build>) => api.post<Build>('/builds', build),
  updateBuild: (id: number, build: Partial<Build>) => api.put<Build>(`/builds/${id}`, build),
  deleteBuild: (id: number) => api.delete(`/builds/${id}`),
  checkCompatibility: (id: number) => api.post<CompatibilityCheckResult>(`/builds/${id}/check-compatibility`),
  selectPart: (id: number, req: { category: PartCategory; partId?: number | null }) => api.patch<Build>(`/builds/${id}/parts`, req),
};
