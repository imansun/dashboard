// src/app/pages/support/users/columns.ts
import { ColumnDef, FilterFn } from "@tanstack/react-table";

import { RowActions } from "./RowActions";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import {
  ActiveCell,
  EmailCell,
  RoleCell,
  CompanyCell,
  BranchCell,
  CreatedAtCell,
  UpdatedAtCell,
} from "./rows";

// ✅ helper: multi-select includes (و اگر خالی بود => همه)
const arrIncludesSomeOrAll: FilterFn<any> = (row, columnId, filterValue) => {
  if (filterValue == null) return true;
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;

  const v = row.getValue(columnId);

  // اگر مقدار ستون آرایه بود (مثل role_keys)
  if (Array.isArray(v)) return v.some((x) => filterValue.includes(x));

  // اگر مقدار ستون تکی بود (مثل boolean)
  return filterValue.includes(v);
};

// ✅ helper: contains string (case-insensitive) و اگر خالی بود => همه
const includesStringCI: FilterFn<any> = (row, columnId, filterValue) => {
  const q = String(filterValue ?? "").trim().toLowerCase();
  if (!q) return true;
  const v = String(row.getValue(columnId) ?? "").toLowerCase();
  return v.includes(q);
};

export const columns: ColumnDef<any>[] = [
  { id: "select", label: "انتخاب سطر", header: SelectHeader, cell: SelectCell },

  {
    id: "email",
    accessorKey: "email",
    label: "ایمیل",
    header: "ایمیل",
    cell: EmailCell,
    filterFn: includesStringCI, // ✅
  },

  // ✅ شرکت: اینجا دیگه accessorKey آبجکت نذار، string برگردون
  {
    id: "company_name",
    label: "شرکت",
    header: "شرکت",
    accessorFn: (row) => row?.company?.name ?? "",
    cell: CompanyCell, // نمایش همچنان از original میاد
    filterFn: includesStringCI, // ✅
  },

  // ✅ شعبه
  {
    id: "branch_name",
    label: "شعبه",
    header: "شعبه",
    accessorFn: (row) => row?.branch?.name ?? "",
    cell: BranchCell,
    filterFn: includesStringCI, // ✅
  },

  // ✅ نقش: انتخابی (مثل وضعیت)
  {
    id: "role_keys",
    label: "نقش",
    header: "نقش",

    // ✅ برای فیلتر/سورت، خروجی آرایه role_key
    accessorFn: (row) =>
      (row?.roles ?? []).map((r: any) => r?.role_key).filter(Boolean),

    cell: RoleCell,

    // ✅ multi select includes + اگر خالی بود => همه
    filterFn: arrIncludesSomeOrAll,

    // ✅ شبیه وضعیت: فیلتر انتخابی
    filterColumn: "select",
    options: [
      { value: "SUPERADMIN", label: "SUPERADMIN" },
      { value: "COMPANY_ADMIN", label: "COMPANY_ADMIN" },
      { value: "RESPONDER", label: "RESPONDER" },
      { value: "REQUESTER", label: "REQUESTER" },
    ],
  },

  // ✅ created_at (filter: dateRange مثل orders) -> timestamp number + inNumberRange
  {
    id: "created_at",
    label: "تاریخ ایجاد",
    header: "تاریخ ایجاد",

    // ✅ برای inNumberRange باید عدد باشد
    accessorFn: (row) => {
      const iso = row?.created_at;
      const t = iso ? new Date(iso).getTime() : NaN;
      return Number.isFinite(t) ? t : 0;
    },

    // ✅ نمایش همچنان از original می‌آید
    cell: CreatedAtCell,

    // ✅ دقیقاً مثل orders_triage: dateRange column filter
    filterColumn: "dateRange",
    filterFn: "inNumberRange",
  },

  // ✅ updated_at (filter: dateRange مثل orders) -> timestamp number + inNumberRange
  {
    id: "updated_at",
    label: "آخرین بروزرسانی",
    header: "آخرین بروزرسانی",

    accessorFn: (row) => {
      const iso = row?.updated_at;
      const t = iso ? new Date(iso).getTime() : NaN;
      return Number.isFinite(t) ? t : 0;
    },

    cell: UpdatedAtCell,

    filterColumn: "dateRange",
    filterFn: "inNumberRange",
  },

  {
    id: "is_active",
    accessorKey: "is_active",
    label: "وضعیت",
    header: "وضعیت",
    cell: ActiveCell,
    filterFn: (row, columnId, filterValue) => {
      // ✅ وقتی همه تیک‌ها برداشته شد => همه نمایش داده بشن
      if (filterValue == null) return true;
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) return true;
        return filterValue.includes(row.getValue(columnId));
      }
      const v = row.getValue(columnId) as boolean;
      if (typeof filterValue === "boolean") return v === filterValue;
      if (filterValue === "true") return v === true;
      if (filterValue === "false") return v === false;
      return true;
    },
    filterColumn: "select",
    options: [
      { value: true, label: "فعال" },
      { value: false, label: "غیرفعال" },
    ],
  },

  { id: "actions", label: "عملیات", header: "عملیات", cell: RowActions },
];
