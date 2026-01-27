import api from './api';
import type { PCPart } from '../types';

export const partsService = {
  async getAllParts(): Promise<PCPart[]> {
    const response = await api.get<PCPart[]>('/parts');
    return response.data;
  },

  async getPartsByCategory(category: string): Promise<PCPart[]> {
    const response = await api.get<PCPart[]>(`/parts/category/${category}`);
    return response.data;
  },

  async getPartById(id: number): Promise<PCPart> {
    const response = await api.get<PCPart>(`/parts/${id}`);
    return response.data;
  },

  async createPart(part: Omit<PCPart, 'id'>): Promise<PCPart> {
    const response = await api.post<PCPart>('/parts', part);
    return response.data;
  },

  async updatePart(id: number, part: Omit<PCPart, 'id'>): Promise<PCPart> {
    const response = await api.put<PCPart>(`/parts/${id}`, part);
    return response.data;
  },

  async deletePart(id: number): Promise<void> {
    await api.delete(`/parts/${id}`);
  }
};
