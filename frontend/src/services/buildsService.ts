import api from './api';
import type { Build, CreateBuildRequest, AddPartRequest, CompatibilityWarning } from '../types';

export const buildsService = {
  async getUserBuilds(): Promise<Build[]> {
    const response = await api.get<Build[]>('/builds');
    return response.data;
  },

  async getBuildById(id: number): Promise<Build> {
    const response = await api.get<Build>(`/builds/${id}`);
    return response.data;
  },

  async getBuildByShareToken(shareToken: string): Promise<Build> {
    const response = await api.get<Build>(`/builds/shared/${shareToken}`);
    return response.data;
  },

  async createBuild(data: CreateBuildRequest): Promise<Build> {
    const response = await api.post<Build>('/builds', data);
    return response.data;
  },

  async addPartToBuild(buildId: number, data: AddPartRequest): Promise<Build> {
    const response = await api.post<Build>(`/builds/${buildId}/parts`, data);
    return response.data;
  },

  async removePartFromBuild(buildId: number, partId: number): Promise<void> {
    await api.delete(`/builds/${buildId}/parts/${partId}`);
  },

  async deleteBuild(buildId: number): Promise<void> {
    await api.delete(`/builds/${buildId}`);
  },

  async checkCompatibility(buildId: number): Promise<CompatibilityWarning[]> {
    const response = await api.get<CompatibilityWarning[]>(`/builds/${buildId}/compatibility`);
    return response.data;
  }
};
