// src\app\contexts\auth\Auth.context.tsx
import { createSafeContext } from "@/utils/createSafeContext";
import type { AuthContextValue } from "./AuthProvider";

export const [AuthContextProvider, useAuth] = createSafeContext<AuthContextValue>(
  "useAuth must be used within AuthProvider",
);
