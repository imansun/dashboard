// src\app\pages\support\users\Toolbar.tsx
import clsx from "clsx";
import { Table } from "@tanstack/react-table";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { Button } from "@/components/ui";
import { CollapsibleSearch } from "@/components/shared/CollapsibleSearch";
import { TableConfig } from "./TableConfig";
import { MenuActions } from "./MenuActions";

export function Toolbar({
  table,
  loading,
}: {
  table: Table<any>;
  loading?: boolean;
}) {
  const isFullScreenEnabled = table.getState().tableSettings?.enableFullScreen;

  return (
    <div
      className={clsx(
        "flex items-center justify-between",
        isFullScreenEnabled && "px-4 sm:px-5",
      )}
    >
      <h2 className="dark:text-dark-100 truncate text-base font-medium tracking-wide text-gray-800">
        کاربران
      </h2>

      <div
        className={clsx(
          "flex items-center gap-2",
          isFullScreenEnabled && "ltr:-mr-2 rtl:-ml-2",
        )}
      >
        <Button
  color="primary"
  isGlow
  className="inline-flex h-9 items-center gap-2 whitespace-nowrap px-3 text-sm"
  onClick={() => table.options.meta?.openCreate?.()}
>
  <PlusIcon className="size-4.5 shrink-0" />
  <span className="whitespace-nowrap">ایجاد کاربر</span>
</Button>


        <CollapsibleSearch
          placeholder={loading ? "در حال بارگذاری..." : "اینجا جستجو کنید..."}
          value={table.getState().globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
        />

        <TableConfig table={table} />
        <MenuActions />
      </div>
    </div>
  );
}
