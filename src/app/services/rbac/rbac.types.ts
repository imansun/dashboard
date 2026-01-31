// src/app/services/rbac/rbac.types.ts

// ✅ Common primitive aliases
export type UUID = string;
export type RoleKey = string;
export type PermissionKey = string;

// ✅ Generic list response shape used by many endpoints
export interface ApiList<T> {
  items: T[];
}

export interface RoleItem {
  id: UUID;
  key: RoleKey;
  name: string;
}

// ✅ UPDATED: PermissionItem now matches backend contract in your notes
// - id/key/description are REQUIRED (no optional fields)
export interface PermissionItem {
  id: UUID;
  key: PermissionKey;
  description: string;
}

// ✅ ADDED: Explicit permissions list response (as requested)
// (You can also use ApiList<PermissionItem>, but this keeps the API contract clear)
export interface PermissionsListResponse {
  items: PermissionItem[];
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

/**
 * RBAC scope (company/branch)
 * - null => global / no restriction for that level
 */
export interface RbacScope {
  company_id: UUID | null;
  branch_id: UUID | null;
}

export interface UserAccessQuery {
  company_id?: UUID;
  branch_id?: UUID;
}

export interface UserAccessResponse {
  user_id: UUID;
  scope: RbacScope;
  roles: RoleAssignment[];
  permissions: PermissionKey[];
}

/**
 * ✅ User permission overrides
 * grants/revokes can be scoped; if no scope provided => global overrides
 */
export interface UserPermissionOverridesQuery {
  company_id?: UUID;
  branch_id?: UUID;
}

// ✅ NEW: user permission overrides (grants + revokes) - response
export interface UserPermissionOverridesResponse {
  user_id: UUID;
  scope: RbacScope;
  grants: PermissionKey[];
  revokes: PermissionKey[];
}

// ✅ NEW: replace payload for overrides
export interface ReplaceUserPermissionOverridesPayload {
  company_id?: UUID | null;
  branch_id?: UUID | null;
  grants: PermissionKey[];
  revokes: PermissionKey[];
}
