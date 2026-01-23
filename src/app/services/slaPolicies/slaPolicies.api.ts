// src/app/services/slaPolicies/slaPolicies.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  CreateSlaPolicyPayload,
  SlaPolicy,
  SlaPoliciesListQuery,
  SlaPoliciesListResponse,
  UpdateSlaPolicyPayload,
  UUID,
} from "./slaPolicies.types";

function toQueryParams(query?: SlaPoliciesListQuery) {
  if (!query) return undefined;

  const params: Record<string, string> = {};

  if (query.company_id) params.company_id = query.company_id;
  if (query.name) params.name = query.name;
  if (typeof query.is_active === "boolean") params.is_active = String(query.is_active);

  if (typeof query.offset === "number") params.offset = String(query.offset);
  if (typeof query.limit === "number") params.limit = String(query.limit);

  return params;
}

export const slaPoliciesApi = {
  create: (payload: CreateSlaPolicyPayload) =>
    authedHttp.post<SlaPolicy>("/api/v1/sla-policies", payload),

  list: (query?: SlaPoliciesListQuery) =>
    authedHttp.get<SlaPoliciesListResponse>("/api/v1/sla-policies", {
      params: toQueryParams(query),
    }),

  getById: (id: UUID) =>
    authedHttp.get<SlaPolicy>(`/api/v1/sla-policies/${id}`),

  update: (id: UUID, payload: UpdateSlaPolicyPayload) =>
    authedHttp.patch<SlaPolicy>(`/api/v1/sla-policies/${id}`, payload),

  remove: (id: UUID) => authedHttp.delete(`/api/v1/sla-policies/${id}`),
};
