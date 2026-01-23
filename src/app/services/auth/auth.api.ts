// src/app/services/auth/auth.api.ts
import { http } from "@/app/services/http";
import { authStorage } from "@/app/services/auth/auth.storage";
import { jwtDecode } from "jwt-decode";

import type { LoginResponse, RefreshResponse, JwtClaims } from "./auth.types";

type LoginPayload =
  | { email: string; password: string }
  | { username: string; password: string };

function normalizeLoginPayload(payload: LoginPayload): { email: string; password: string } {
  const email = "email" in payload ? payload.email : payload.username;
  return { email, password: payload.password };
}

function authHeaders() {
  const token = authStorage.getAccess();
  return token ? ({ Authorization: `Bearer ${token}` } as const) : undefined;
}

export function getRefreshJti(refreshToken: string): string | null {
  try {
    const decoded = jwtDecode<JwtClaims>(refreshToken);
    return decoded?.jti ?? null;
  } catch {
    return null;
  }
}

export const authApi = {
  // ✅ مثل نسخه سالم: username/email را می‌پذیرد و همیشه email می‌فرستد
  login: (payload: LoginPayload) =>
    http.post<LoginResponse>("/api/v1/auth/login", normalizeLoginPayload(payload)),

  refresh: (refresh_token: string) =>
    http.post<RefreshResponse>("/api/v1/auth/refresh", { refresh_token }),

  logoutAll: () =>
    http.post<{ message?: string }>(
      "/api/v1/auth/logout-all",
      undefined,
      authHeaders(),
    ),

  logoutOne: (jti: string) =>
    http.post<{ message?: string }>(
      "/api/v1/auth/logout-one",
      { jti },
      authHeaders(),
    ),
};
