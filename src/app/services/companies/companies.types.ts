// src\app\services\companies\companies.types.ts
export type UUID = string;

export interface Company {
  id: UUID;
  name: string;
  code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompaniesListQuery {
  name?: string; // LIKE
  offset?: number;
  limit?: number; // 1..100
}

export interface CompaniesListResponse {
  items: Company[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateCompanyPayload {
  name: string;
  code?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  code?: string | null;
}
