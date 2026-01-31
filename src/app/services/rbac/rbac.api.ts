// src/app/services/rbac/rbac.api.ts

import { authedHttp } from "@/app/services/authedHttp";
import type {
  ApiList,
  AssignRolePayload,
  PermissionsListResponse,
  RbacMatrixResponse,
  ReplaceRolePermissionsPayload,
  RoleAssignment,
  RoleItem,
  PermissionKey,
  UserAccessQuery,
  UserAccessResponse,
  UserPermissionOverridesQuery,
  UserPermissionOverridesResponse,
  // ✅ NEW
  ReplaceUserPermissionOverridesPayload,
  UserPermissionOverridesResponse as UserPermissionOverridesReplaceResponse,
} from "./rbac.types";

function toQueryParams(query?: Record<string, any>) {
  if (!query) return undefined;

  const params: Record<string, string> = {};
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params[k] = String(v);
  });

  return params;
}

/**
 * ✅ Clean payload for backend validation
 * - optional fields بهتره اصلاً ارسال نشن (به‌جای null/empty)
 */
function cleanScope(payload: AssignRolePayload): AssignRolePayload {
  const out: any = { role_key: payload.role_key };
  if (payload.company_id) out.company_id = payload.company_id;
  if (payload.branch_id) out.branch_id = payload.branch_id;
  return out;
}

/**
 * ✅ Clean overrides scope for backend validation
 * - company_id/branch_id only if provided
 * - always send grants/revokes arrays
 */
function cleanOverridesScope(
  payload: ReplaceUserPermissionOverridesPayload,
): ReplaceUserPermissionOverridesPayload {
  const out: any = {
    grants: payload.grants ?? [],
    revokes: payload.revokes ?? [],
  };
  if (payload.company_id) out.company_id = payload.company_id;
  if (payload.branch_id) out.branch_id = payload.branch_id;
  return out;
}

export const rbacApi = {
  listRoles: () => authedHttp.get<ApiList<RoleItem>>("/api/v1/rbac/roles"),

  listPermissions: () =>
    authedHttp.get<PermissionsListResponse>("/api/v1/rbac/permissions"),

  listUserRoles: (userId: string) =>
    authedHttp.get<ApiList<RoleAssignment>>(`/api/v1/rbac/users/${userId}/roles`),

  // ✅ effective access (roles + permissions + scope)
  getUserAccess: (userId: string, query?: UserAccessQuery) =>
    authedHttp.get<UserAccessResponse>(`/api/v1/rbac/users/${userId}/access`, {
      params: toQueryParams(query as any),
    }),

  // ✅ user permission overrides (grants + revokes) - legacy naming
  getUserPermissionOverrides: (
    userId: string,
    query?: UserPermissionOverridesQuery,
  ) =>
    authedHttp.get<UserPermissionOverridesResponse>(
      `/api/v1/rbac/users/${userId}/permissions`,
      { params: toQueryParams(query as any) },
    ),

  // ✅ NEW: get user overrides (optional scoped)
  getUserOverrides: (userId: string, query?: UserAccessQuery) =>
    authedHttp.get<UserPermissionOverridesReplaceResponse>(
      `/api/v1/rbac/users/${userId}/permissions`,
      { params: toQueryParams(query as any) },
    ),

  // ✅ NEW: replace overrides in scope
  replaceUserOverrides: (
    userId: string,
    payload: ReplaceUserPermissionOverridesPayload,
  ) =>
    authedHttp.post(
      `/api/v1/rbac/users/${userId}/permissions`,
      cleanOverridesScope(payload),
    ),

  assignUserRole: (userId: string, payload: AssignRolePayload) =>
    authedHttp.post(`/api/v1/rbac/users/${userId}/roles`, cleanScope(payload)),

  removeUserRole: (userId: string, payload: AssignRolePayload) =>
    authedHttp.deleteJson(`/api/v1/rbac/users/${userId}/roles`, cleanScope(payload)),

  getRolePermissions: (roleKey: string) =>
    authedHttp.get<PermissionKey[]>(`/api/v1/rbac/roles/${roleKey}/permissions`),

  /**
   * ✅ Replace permissions of a role (sync)
   * (همون POST /rbac/roles/{roleKey}/permissions)
   */
  replaceRolePermissions: (roleKey: string, payload: ReplaceRolePermissionsPayload) =>
    authedHttp.post(`/api/v1/rbac/roles/${roleKey}/permissions`, payload),

  /**
   * ✅ Alias (اختیاری) برای خوانایی بیشتر
   */
  syncRolePermissions: (roleKey: string, payload: ReplaceRolePermissionsPayload) =>
    authedHttp.post(`/api/v1/rbac/roles/${roleKey}/permissions`, payload),

  getMatrix: () => authedHttp.get<RbacMatrixResponse>("/api/v1/rbac/matrix"),
};
