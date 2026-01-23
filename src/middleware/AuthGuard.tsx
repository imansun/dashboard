// src\middleware\AuthGuard.tsx
// Import Dependencies
import { Navigate, useLocation, useOutlet } from "react-router";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import { GHOST_ENTRY_PATH, REDIRECT_URL_KEY } from "@/constants/app";

// ----------------------------------------------------------------------

export default function AuthGuard() {
  const outlet = useOutlet();
  const { isAuthenticated } = useAuthContext();

  const location = useLocation();

  if (!isAuthenticated) {
    const backTo = encodeURIComponent(location.pathname + location.search);

    return (
      <Navigate
        to={`${GHOST_ENTRY_PATH}?${REDIRECT_URL_KEY}=${backTo}`}
        replace
      />
    );
  }

  return <>{outlet}</>;
}
