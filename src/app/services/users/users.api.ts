// src/app/services/users/users.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  ChangePasswordPayload,
  CreateUserPayload,
  UpdateUserPayload,
  UsersListQuery,
  UsersListResponse,
  User,
  UUID,
} from "./users.types";

function toQueryParams(query?: UsersListQuery) {
  if (!query) return undefined;

  const params: Record<string, string> = {};

  if (query.company_name) params.company_name = query.company_name;
  if (query.branch_name) params.branch_name = query.branch_name;
  if (query.email) params.email = query.email;

  if (typeof query.is_active === "boolean") params.is_active = String(query.is_active);
  else if (typeof query.is_active === "string" && query.is_active.length)
    params.is_active = query.is_active;

  // ✅ roles (multi)
  if (query.role_keys?.length) params.role_keys = query.role_keys.join(",");

  // ✅ date ranges
  if (query.created_from) params.created_from = query.created_from;
  if (query.created_to) params.created_to = query.created_to;
  if (query.updated_from) params.updated_from = query.updated_from;
  if (query.updated_to) params.updated_to = query.updated_to;

  if (typeof query.offset === "number") params.offset = String(query.offset);
  if (typeof query.limit === "number") params.limit = String(query.limit);

  return params;
}

export const usersApi = {
  create: (payload: CreateUserPayload) =>
    authedHttp.post<User>("/api/v1/users", payload),

  list: (query?: UsersListQuery) =>
    authedHttp.get<UsersListResponse>("/api/v1/users", {
      params: toQueryParams(query),
    }),

  getById: (id: UUID) => authedHttp.get<User>(`/api/v1/users/${id}`),

  update: (id: UUID, payload: UpdateUserPayload) =>
    authedHttp.patch<User>(`/api/v1/users/${id}`, payload),

  remove: (id: UUID) => authedHttp.delete(`/api/v1/users/${id}`),

  changePassword: (id: UUID, payload: ChangePasswordPayload) =>
    authedHttp.post(`/api/v1/users/${id}/change-password`, payload),

  activate: (id: UUID) => authedHttp.post(`/api/v1/users/${id}/activate`),

  deactivate: (id: UUID) => authedHttp.post(`/api/v1/users/${id}/deactivate`),
};
