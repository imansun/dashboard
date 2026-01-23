import type { ComponentType } from "react";
import { DocumentsSideblock } from "@/app/sideblocks/documents/DocumentsSideblock";

type SideblockEntry = {
  match: (pathname: string) => boolean;
  Component: ComponentType;
};

export const sideblocks: SideblockEntry[] = [
  {
    match: (pathname) => pathname.startsWith("/documents"),
    Component: DocumentsSideblock,
  },

  // اگر برای بخش‌های دیگر هم می‌خوای:
  // { match: (p) => p.startsWith("/support"), Component: SupportSideblock },
];
