// src/app/contexts/auth/context.ts
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@/@types/user";
import { createSafeContext } from "@/utils/createSafeContext";

import { authApi, getRefreshJti } from "@/app/services/auth/auth.api";
import { authStorage, AUTH_CHANGED_EVENT } from "@/app/services/auth/auth.storage";
import { HttpError } from "@/app/services/http";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
  user: User | null;

  login: (credentials: { username: string; password: string }) => Promise<void>;

  // ✅ استفاده از endpoint ها
  refresh: () => Promise<void>;
  logout: () => Promise<void>;     // logout-all
  logoutOne: (jti?: string) => Promise<void>;
}

const [AuthContextProvider, useAuthContext] = createSafeContext<AuthContextType>(
  "useAuthContext must be used within AuthProvider",
);

function normalizeErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    if (err.status === 401) return "دسترسی شما نامعتبر است. دوباره وارد شوید.";
    if (err.status === 0) return "ارتباط با سرور برقرار نشد (Network/CORS)";
    return err.message || "خطای ناشناخته";
  }
  const anyErr = err as any;
  return anyErr?.message || "خطای ناشناخته";
}

function readInitialAuth() {
  return {
    user: (authStorage.getUser() as unknown as User | null) ?? null,
    access: authStorage.getAccess(),
    refresh: authStorage.getRefresh(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = readInitialAuth();

  const [user, setUser] = useState<User | null>(initial.user);
  const [accessToken, setAccessToken] = useState<string | null>(initial.access);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial.refresh);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticated = !!accessToken && !!user;

  const syncFromStorage = useCallback(() => {
    const next = readInitialAuth();
    setUser(next.user);
    setAccessToken(next.access);
    setRefreshToken(next.refresh);
  }, []);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // ✅ sync بین تب‌ها + sync داخل همین تب (با AUTH_CHANGED_EVENT)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (!e.key.startsWith("auth.")) return;
      syncFromStorage();
    };

    const onAuthChanged = () => syncFromStorage();

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, [syncFromStorage]);

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await authApi.login({
          email: credentials.username.trim(),
          password: credentials.password,
        });

        authStorage.set(res.access_token, res.refresh_token, res.user as any);

        setUser(res.user as unknown as User);
        setAccessToken(res.access_token);
        setRefreshToken(res.refresh_token);
      } catch (err) {
        const msg = normalizeErrorMessage(err);
        setErrorMessage(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ✅ manual refresh (در صورت نیاز)
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rt = authStorage.getRefresh();
      if (!rt) throw new HttpError(401, "Missing refresh token");

      const res = await authApi.refresh(rt);
      authStorage.setTokens(res.access_token, res.refresh_token);

      setAccessToken(res.access_token);
      setRefreshToken(res.refresh_token);
    } catch (err) {
      const msg = normalizeErrorMessage(err);
      setErrorMessage(msg);
      authStorage.clear();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ logout-all (همه سشن‌ها)
  const logout = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // اگر access معتبر نبود هم پاک می‌کنیم
      await authApi.logoutAll().catch(() => undefined);
    } finally {
      authStorage.clear();
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setIsLoading(false);
    }
  }, []);

  // ✅ logout-one (یک سشن خاص با jti)
  const logoutOne = useCallback(async (jti?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const refreshTok = authStorage.getRefresh();
      const targetJti = jti || (refreshTok ? getRefreshJti(refreshTok) : null);

      if (!targetJti) throw new Error("JTI not found for refresh token");

      await authApi.logoutOne(targetJti);
    } finally {
      // اگر logout-one مربوط به سشن فعلی باشد، منطقی است خارج شویم
      authStorage.clear();
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      isLoading,
      isInitialized,
      errorMessage,
      user,
      login,
      refresh,
      logout,
      logoutOne,
    }),
    [isAuthenticated, isLoading, isInitialized, errorMessage, user, login, refresh, logout, logoutOne],
  );

  return React.createElement(AuthContextProvider, { value }, children);
}

export { useAuthContext };
