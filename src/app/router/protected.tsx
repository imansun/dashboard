// src/app/router/protected.tsx
import { Navigate, RouteObject } from "react-router";

import AuthGuard from "@/middleware/AuthGuard";
import { DynamicLayout } from "../layouts/DynamicLayout";
import { AppLayout } from "../layouts/AppLayout";

/**
 * Protected routes configuration
 * These routes require authentication to access
 * Uses AuthGuard middleware to verify user authentication
 */
const protectedRoutes: RouteObject = {
  id: "protected",
  Component: AuthGuard,
  children: [
    // The dynamic layout supports both the main layout and the sideblock.
    {
      Component: DynamicLayout,
      children: [
        {
          index: true,
          element: <Navigate to="/dashboards/home" />,
        },

        // ✅ Documents (Sideblock/DynamicLayout)
        {
          path: "/documents",
          lazy: async () => ({
            Component: (await import("@/app/pages/documents")).default,
          }),
        },
        {
          path: "/documents/folders",
          lazy: async () => ({
            Component: (await import("@/app/pages/documents/folders")).default,
          }),
        },

        // ✅ Document detail (versions + upload new version)
        {
          path: "/documents/:id",
          lazy: async () => ({
            Component: (await import("@/app/pages/documents/detail")).default,
          }),
        },

        // ✅ Archive (deleted docs + restore)
        {
          path: "/archive",
          lazy: async () => ({
            Component: (await import("@/app/pages/archive")).default,
          }),
        },

        {
          path: "dashboards",
          children: [
            {
              index: true,
              element: <Navigate to="/dashboards/home" />,
            },
            {
              path: "home",
              lazy: async () => ({
                Component: (await import("@/app/pages/dashboards/home")).default,
              }),
            },
          ],
        },

        // ✅ Support
        {
          path: "support",
          children: [
            { index: true, element: <Navigate to="/support/tickets" /> },
            {
              path: "tickets",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/tickets")).default,
              }),
            },

            // ✅ NEW: tickets/new
            {
              path: "tickets/new",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/tickets/new"))
                  .default,
              }),
            },

            // ✅ NEW: tickets/:id
            {
              path: "tickets/:id",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/tickets/detail"))
                  .default,
              }),
            },

            // ✅ users
            {
              path: "users",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/users")).default,
              }),
            },

            // ✅ NEW: companies
            {
              path: "companies",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/companies"))
                  .default,
              }),
            },

            // ✅ NEW: branches (REQUIRED)
            {
              path: "branches",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/branches")).default,
              }),
            },

            // ✅ NEW: categories (REQUIRED)
            {
              path: "categories",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/categories"))
                  .default,
              }),
            },

            // ✅ NEW: sla-policies (REQUIRED)
            {
              path: "sla-policies",
              lazy: async () => ({
                Component: (await import("@/app/pages/support/sla-policies"))
                  .default,
              }),
            },
          ],
        },
      ],
    },

    // The app layout supports only the main layout. Avoid using it for other layouts.
    {
      Component: AppLayout,
      children: [
        {
          path: "settings",
          lazy: async () => ({
            Component: (await import("@/app/pages/settings/Layout")).default,
          }),
          children: [
            { index: true, element: <Navigate to="/settings/general" /> },
            {
              path: "general",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/General")
                ).default,
              }),
            },
            {
              path: "appearance",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/Appearance")
                ).default,
              }),
            },
            // ✅ added
            {
              path: "users",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Users"))
                  .default,
              }),
            },

            // ✅ NEW: rbac
            {
              path: "rbac",
              lazy: async () => ({
                Component: (await import("@/app/pages/settings/sections/Rbac"))
                  .default,
              }),
            },
          ],
        },
      ],
    },
  ],
};

export { protectedRoutes };
