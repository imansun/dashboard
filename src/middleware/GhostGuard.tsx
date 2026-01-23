// src\middleware\GhostGuard.tsx
// Import Dependencies
import { Navigate, useLocation, useOutlet } from "react-router";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import { HOME_PATH, REDIRECT_URL_KEY } from "@/constants/app";

// ----------------------------------------------------------------------

export default function GhostGuard() {
  const outlet = useOutlet();
  const location = useLocation();
  const { isAuthenticated } = useAuthContext();

  const raw = new URLSearchParams(location.search).get(REDIRECT_URL_KEY);

  const url = (() => {
    if (!raw) return "";
    const decoded = decodeURIComponent(raw);

    // جلوگیری از open-redirect (فقط مسیر داخلی)
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "";

    return decoded;
  })();

  if (isAuthenticated) {
    if (url) {
      return <Navigate to={url} replace />;
    }
    return <Navigate to={HOME_PATH} replace />;
  }

  return <>{outlet}</>;
}
