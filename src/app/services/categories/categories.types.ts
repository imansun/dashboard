// src/app/services/categories/categories.types.ts
export type UUID = string;

export type CategoryPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Category {
  id: UUID;
  company_id: UUID;
  name: string;
  description?: string | null;
  priority: CategoryPriority;
  created_at?: string;
  updated_at?: string;
}

export interface CategoriesListQuery {
  company_id?: UUID;
  name?: string; // LIKE
  priority?: CategoryPriority;
  offset?: number;
  limit?: number; // 1..100
}

export interface CategoriesListResponse {
  items: Category[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateCategoryPayload {
  company_id: UUID;
  name: string;
  description?: string | null;
  priority: CategoryPriority;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string | null;
  priority?: CategoryPriority;
}
