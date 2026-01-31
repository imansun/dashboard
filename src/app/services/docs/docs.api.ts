// src/app/services/docs/docs.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  CreateFolderRequest,
  DocsDocumentWithVersions,
  DocsFolder,
  DocsScope,
  ListDocumentsQuery,
  ListFoldersQuery,
  ListResponse,
  UploadDocumentRequest,
  UploadNewVersionRequest,
  DocsDocument,
} from "./docs.types";

function toFormData(input: Record<string, any>) {
  const fd = new FormData();

  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;

    if (v instanceof File) {
      fd.append(k, v);
      continue;
    }

    fd.append(k, String(v));
  }

  return fd;
}

export const docsApi = {
  // -------------------------
  // Folders
  // -------------------------
  createFolder: (payload: CreateFolderRequest) =>
    authedHttp.post<DocsFolder>("/api/v1/docs/folders", payload),

  listFolders: (query: ListFoldersQuery) =>
    authedHttp.get<DocsFolder[]>("/api/v1/docs/folders", { params: query }),

  deleteFolder: (args: { id: string } & DocsScope) =>
    authedHttp.delete<{ ok: boolean }>(`/api/v1/docs/folders/${args.id}`, {
      params: { company_id: args.company_id, branch_id: args.branch_id },
    }),

  // -------------------------
  // Documents
  // -------------------------
  uploadDocument: (payload: UploadDocumentRequest) => {
    const fd = toFormData({
      company_id: payload.company_id,
      branch_id: payload.branch_id,
      folder_id: payload.folder_id,
      title: payload.title,
      description: payload.description,
      file: payload.file,
    });

    // IMPORTANT: do NOT set Content-Type here (browser sets boundary)
    return authedHttp.post<DocsDocument>("/api/v1/docs", fd);
  },

  listDocuments: (query: ListDocumentsQuery) =>
    authedHttp.get<ListResponse<DocsDocument>>("/api/v1/docs", { params: query }),

  getDocument: (args: { id: string } & DocsScope) =>
    authedHttp.get<DocsDocumentWithVersions>(`/api/v1/docs/${args.id}`, {
      params: { company_id: args.company_id, branch_id: args.branch_id },
    }),

  deleteDocument: (args: { id: string } & DocsScope) =>
    authedHttp.delete<{ ok: boolean }>(`/api/v1/docs/${args.id}`, {
      params: { company_id: args.company_id, branch_id: args.branch_id },
    }),

  restoreDocument: (args: { id: string } & DocsScope) =>
    authedHttp.post<{ ok: boolean }>(`/api/v1/docs/${args.id}/restore`, null, {
      params: { company_id: args.company_id, branch_id: args.branch_id },
    }),

  uploadNewVersion: (payload: UploadNewVersionRequest) => {
    const fd = toFormData({
      company_id: payload.company_id,
      branch_id: payload.branch_id,
      file: payload.file,
    });

    return authedHttp.post<{ ok: boolean }>(
      `/api/v1/docs/${payload.id}/versions`,
      fd,
    );
  },

  // دانلودها بهتره با window.open یا fetch مستقیم انجام بشه (stream)
  downloadLatestUrl: (args: { id: string } & DocsScope) => {
    const qs = new URLSearchParams({
      company_id: args.company_id,
      branch_id: args.branch_id,
    }).toString();

    return `/api/v1/docs/${args.id}/download-latest?${qs}`;
  },

  downloadVersionUrl: (args: { versionId: string } & DocsScope) => {
    const qs = new URLSearchParams({
      company_id: args.company_id,
      branch_id: args.branch_id,
    }).toString();

    return `/api/v1/docs/versions/${args.versionId}/download?${qs}`;
  },
};
