// src/app/services/authedHttp.ts
import { http, HttpError } from "@/app/services/http";
import { authStorage } from "@/app/services/auth/auth.storage";
import { authApi } from "@/app/services/auth/auth.api";

let refreshPromise: Promise<void> | null = null;

type QueryParams =
  | Record<string, string | number | boolean | null | undefined>
  | URLSearchParams;

type RequestOptions = {
  headers?: HeadersInit;
  params?: QueryParams;
};

function buildUrl(url: string, params?: QueryParams) {
  if (!params) return url;

  const sp =
    params instanceof URLSearchParams ? params : new URLSearchParams();

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
  const headers = token ? ({ Authorization: `Bearer ${token}` } as const) : undefined;

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
};
