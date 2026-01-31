// src/app/services/users/users.types.ts
export type UUID = string;

export interface CompanyRef {
  id: UUID;
  name: string;
}

export interface BranchRef {
  id: UUID;
  name: string;
}

export interface UserRoleAssignment {
  role_key: string;
  company_id: UUID | null;
  branch_id: UUID | null;
}

export interface User {
  id: UUID;
  email: string;
  is_active: boolean;

  company_id: UUID | null;
  branch_id: UUID | null;

  // ✅ NEW (as API returns)
  company: CompanyRef | null;
  branch: BranchRef | null;

  // ✅ NEW (as API returns)
  roles: UserRoleAssignment[];

  created_at?: string;
  updated_at?: string;
}

/**
 * ✅ UPDATED: Users list query params (Backend filters جدید)
 * - company_id/branch_id حذف شدند (hidden backend scope may still apply, but UI/api query no longer sends them)
 * - role_key (single/csv) تبدیل شد به role_keys (multi)
 * - created/updated range filters اضافه شدند
 */
export interface UsersListQuery {
  company_name?: string;
  branch_name?: string;
  email?: string;
  is_active?: boolean | string;

  role_keys?: string[]; // ✅ multi

  created_from?: string; // ISO
  created_to?: string; // ISO
  updated_from?: string; // ISO
  updated_to?: string; // ISO

  offset?: number;
  limit?: number;
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
  company_id?: UUID | null;
  branch_id?: UUID | null;
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
