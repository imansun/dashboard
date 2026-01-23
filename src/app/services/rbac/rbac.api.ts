import { http } from "@/app/services/http";
import type {
  ApiList,
  AssignRolePayload,
  PermissionItem,
  RbacMatrixResponse,
  ReplaceRolePermissionsPayload,
  RoleAssignment,
  RoleItem,
  PermissionKey,
} from "./rbac.types";

export const rbacApi = {
  // ✅ roles catalog => { items: [...] }
  listRoles: () => http.get<ApiList<RoleItem>>("/api/v1/rbac/roles"),

  // ✅ permissions catalog => { items: [...] }
  listPermissions: () => http.get<ApiList<PermissionItem>>("/api/v1/rbac/permissions"),

  // ✅ user role assignments (همون قبلی)
  listUserRoles: (userId: string) =>
    http.get<RoleAssignment[]>(`/api/v1/rbac/users/${userId}/roles`),

  assignUserRole: (userId: string, payload: AssignRolePayload) =>
    http.post(`/api/v1/rbac/users/${userId}/roles`, payload),

  removeUserRole: (userId: string, payload: AssignRolePayload) =>
    http.delete(`/api/v1/rbac/users/${userId}/roles`, { data: payload }),

  // ✅ permissions of a role => طبق داک: "Role permission keys returned."
  getRolePermissions: (roleKey: string) =>
    http.get<PermissionKey[]>(`/api/v1/rbac/roles/${roleKey}/permissions`),

  replaceRolePermissions: (roleKey: string, payload: ReplaceRolePermissionsPayload) =>
    http.post(`/api/v1/rbac/roles/${roleKey}/permissions`, payload),

  // ✅ matrix => permissions_catalog
  getMatrix: () => http.get<RbacMatrixResponse>("/api/v1/rbac/matrix"),
};
