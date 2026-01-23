// src/app/services/http.ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function isBodyAllowed(method: HttpMethod) {
  return method !== "GET" && method !== "DELETE";
}

async function request<T>(
  url: string,
  options: RequestInit & { method: HttpMethod } = { method: "GET" },
): Promise<T> {
  const { method, headers, body, ...rest } = options;

  const res = await fetch(url, {
    method,
    ...rest,
    // ✅ جلوگیری از 304/ETag در fetch
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(isBodyAllowed(method) ? { "Content-Type": "application/json" } : {}),
      // ✅ این هم کمک می‌کند
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(headers || {}),
    },
    ...(isBodyAllowed(method) ? { body } : {}),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.detail)) ||
      `HTTP ${res.status}`;
    throw new HttpError(res.status, msg, data);
  }

  return data as T;
}

function toJsonBody(body?: any) {
  // اگر undefined بود، body نفرستیم
  if (body === undefined) return undefined;
  return JSON.stringify(body);
}

export const http = {
  get: <T>(url: string, headers?: HeadersInit) =>
    request<T>(url, { method: "GET", headers }),

  post: <T>(url: string, body?: any, headers?: HeadersInit) =>
    request<T>(url, { method: "POST", body: toJsonBody(body ?? {}), headers }),

  put: <T>(url: string, body?: any, headers?: HeadersInit) =>
    request<T>(url, { method: "PUT", body: toJsonBody(body ?? {}), headers }),

  patch: <T>(url: string, body?: any, headers?: HeadersInit) =>
    request<T>(url, { method: "PATCH", body: toJsonBody(body ?? {}), headers }),

  delete: <T>(url: string, headers?: HeadersInit) =>
    request<T>(url, { method: "DELETE", headers }),
};
