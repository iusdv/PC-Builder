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
  CaseFan,
  Build,
  CompatibilityCheckResult,
  Part,
  PartCategory,
  PartSelectionItem,
  PagedResult,
  UpgradePathRequest,
  UpgradePathResponse,
  BottleneckAnalysis,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type AuthUser = {
  id: string;
  email?: string | null;
  userName?: string | null;
  role?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  expiresInSeconds: number;
  expiresAt: string;
  userId: string;
  email?: string | null;
  userName?: string | null;
  role: string;
};

export type GamesCatalogItem = {
  igdbId: number;
  slug: string;
  name: string;
  imagePath: string;
  sourceUrl?: string | null;
  genres?: string[];
  themes?: string[];
  gameModes?: string[];
  firstReleaseDate?: string | null;
  totalRating?: number | null;
  totalRatingCount?: number | null;
};

export type GamesDetailItem = {
  igdbId: number;
  name: string;
  slug: string;
  summary?: string | null;
  storyline?: string | null;
  imagePath?: string | null;
  sourceUrl?: string | null;
  genres: string[];
  themes: string[];
  gameModes: string[];
  playerPerspectives: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  screenshots: string[];
  artworks: string[];
  websites: Array<{ category?: number | null; url: string }>;
  releaseDate?: string | null;
  totalRating?: number | null;
  totalRatingCount?: number | null;
};

let accessToken: string | null = null;

let refreshPromise: Promise<AuthResponse> | null = null;

export function setAccessToken(token: string | null | undefined) {
  accessToken = token ?? null;
  if (accessToken) {
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

async function refreshAccessTokenSingleFlight(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = authClient
      .post<AuthResponse>('/auth/refresh')
      .then((r) => r.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status as number | undefined;
    const url = (originalRequest?.url ?? '') as string;

    // Avoid infinite loops and don't refresh on auth endpoints.
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthRoute) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const refreshed = await refreshAccessTokenSingleFlight();
      setAccessToken(refreshed.accessToken);
      return api.request(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      throw refreshError;
    }
  },
);

export const authApi = {
  register: (req: { email: string; password: string; userName?: string }) =>
    authClient.post<AuthResponse>('/auth/register', req),

  login: (req: { email: string; password: string }) => authClient.post<AuthResponse>('/auth/login', req),

  logout: () => authClient.post('/auth/logout'),

  refresh: () => refreshAccessTokenSingleFlight().then((data) => ({ data } as { data: AuthResponse })),

  me: () => api.get<AuthUser>('/auth/me'),
};

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

  getCaseFans: () => api.get<CaseFan[]>('/parts/casefans'),
  getCaseFan: (id: number) => api.get<CaseFan>(`/parts/casefans/${id}`),
  createCaseFan: (caseFan: Partial<CaseFan>) => api.post<CaseFan>('/parts/casefans', caseFan),
  updateCaseFan: (id: number, caseFan: Partial<CaseFan>) => api.put(`/parts/casefans/${id}`, caseFan),
  deleteCaseFan: (id: number) => api.delete(`/parts/casefans/${id}`),
};

// Builds API
export const buildsApi = {
  getBuilds: () => api.get<Build[]>('/builds'),
  getMyBuilds: () => api.get<Build[]>('/builds/mine'),
  getBuild: (id: number) => api.get<Build>(`/builds/${id}`),
  getBuildByShareCode: (shareCode: string) => api.get<Build>(`/builds/share/${shareCode}`),
  createBuild: (build: Partial<Build>) => api.post<Build>('/builds', build),
  updateBuild: (id: number, build: Partial<Build>) => api.put<Build>(`/builds/${id}`, build),
  deleteBuild: (id: number) => api.delete(`/builds/${id}`),
  saveToAccount: (id: number) => api.post<Build>(`/builds/${id}/save`),
  checkCompatibility: (id: number) => api.post<CompatibilityCheckResult>(`/builds/${id}/check-compatibility`),
  selectPart: (id: number, req: { category: PartCategory; partId?: number | null }) => api.patch<Build>(`/builds/${id}/parts`, req),
};

export const gamesApi = {
  getCatalog: (params?: { limit?: number; offset?: number; search?: string }) =>
    api.get<GamesCatalogItem[]>('/games/catalog', { params }),
  getById: (igdbId: number) => api.get<GamesDetailItem>(`/games/${igdbId}`),
};

// Upgrade Paths API
export const upgradePathsApi = {
  getUpgradePaths: (request: UpgradePathRequest) =>
    api.post<UpgradePathResponse>('/upgrade-paths', request),
  getBottleneck: (buildId: number) =>
    api.get<BottleneckAnalysis>(`/upgrade-paths/bottleneck/${buildId}`),
};
