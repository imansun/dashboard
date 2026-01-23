// src\app\services\users\users.api.ts
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

  if (query.company_id) params.company_id = query.company_id;
  if (query.branch_id) params.branch_id = query.branch_id;
  if (query.email) params.email = query.email;

  if (typeof query.is_active === "boolean")
    params.is_active = String(query.is_active);

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
