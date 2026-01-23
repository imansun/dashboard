// src/app/navigation/segments/settings.ts
import { NavigationTree } from "@/@types/navigation";

export const settings: NavigationTree = {
  id: "settings",
  type: "item",
  path: "/settings",
  title: "Settings",
  transKey: "nav.settings.settings",
  icon: "settings",
  childs: [
    {
      id: "general",
      type: "item",
      path: "/settings/general",
      title: "General",
      transKey: "nav.settings.general",
      icon: "settings.general",
    },
    {
      id: "appearance",
      type: "item",
      path: "/settings/appearance",
      title: "Appearance",
      transKey: "nav.settings.appearance",
      icon: "settings.appearance",
    },

    // ✅ Users
    {
      id: "settings.users",
      type: "item",
      path: "/settings/users",
      title: "Users",
      transKey: "nav.settings.users",
      icon: "settings.users",
    },

    // ✅ NEW: RBAC
    {
      id: "settings.rbac",
      type: "item",
      path: "/settings/rbac",
      title: "RBAC",
      transKey: "nav.settings.rbac",
      icon: "settings.rbac",
    },
  ],
};
