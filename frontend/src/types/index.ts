export interface User {
  username: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  username: string;
  isAdmin: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface PCPart {
  id: number;
  name: string;
  category: string;
  manufacturer: string;
  price: number;
  powerConsumption: number;
  imageUrl?: string;
  specifications?: Record<string, any>;
}

export interface BuildPart {
  part: PCPart;
  quantity: number;
}

export interface Build {
  id: number;
  name: string;
  description?: string;
  shareToken: string;
  totalPrice: number;
  totalWattage: number;
  createdAt: string;
  parts: BuildPart[];
}

export interface CompatibilityWarning {
  type: string;
  message: string;
  severity: string;
}

export interface CreateBuildRequest {
  name: string;
  description?: string;
}

export interface AddPartRequest {
  pcPartId: number;
  quantity: number;
}
