// src/app/pages/support/users/SelectedRowsActions.tsx
import { useMemo, useState } from "react";
import type { Table } from "@tanstack/react-table";
import { toast } from "sonner";
import { TrashIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui";
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";

import { usersApi } from "@/app/services/users/users.api";

const bulkDeleteMessages: ConfirmMessages = {
  pending: {
    description:
      "آیا مطمئن هستید که می‌خواهید کاربران انتخاب‌شده را حذف کنید؟ پس از حذف، امکان بازیابی وجود ندارد.",
  },
  success: { title: "حذف انجام شد" },
};

export function SelectedRowsActions({ table }: { table: Table<any> }) {
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const selectedIds = useMemo(
    () => selectedRows.map((r) => r.original?.id).filter(Boolean) as string[],
    [selectedRows],
  );

  const show = selectedCount > 0;

  // confirm modal state (bulk delete)
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [state, setState] = useState<ModalState>("pending");

  const close = () => {
    if (confirmLoading) return;
    setOpen(false);
    setConfirmLoading(false);
    setState("pending");
  };

  const onConfirmDelete = async () => {
    if (!selectedIds.length) return;

    setConfirmLoading(true);
    setState("pending");

    try {
      // ✅ Bulk delete
      const results = await Promise.allSettled(
        selectedIds.map((id) => usersApi.remove(id)),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;

      if (ok > 0) toast.success(`${ok} کاربر حذف شد`);
      if (fail > 0) toast.error(`${fail} حذف ناموفق بود`);

      setState("success");
      setOpen(false);

      // ✅ پاک‌کردن انتخاب‌ها
      table.resetRowSelection();

      // ✅ رفرش لیست (meta.refetch در index.tsx)
      table.options.meta?.refetch?.();

      // ✅ (اختیاری) UX سریع‌تر بدون رفرش:
      // table.options.meta?.deleteRows?.(selectedRows);
    } catch (e: any) {
      setState("error");
      toast.error(e?.message || "خطا در حذف کاربران انتخاب‌شده");
    } finally {
      setConfirmLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* ✅ Action bar (استایل قبلی حفظ شد، فقط Delete باقی مانده) */}
      <div className="pointer-events-none sticky inset-x-0 bottom-0 z-5 flex items-center justify-end">
        <div className="w-full max-w-xl px-2 py-4 sm:absolute sm:-translate-y-1/2 sm:px-4">
          <div className="dark:bg-dark-50 dark:text-dark-900 pointer-events-auto flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2 font-medium text-gray-100 sm:px-4 sm:py-3">
            <p>
              <span>{selectedCount} انتخاب شده</span>
              <span className="max-sm:hidden">
                {" "}
                از {table.getCoreRowModel().rows.length}
              </span>
            </p>

            <div className="flex space-x-1.5">
              <Button
                onClick={() => setOpen(true)}
                className="text-xs-plus w-7 gap-1.5 rounded-full px-3 py-1.5 sm:w-auto sm:rounded-sm"
                color="error"
                disabled={confirmLoading || selectedCount <= 0}
              >
                <TrashIcon className="size-4 shrink-0" />
                <span className="max-sm:hidden">حذف</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ConfirmModal */}
      <ConfirmModal
        show={open}
        onClose={close}
        messages={bulkDeleteMessages}
        onOk={onConfirmDelete}
        confirmLoading={confirmLoading}
        state={state}
      />
    </>
  );
}
