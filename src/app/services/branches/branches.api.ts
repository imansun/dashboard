// src/app/services/branches/branches.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  Branch,
  BranchesListQuery,
  BranchesListResponse,
  CreateBranchPayload,
  UpdateBranchPayload,
  UUID,
} from "./branches.types";

function toQueryParams(query?: BranchesListQuery) {
  if (!query) return undefined;

  const params: Record<string, string> = {};

  if (typeof query.offset === "number") params.offset = String(query.offset);
  if (typeof query.limit === "number") params.limit = String(query.limit);

  if (query.company_id) params.company_id = query.company_id;
  if (query.country) params.country = query.country;

  if (query.name) params.name = query.name;
  if (query.city) params.city = query.city;

  return params;
}

export const branchesApi = {
  create: (payload: CreateBranchPayload) =>
    authedHttp.post<Branch>("/api/v1/branches", payload),

  list: (query?: BranchesListQuery) =>
    authedHttp.get<BranchesListResponse>("/api/v1/branches", {
      params: toQueryParams(query),
    }),

  // ✅ GET /api/v1/branches/{id}
  getById: (id: UUID) => authedHttp.get<Branch>(`/api/v1/branches/${id}`),

  // ✅ optional alias (same endpoint) for clearer usage in UI
  getOne: (id: UUID) => authedHttp.get<Branch>(`/api/v1/branches/${id}`),

  update: (id: UUID, payload: UpdateBranchPayload) =>
    authedHttp.patch<Branch>(`/api/v1/branches/${id}`, payload),

  remove: (id: UUID) =>
    authedHttp.delete<{ message?: string }>(`/api/v1/branches/${id}`),
};
