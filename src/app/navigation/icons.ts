// src/app/navigation/icons.ts
import { TbPalette } from "react-icons/tb";
import {
  HomeIcon,
  UserIcon as HiUserIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  BuildingOffice2Icon, // ✅ NEW
  MapPinIcon, // ✅ NEW
  TagIcon, // ✅ NEW
  ClockIcon, // ✅ NEW
  FolderIcon, // ✅ NEW (documents)
  ArchiveBoxIcon, // ✅ NEW (documents.archive + archive)
  ShieldCheckIcon, // ✅ NEW (settings.rbac)
} from "@heroicons/react/24/outline";
import { ElementType } from "react";

import DashboardsIcon from "@/assets/dualicons/dashboards.svg?react";
import SettingIcon from "@/assets/dualicons/setting.svg?react";

export const navigationIcons: Record<string, ElementType> = {
  dashboards: DashboardsIcon,
  settings: SettingIcon,

  // dashboards
  "dashboards.home": HomeIcon,

  // settings
  "settings.general": HiUserIcon,
  "settings.appearance": TbPalette,

  // ✅ users
  "settings.users": UsersIcon,
  "settings.rbac": ShieldCheckIcon, // ✅ FIX

  // support
  support: ChatBubbleLeftRightIcon,
  "support.tickets": TicketIcon,
  "support.users": UsersIcon,

  // ✅ (optional) tickets routes icons
  "support.tickets.new": ChatBubbleLeftRightIcon,
  "support.tickets.detail": ChatBubbleLeftRightIcon,

  // ✅ NEW
  "support.companies": BuildingOffice2Icon,

  // ✅ REQUIRED (as requested)
  "support.branches": BuildingOffice2Icon,
  "support.categories": TbPalette,
  "support.sla-policies": ChatBubbleLeftRightIcon,

  // ✅ Archive (FIX invariant crash)
  archive: ArchiveBoxIcon,
  "archive.list": ArchiveBoxIcon,

  // ✅ Documents (IMPORTANT: prevent invariant crash)
  documents: FolderIcon,
  "documents.archive": ArchiveBoxIcon,
  "documents.dms": FolderIcon,
};
