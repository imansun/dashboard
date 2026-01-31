// src/app/pages/support/users/rows.tsx
import {
  BuildingOffice2Icon,
  MapPinIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import type { CellContext } from "@tanstack/react-table";

import { Highlight } from "@/components/shared/Highlight";
import { Badge } from "@/components/ui";

// مقدار فیلتر همان ستون را از table state بردار
function getColumnFilterQuery(ctx: any, columnId: string) {
  const filters = ctx?.table?.getState?.().columnFilters ?? [];
  const f = filters.find((x: any) => x?.id === columnId);
  const v = f?.value;

  // فقط فیلترهای متنی رو می‌خوایم
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(" ").trim();
  return String(v).trim();
}

// (اختیاری) IdCell رو می‌تونی نگه داری یا حذف کنی چون دیگه استفاده نمی‌شه
export function IdCell(ctx: CellContext<any, any>) {
  return (
    <span className="dark:text-dark-100 font-mono text-xs text-gray-700">
      {ctx.getValue() ?? "—"}
    </span>
  );
}

export function EmailCell(ctx: CellContext<any, any>) {
  const q = getColumnFilterQuery(ctx, "email");
  const value = String(ctx.getValue() ?? "—");

  return (
    <span className="font-medium text-gray-800 dark:text-dark-100">
      <Highlight query={q}>{value}</Highlight>
    </span>
  );
}

export function NameCell(ctx: CellContext<any, any>) {
  return <span>{ctx.getValue() ?? "—"}</span>;
}

export function RoleCell(ctx: CellContext<any, any>) {
  const roles = (ctx.row.original?.roles ?? []) as Array<{
    role_key?: string | null;
  }>;
  const keys = roles.map((r) => r?.role_key).filter(Boolean) as string[];

  if (!keys.length) {
    return (
      <Badge
        variant="soft"
        color="neutral"
        className="border-this-darker/20 dark:border-this-lighter/20 gap-2 rounded-full border px-3"
      >
        <UsersIcon className="size-4" />
        <span>—</span>
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keys.slice(0, 3).map((r, i) => (
        <Badge
          key={`${r}-${i}`}
          color="primary"
          className="gap-2 rounded-full px-3 capitalize"
        >
          <StarIcon className="size-4" />
          <span>{r}</span>
        </Badge>
      ))}

      {keys.length > 3 && (
        <Badge
          variant="soft"
          color="secondary"
          className="border-this-darker/20 dark:border-this-lighter/20 gap-2 rounded-full border px-3"
        >
          <ShieldCheckIcon className="size-4" />
          <span>+{keys.length - 3}</span>
        </Badge>
      )}
    </div>
  );
}

export function CompanyCell(ctx: CellContext<any, any>) {
  // چون accessorFn برای فیلتر company_name است، query را از company_name بگیر
  const q = getColumnFilterQuery(ctx, "company_name");
  const name = String(ctx.row.original?.company?.name ?? "—");

  return (
    <Badge variant="soft" color="secondary" className="gap-2 rounded-full px-3">
      <BuildingOffice2Icon className="size-4" />
      <span className="truncate">
        <Highlight query={q}>{name}</Highlight>
      </span>
    </Badge>
  );
}

export function BranchCell(ctx: CellContext<any, any>) {
  const q = getColumnFilterQuery(ctx, "branch_name");
  const name = String(ctx.row.original?.branch?.name ?? "—");

  return (
    <Badge color="info" className="gap-2 rounded-full px-3">
      <MapPinIcon className="size-4" />
      <span className="truncate">
        <Highlight query={q}>{name}</Highlight>
      </span>
    </Badge>
  );
}

export function ActiveCell(ctx: CellContext<any, any>) {
  const v = !!ctx.getValue();

  return v ? (
    <Badge
      variant="soft"
      color="success"
      className="border-this-darker/20 dark:border-this-lighter/20 gap-2 rounded-full border px-3"
    >
      <ShieldCheckIcon className="size-4" />
      <span>فعال</span>
    </Badge>
  ) : (
    <Badge
      color="warning"
      className="shadow-this/50 dark:shadow-this-light/50 animate-pulse gap-2 rounded-full px-3 shadow-lg"
    >
      <ShieldCheckIcon className="size-4" />
      <span>غیرفعال</span>
    </Badge>
  );
}

function formatIso(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran", // ✅ timezone درست شما
  }).format(d);
}

export function CreatedAtCell(ctx: any) {
  const iso = ctx.row.original?.created_at as string | undefined;
  return <span className="text-xs">{formatIso(iso)}</span>;
}

export function UpdatedAtCell(ctx: any) {
  const iso = ctx.row.original?.updated_at as string | undefined;
  return <span className="text-xs">{formatIso(iso)}</span>;
}
