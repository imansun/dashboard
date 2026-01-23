// src/app/services/categories/categories.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  CategoriesListQuery,
  CategoriesListResponse,
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  UUID,
} from "./categories.types";

function toQueryParams(query?: CategoriesListQuery) {
  if (!query) return undefined;

  const params: Record<string, string> = {};

  if (query.company_id) params.company_id = query.company_id;
  if (query.name) params.name = query.name;
  if (query.priority) params.priority = query.priority;

  if (typeof query.offset === "number") params.offset = String(query.offset);
  if (typeof query.limit === "number") params.limit = String(query.limit);

  return params;
}

export const categoriesApi = {
  create: (payload: CreateCategoryPayload) =>
    authedHttp.post<Category>("/api/v1/categories", payload),

  list: (query?: CategoriesListQuery) =>
    authedHttp.get<CategoriesListResponse>("/api/v1/categories", {
      params: toQueryParams(query),
    }),

  getById: (id: UUID) => authedHttp.get<Category>(`/api/v1/categories/${id}`),

  update: (id: UUID, payload: UpdateCategoryPayload) =>
    authedHttp.patch<Category>(`/api/v1/categories/${id}`, payload),

  remove: (id: UUID) => authedHttp.delete(`/api/v1/categories/${id}`),
};
