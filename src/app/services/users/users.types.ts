
// src\app\services\users\users.types.ts
export type UUID = string;

export interface User {
  id: UUID;
  email: string;
  is_active: boolean;
  company_id?: UUID | null;
  branch_id?: UUID | null;
  created_at?: string;
  updated_at?: string;
}

export interface UsersListQuery {
  company_id?: UUID;
  branch_id?: UUID;
  email?: string; // exact
  is_active?: boolean;
  offset?: number;
  limit?: number; // 1..100
}

export interface UsersListResponse {
  items: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  is_active?: boolean;
  company_id?: UUID;
  branch_id?: UUID;
}

export interface UpdateUserPayload {
  email?: string;
  is_active?: boolean;
  company_id?: UUID | null;
  branch_id?: UUID | null;
}

export interface ChangePasswordPayload {
  new_password: string;
}
