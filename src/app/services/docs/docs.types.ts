// src/app/services/docs/docs.types.ts

export type UUID = string;

export interface DocsScope {
  company_id: UUID;
  branch_id: UUID;
}

export interface DocsFolder {
  id: UUID;
  company_id: UUID;
  branch_id: UUID;
  parent_id: UUID | null;
  name: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CreateFolderRequest extends DocsScope {
  name: string;
  parent_id?: UUID | null;
}

export interface ListFoldersQuery extends DocsScope {
  parent_id?: UUID | null;
}

export interface DocsDocument {
  id: UUID;
  company_id: UUID;
  branch_id: UUID;
  folder_id: UUID;
  title: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DocsVersion {
  id: UUID;
  document_id: UUID;
  version: number;
  mime: string;
  size: number;
  original_name: string;
  storage_path: string;
  etag?: string | null;
  created_at?: string;
}

export interface DocsDocumentWithVersions {
  document: DocsDocument;
  versions: DocsVersion[];
}

export interface ListDocumentsQuery extends DocsScope {
  offset?: number;
  limit?: number;
  q?: string;
  folder_id?: UUID;

  // ✅ archive support (backend should support it)
  only_deleted?: boolean; // فقط حذف‌شده‌ها
  include_deleted?: boolean; // همراه با حذف‌شده‌ها
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface UploadDocumentRequest extends DocsScope {
  folder_id: UUID;
  title: string;
  description: string;
  file: File;
}

export interface UploadNewVersionRequest extends DocsScope {
  id: UUID; // document id
  file: File;
}
