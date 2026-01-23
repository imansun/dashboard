// src/app/services/auth/auth.storage.ts
import type { AuthUser } from "./auth.types";
import { isServer } from "@/utils/isServer";

const ACCESS_KEY = "auth.access_token";
const REFRESH_KEY = "auth.refresh_token";
const USER_KEY = "auth.user";

export const AUTH_CHANGED_EVENT = "auth:changed";

function emitAuthChanged() {
  if (isServer) return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export const authStorage = {
  set(access: string, refresh: string, user: AuthUser) {
    if (isServer) return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    emitAuthChanged();
  },

  // ✅ فقط توکن‌ها را آپدیت می‌کند (برای refresh rotation)
  setTokens(access: string, refresh: string) {
    if (isServer) return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    emitAuthChanged();
  },

  getAccess() {
    if (isServer) return null;
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefresh() {
    if (isServer) return null;
    return localStorage.getItem(REFRESH_KEY);
  },

  getUser(): AuthUser | null {
    if (isServer) return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  clear() {
    if (isServer) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    emitAuthChanged();
  },
};
