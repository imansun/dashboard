// src\main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./i18n/config";

import "simplebar-react/dist/simplebar.min.css";

import "./styles/index.css";
import "./styles/global.scss";

import { AuthProvider } from "@/app/contexts/auth/AuthProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
