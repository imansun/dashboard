// src/app/contexts/auth/AuthProvider.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/app/services/auth/auth.api";
import { authStorage, AUTH_CHANGED_EVENT } from "@/app/services/auth/auth.storage";
import type { AuthUser, LoginRequest } from "@/app/services/auth/auth.types";
import { HttpError } from "@/app/services/http";
import { AuthContextProvider } from "./Auth.context";

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
  hasPerm: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Bootstrap from localStorage (پایداری لاگین بعد از رفرش صفحه) + Sync after refresh-token
  useEffect(() => {
    const sync = () => {
      const token = authStorage.getAccess();
      const savedUser = authStorage.getUser();
      setAccessToken(token);
      setUser(savedUser);
    };

    sync();
    setIsBootstrapping(false);

    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  const login = async (payload: LoginRequest) => {
    try {
      const res = await authApi.login(payload);
      authStorage.set(res.access_token, res.refresh_token, res.user);
      setAccessToken(res.access_token);
      setUser(res.user);
    } catch (e: any) {
      // اینجا دقیقاً طبق کدهای 400/401 پیام می‌دیم
      if (e instanceof HttpError) {
        if (e.status === 401) throw new Error("ایمیل یا رمز عبور اشتباه است.");
        if (e.status === 400)
          throw new Error("ورودی نامعتبر است. ایمیل/پسورد را بررسی کنید.");
      }
      throw new Error("خطا در اتصال به سرور.");
    }
  };

  const logout = () => {
    authStorage.clear();
    setAccessToken(null);
    setUser(null);
  };

  const hasPerm = (perm: string) => !!user?.perms?.includes(perm);
  const hasRole = (role: string) =>
    !!user?.roles?.includes(role) || user?.role === role;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!accessToken && !!user,
      isBootstrapping,
      login,
      logout,
      hasPerm,
      hasRole,
    }),
    [user, accessToken, isBootstrapping],
  );

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}
