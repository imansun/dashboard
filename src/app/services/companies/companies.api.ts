// src/app/services/companies/companies.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  CompaniesListQuery,
  CompaniesListResponse,
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  UUID,
} from "./companies.types";

function toQueryParams(query?: CompaniesListQuery) {
  if (!query) return undefined;

  const params: Record<string, string> = {};

  if (typeof query.offset === "number") params.offset = String(query.offset);
  if (typeof query.limit === "number") params.limit = String(query.limit);
  if (query.name) params.name = query.name;

  return params;
}

export const companiesApi = {
  create: (payload: CreateCompanyPayload) =>
    authedHttp.post<Company>("/api/v1/companies", payload),

  list: (query?: CompaniesListQuery) =>
    authedHttp.get<CompaniesListResponse>("/api/v1/companies", {
      params: toQueryParams(query),
    }),

  // ✅ GET /api/v1/companies/{id}
  getById: (id: UUID) => authedHttp.get<Company>(`/api/v1/companies/${id}`),

  // ✅ optional alias (same endpoint) for clearer usage in UI
  getOne: (id: UUID) => authedHttp.get<Company>(`/api/v1/companies/${id}`),

  update: (id: UUID, payload: UpdateCompanyPayload) =>
    authedHttp.patch<Company>(`/api/v1/companies/${id}`, payload),

  remove: (id: UUID) =>
    authedHttp.delete<{ message?: string }>(`/api/v1/companies/${id}`),
};
