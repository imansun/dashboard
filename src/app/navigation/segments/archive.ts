// src\app\navigation\segments\archive.ts
import { NavigationTree } from "@/@types/navigation";

const ROOT = "/archive";
const path = (p: string) => `${ROOT}${p}`;

export const archive: NavigationTree = {
  id: "archive",
  type: "root",
  path: ROOT,
  title: "Archive",
  transKey: "nav.archive.archive",
  icon: "archive",
  childs: [
    {
      id: "archive.list",
      type: "item",
      path: path(""),
      title: "Archive",
      transKey: "nav.archive.list",
      icon: "archive.list",
    },
  ],
};
