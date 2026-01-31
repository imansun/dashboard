// src/app/services/authedHttp.ts

import { http, HttpError } from "@/app/services/http";
import { authStorage } from "@/app/services/auth/auth.storage";
import { authApi } from "@/app/services/auth/auth.api";

let refreshPromise: Promise<void> | null = null;

type QueryParams =
  | Record<string, string | number | boolean | null | undefined>
  | URLSearchParams;

export type ResponseType = "json" | "blob" | "text" | "arrayBuffer";

export type RequestOptions = {
  headers?: HeadersInit;
  params?: QueryParams;

  /**
   * - json (default): same behavior as before (http.get/post returns parsed json)
   * - blob/text/arrayBuffer: will return those instead of json
   */
  responseType?: ResponseType;

  /**
   * if true => returns the raw Response object
   * (useful for ETag status / headers, 304 handling)
   */
  raw?: boolean;

  /**
   * Override method fetch options (rarely needed)
   */
  signal?: AbortSignal;
};

function buildUrl(url: string, params?: QueryParams) {
  if (!params) return url;

  const sp = params instanceof URLSearchParams ? params : new URLSearchParams();

  if (!(params instanceof URLSearchParams)) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      sp.set(k, String(v));
    }
  }

  const qs = sp.toString();
  if (!qs) return url;

  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

function mergeHeaders(authHeaders?: HeadersInit, extra?: HeadersInit) {
  if (!authHeaders && !extra) return undefined;

  // Authorization should win if both provided
  return {
    ...(extra as any),
    ...(authHeaders as any),
  } as HeadersInit;
}

async function rotateTokens(): Promise<void> {
  const refresh = authStorage.getRefresh();
  if (!refresh) {
    authStorage.clear();
    throw new HttpError(401, "Missing refresh token");
  }

  const res = await authApi.refresh(refresh);
  authStorage.setTokens(res.access_token, res.refresh_token);
}

async function withAuthRetry<T>(
  fn: (headers?: HeadersInit) => Promise<T>,
): Promise<T> {
  const token = authStorage.getAccess();
  const headers = token
    ? ({ Authorization: `Bearer ${token}` } as const)
    : undefined;

  try {
    return await fn(headers);
  } catch (err: any) {
    // فقط روی 401 یک بار refresh و retry
    if (err instanceof HttpError && err.status === 401) {
      try {
        if (!refreshPromise) {
          refreshPromise = rotateTokens().finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;

        const newToken = authStorage.getAccess();
        const newHeaders = newToken
          ? ({ Authorization: `Bearer ${newToken}` } as const)
          : undefined;

        return await fn(newHeaders);
      } catch {
        authStorage.clear();
        throw err;
      }
    }

    throw err;
  }
}

/**
 * Low-level request helper for:
 * - blob download
 * - text/arrayBuffer
 * - raw Response (headers/status)
 * - form-data posts
 *
 * Uses http.request if you have it; otherwise falls back to fetch.
 */
async function request<T>(
  url: string,
  init: RequestInit & { responseType?: ResponseType; raw?: boolean },
): Promise<T> {
  const anyHttp = http as any;

  // If your http service has request(), use it.
  if (typeof anyHttp.request === "function") {
    return anyHttp.request<T>(url, init);
  }

  // Fallback to fetch (keeps behavior predictable)
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      ...(init.headers as any),
    },
    ...init,
  });

  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {
      // ignore
    }
    throw new HttpError(res.status, message);
  }

  if (init.raw) return res as any;

  switch (init.responseType) {
    case "blob":
      return (await res.blob()) as any;
    case "text":
      return (await res.text()) as any;
    case "arrayBuffer":
      return (await res.arrayBuffer()) as any;
    case "json":
    default:
      // some endpoints might return empty body
      try {
        return (await res.json()) as any;
      } catch {
        return undefined as any;
      }
  }
}

export const authedHttp = {
  get: <T>(url: string, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      http.get<T>(
        buildUrl(url, options?.params),
        mergeHeaders(authHeaders, options?.headers),
      ),
    ),

  post: <T>(url: string, body?: any, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      http.post<T>(
        buildUrl(url, options?.params),
        body,
        mergeHeaders(authHeaders, options?.headers),
      ),
    ),

  patch: <T>(url: string, body?: any, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      http.patch<T>(
        buildUrl(url, options?.params),
        body,
        mergeHeaders(authHeaders, options?.headers),
      ),
    ),

  put: <T>(url: string, body?: any, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      http.put<T>(
        buildUrl(url, options?.params),
        body,
        mergeHeaders(authHeaders, options?.headers),
      ),
    ),

  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      http.delete<T>(
        buildUrl(url, options?.params),
        mergeHeaders(authHeaders, options?.headers),
      ),
    ),

  /**
   * ✅ DELETE with JSON body
   * برخی endpoint ها (مثل remove role scoped) body می‌خوان
   */
  deleteJson: <T = unknown>(url: string, body?: any, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      request<T>(buildUrl(url, options?.params), {
        method: "DELETE",
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: mergeHeaders(authHeaders, {
          "Content-Type": "application/json",
          ...(options?.headers as any),
        }),
        responseType: options?.responseType ?? "json",
        raw: options?.raw,
        signal: options?.signal,
      }),
    ),

  /**
   * Upload form-data (DO NOT set Content-Type manually)
   */
  postFormData: <T>(url: string, form: FormData, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      request<T>(buildUrl(url, options?.params), {
        method: "POST",
        body: form,
        headers: mergeHeaders(authHeaders, options?.headers),
        responseType: options?.responseType ?? "json",
        raw: options?.raw,
        signal: options?.signal,
      }),
    ),

  /**
   * Download as Blob (versions / latest)
   */
  getBlob: (url: string, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      request<Blob>(buildUrl(url, options?.params), {
        method: "GET",
        headers: mergeHeaders(authHeaders, options?.headers),
        responseType: "blob",
        raw: options?.raw,
        signal: options?.signal,
      }),
    ),

  /**
   * HEAD request (useful for ETag checks)
   */
  head: (url: string, options?: RequestOptions) =>
    withAuthRetry((authHeaders) =>
      request<Response>(buildUrl(url, options?.params), {
        method: "HEAD",
        headers: mergeHeaders(authHeaders, options?.headers),
        raw: true,
        signal: options?.signal,
      }),
    ),

  /**
   * Generic request for advanced needs (text/arrayBuffer/raw)
   */
  request: <T>(
    url: string,
    init: RequestInit & { responseType?: ResponseType; raw?: boolean },
    options?: Omit<RequestOptions, "responseType" | "raw">,
  ) =>
    withAuthRetry((authHeaders) =>
      request<T>(buildUrl(url, options?.params), {
        ...init,
        headers: mergeHeaders(authHeaders, init.headers),
      }),
    ),
};
