// src\components\shared\table\PaginationSection.tsx
// Import Dependencies
import { type Table } from "@tanstack/react-table";

// Local Imports
import {
  Pagination,
  PaginationItems,
  PaginationNext,
  PaginationPrevious,
  Select,
} from "@/components/ui";
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";

// ----------------------------------------------------------------------

export function PaginationSection({
  table,
  total,
}: {
  table: Table<any>;
  total?: number; // ✅ برای pagination سرور-ساید (مثل users list) عدد total رو پاس بده
}) {
  const paginationState = table.getState().pagination;
  const { isXl, is2xl } = useBreakpointsContext();

  const pageIndex = paginationState.pageIndex;
  const pageSize = paginationState.pageSize;

  const currentRowsCount = table.getRowModel().rows.length;

  const start =
    currentRowsCount === 0 ? 0 : pageIndex * pageSize + 1;

  const end =
    currentRowsCount === 0
      ? 0
      : total != null
        ? Math.min((pageIndex + 1) * pageSize, total)
        : pageIndex * pageSize + currentRowsCount;

  const totalCount =
    total != null ? total : table.getCoreRowModel().rows.length;

  return (
    <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
      <div className="text-xs-plus flex items-center space-x-2 rtl:space-x-reverse">
        <span>نمایش</span>
        <Select
          data={[10, 20, 30, 40, 50, 100]}
          value={paginationState.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          classNames={{
            root: "w-fit",
            select: "h-7 rounded-full py-1 text-xs ltr:pr-7! rtl:pl-7!",
          }}
        />
        <span>ورودی</span>
      </div>

      <div>
        <Pagination
          total={table.getPageCount()}
          value={paginationState.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
          siblings={isXl ? 2 : is2xl ? 3 : 1}
          boundaries={isXl ? 2 : 1}
        >
          <PaginationPrevious />
          <PaginationItems />
          <PaginationNext />
        </Pagination>
      </div>

      <div className="text-xs-plus truncate">
        {start} - {end} از {totalCount} ورودی
      </div>
    </div>
  );
}
