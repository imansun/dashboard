export type UUID = string;
export type RoleKey = string;
export type PermissionKey = string;

export interface ApiList<T> {
  items: T[];
}

export interface RoleItem {
  id: UUID;
  key: RoleKey;
  name: string;
}

export interface PermissionItem {
  id?: UUID;
  key: PermissionKey;
  description?: string;
}

export interface RoleWithPermissions {
  key: RoleKey;
  name: string;
  permissions: PermissionKey[];
}

export interface RbacMatrixResponse {
  roles: RoleWithPermissions[];
  permissions_catalog: PermissionItem[];
}

export interface RoleAssignment {
  role_key: RoleKey;
  company_id?: UUID | null;
  branch_id?: UUID | null;
  created_at?: string;
}

export interface AssignRolePayload {
  role_key: RoleKey;
  company_id?: UUID | null;
  branch_id?: UUID | null;
}

export interface ReplaceRolePermissionsPayload {
  permissions: PermissionKey[];
}
