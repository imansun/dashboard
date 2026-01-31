// src/app/pages/support/tickets/SelectedRowsActions.tsx
import type { Table } from "@tanstack/react-table";

export function SelectedRowsActions({ table }: { table: Table<any> }) {
  const selectedCount = table.getSelectedRowModel().rows.length;

  // ✅ ساختار Users حفظ شود، ولی فعلاً اکشنی نداریم
  if (!selectedCount) return null;

  return null;
}
