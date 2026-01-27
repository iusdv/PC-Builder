import axios from 'axios';
import type { CPU, Motherboard, RAM, GPU, Storage, PSU, Case, Build, CompatibilityCheckResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Parts API
export const partsApi = {
  getCPUs: () => api.get<CPU[]>('/parts/cpus'),
  getCPU: (id: number) => api.get<CPU>(`/parts/cpus/${id}`),
  createCPU: (cpu: Partial<CPU>) => api.post<CPU>('/parts/cpus', cpu),
  
  getMotherboards: () => api.get<Motherboard[]>('/parts/motherboards'),
  getMotherboard: (id: number) => api.get<Motherboard>(`/parts/motherboards/${id}`),
  createMotherboard: (motherboard: Partial<Motherboard>) => api.post<Motherboard>('/parts/motherboards', motherboard),
  
  getRAMs: () => api.get<RAM[]>('/parts/rams'),
  getGPUs: () => api.get<GPU[]>('/parts/gpus'),
  getStorages: () => api.get<Storage[]>('/parts/storages'),
  getPSUs: () => api.get<PSU[]>('/parts/psus'),
  getCases: () => api.get<Case[]>('/parts/cases'),
};

// Builds API
export const buildsApi = {
  getBuilds: () => api.get<Build[]>('/builds'),
  getBuild: (id: number) => api.get<Build>(`/builds/${id}`),
  getBuildByShareCode: (shareCode: string) => api.get<Build>(`/builds/share/${shareCode}`),
  createBuild: (build: Partial<Build>) => api.post<Build>('/builds', build),
  deleteBuild: (id: number) => api.delete(`/builds/${id}`),
  checkCompatibility: (id: number) => api.post<CompatibilityCheckResult>(`/builds/${id}/check-compatibility`),
};
