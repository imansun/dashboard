// src/app/navigation/segments/support.ts
import { NavigationTree } from "@/@types/navigation";

const ROOT_SUPPORT = "/support";
const path = (root: string, item: string) => `${root}${item}`;

export const support: NavigationTree = {
  id: "support",
  type: "root",
  path: ROOT_SUPPORT,
  title: "تیکت ساپورت",
  transKey: "nav.support.support",
  icon: "support",
  childs: [
    {
      id: "support.tickets",
      type: "item",
      path: path(ROOT_SUPPORT, "/tickets"),
      title: "لیست تیکت‌ها",
      transKey: "nav.support.tickets",
      icon: "support.tickets",
    },

    // ✅ Users
    {
      id: "support.users",
      type: "item",
      path: path(ROOT_SUPPORT, "/users"),
      title: "کاربران",
      transKey: "nav.support.users",
      icon: "support.users",
    },

    // ✅ NEW: companies
    {
      id: "support.companies",
      type: "item",
      path: path(ROOT_SUPPORT, "/companies"),
      title: "شرکت‌ها",
      transKey: "nav.support.companies",
      icon: "support.companies",
    },

    // ✅ NEW: branches
    {
      id: "support.branches",
      type: "item",
      path: path(ROOT_SUPPORT, "/branches"),
      title: "شعبه‌ها",
      transKey: "nav.support.branches",
      icon: "support.branches",
    },

    // ✅ NEW: categories
    {
      id: "support.categories",
      type: "item",
      path: path(ROOT_SUPPORT, "/categories"),
      title: "دسته‌بندی‌ها",
      transKey: "nav.support.categories",
      icon: "support.categories",
    },

    // ✅ NEW: sla-policies
    {
      id: "support.sla-policies",
      type: "item",
      path: path(ROOT_SUPPORT, "/sla-policies"),
      title: "SLA Policies",
      transKey: "nav.support.sla_policies",
      icon: "support.sla-policies",
    },
  ],
};
