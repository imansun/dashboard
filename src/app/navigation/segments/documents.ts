// src/app/navigation/segments/documents.ts
import { NavigationTree } from "@/@types/navigation";

const ROOT = "/documents";
const path = (p: string) => `${ROOT}${p}`;

export const documents: NavigationTree = {
  id: "documents",
  type: "root",
  path: ROOT,
  title: "Documents",
  transKey: "nav.documents.documents",
  icon: "documents",
  childs: [
    {
      id: "documents.manage",
      type: "collapse",
      // ✅ IMPORTANT: remove path to avoid value collision with "/documents"
      title: "مدیریت",
      transKey: "nav.documents.manage",
      icon: "documents.dms",
      childs: [
        {
          id: "documents.list",
          type: "item",
          path: path(""), // /documents
          title: "اسناد",
          transKey: "nav.documents.list",
          icon: "documents.dms",
        },
        {
          id: "documents.folders",
          type: "item",
          path: path("/folders"), // /documents/folders
          title: "پوشه‌ها",
          transKey: "nav.documents.folders",
          icon: "documents",
        },
      ],
    },
  ],
};
