// src/app/services/branches/branches.types.ts
export type UUID = string;

export interface Branch {
  id: UUID;
  company_id: UUID;
  name: string;
  country: string; // ISO-3166-1 alpha-2
  city: string;
  timezone: string; // IANA, e.g. Asia/Baku
  created_at?: string;
  updated_at?: string;
}

export interface BranchesListQuery {
  offset?: number;
  limit?: number; // 1..100
  company_id?: UUID;
  name?: string; // LIKE
  city?: string; // LIKE
  country?: string; // exact 2-letter
}

export interface BranchesListResponse {
  items: Branch[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateBranchPayload {
  company_id: UUID;
  name: string;
  country: string;
  city: string;
  timezone: string;
}

export interface UpdateBranchPayload {
  name?: string;
  country?: string;
  city?: string;
  timezone?: string;
}
