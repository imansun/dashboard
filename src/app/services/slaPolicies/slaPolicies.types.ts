// src/app/services/slaPolicies/slaPolicies.types.ts
export type UUID = string;

export interface SlaPolicy {
  id: UUID;
  company_id: UUID;
  name: string;
  description?: string | null;
  target_first_response_minutes: number;
  target_resolution_minutes: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SlaPoliciesListQuery {
  company_id?: UUID;
  name?: string; // LIKE
  is_active?: boolean; // true | false
  offset?: number;
  limit?: number; // 1..100
}

export interface SlaPoliciesListResponse {
  items: SlaPolicy[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateSlaPolicyPayload {
  company_id: UUID;
  name: string;
  description?: string | null;
  target_first_response_minutes: number;
  target_resolution_minutes: number;
  is_active?: boolean;
}

export interface UpdateSlaPolicyPayload {
  name?: string;
  description?: string | null;
  target_first_response_minutes?: number;
  target_resolution_minutes?: number;
  is_active?: boolean;
}
