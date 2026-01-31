// src/app/pages/support/tickets/index.tsx
import clsx from "clsx";
import {
  flexRender,
  getCoreRowModel,
  type ColumnFiltersState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { PlusIcon } from "@heroicons/react/20/solid"; // ✅ اضافه شد

import { Page } from "@/components/shared/Page";
import { TableSortIcon } from "@/components/shared/table/TableSortIcon";
import { ColumnFilter } from "@/components/shared/table/ColumnFilter";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";

import { Button, Card, Table, TBody, Td, THead, Th, Tr } from "@/components/ui"; // ✅ Button اضافه شد

import { useDidUpdate, useLocalStorage, useLockScrollbar } from "@/hooks";
import { useSkipper } from "@/utils/react-table/useSkipper";
import { useThemeContext } from "@/app/contexts/theme/context";
import { getUserAgentBrowser } from "@/utils/dom/getUserAgentBrowser";

import { ticketsApi } from "@/app/services/tickets/tickets.api";
import type {
  Ticket,
  TicketStatus,
  TicketsListQuery,
} from "@/app/services/tickets/tickets.types";

// ✅ A) import سرویس‌ها
import { usersApi } from "@/app/services/users/users.api";
import { companiesApi } from "@/app/services/companies/companies.api";
import { branchesApi } from "@/app/services/branches/branches.api";

import { Toolbar } from "./Toolbar";
import { columns } from "./columns";
import { SelectedRowsActions } from "./SelectedRowsActions";

// ----------------------------------------------------------------------
// Types

type TableSettingsState = {
  enableFullScreen?: boolean;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
  enableRowDense?: boolean;
};

type ActionKind = "resolve" | "close" | "reopen";

const isSafari = getUserAgentBrowser() === "Safari";

const confirmMessages: Record<ActionKind, ConfirmMessages> = {
  resolve: {
    pending: { description: "تیکت به حالت RESOLVED برود؟" },
    success: { title: "تیکت Resolve شد" },
  },
  close: {
    pending: { description: "تیکت به حالت CLOSED برود؟" },
    success: { title: "تیکت بسته شد" },
  },
  reopen: {
    pending: { description: "تیکت Reopen شود و مجدداً در صف تخصیص قرار گیرد؟" },
    success: { title: "تیکت Reopen شد" },
  },
};

// ----------------------------------------------------------------------
// Page

export default function SupportTicketsPage() {
  const nav = useNavigate();
  const { cardSkin } = useThemeContext();
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  const [tableSettings, setTableSettings] = useLocalStorage<TableSettingsState>(
    "support-tickets-tableSettings",
    {
      enableSorting: true,
      enableColumnFilters: true,
      enableFullScreen: false,
      enableRowDense: false,
    },
  );

  // ✅ B) state/cache ها (بالای کامپوننت)
  const companiesMapRef = useRef(new Map<string, { id: string; name: string }>());
  const branchesMapRef = useRef(new Map<string, { id: string; name: string }>());
  const usersMapRef = useRef(
    new Map<string, { id: string; email?: string; name?: string }>(),
  );

  // برای رندر مجدد وقتی map ها آپدیت شدن
  const [, bumpLookups] = useState(0);
  const bump = () => bumpLookups((x) => x + 1);

  // ✅ C) تابع prefetchLookups
  const prefetchLookups = useCallback(
    async (rows: Ticket[]) => {
      // unique ids
      const companyIds = new Set<string>();
      const branchIds = new Set<string>();
      const userIds = new Set<string>();

      for (const t of rows) {
        if (t.company_id) companyIds.add(String(t.company_id));
        if (t.branch_id) branchIds.add(String(t.branch_id));
        if (t.requester_id) userIds.add(String(t.requester_id));
        if (t.responder_id) userIds.add(String(t.responder_id));
      }

      const tasks: Promise<any>[] = [];

      for (const id of companyIds) {
        if (companiesMapRef.current.has(id)) continue;
        tasks.push(
          companiesApi
            .getById(id)
            .then((res: any) => {
              const data = res?.data ?? res;
              if (data?.id)
                companiesMapRef.current.set(id, {
                  id: data.id,
                  name: data.name ?? data.title ?? String(id),
                });
            })
            .catch(() => void 0),
        );
      }

      for (const id of branchIds) {
        if (branchesMapRef.current.has(id)) continue;
        tasks.push(
          branchesApi
            .getById(id)
            .then((res: any) => {
              const data = res?.data ?? res;
              if (data?.id)
                branchesMapRef.current.set(id, {
                  id: data.id,
                  name: data.name ?? data.title ?? String(id),
                });
            })
            .catch(() => void 0),
        );
      }

      for (const id of userIds) {
        if (usersMapRef.current.has(id)) continue;
        tasks.push(
          usersApi
            .getById(id)
            .then((res: any) => {
              const data = res?.data ?? res;
              if (data?.id)
                usersMapRef.current.set(id, {
                  id: data.id,
                  email: data.email,
                  name: data.name,
                });
            })
            .catch(() => void 0),
        );
      }

      if (tasks.length) {
        await Promise.allSettled(tasks);
        bump();
      }
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ---- Server state ----
  const [items, setItems] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // ---- Table states (UI-only but used to build server query) ----
  const [globalFilter, setGlobalFilter] = useLocalStorage(
    "support-tickets-globalFilter",
    "",
  );
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "support-tickets-sorting",
    [],
  );
  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    "support-tickets-columnFilters",
    [],
  );

  const [columnVisibility, setColumnVisibility] = useLocalStorage(
    "column-visibility-support-tickets",
    {},
  );

  const [columnPinning, setColumnPinning] = useLocalStorage(
    "column-pinning-support-tickets",
    {},
  );

  // Pagination state (API offset/limit)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useLocalStorage("support-tickets-pageSize", 20);

  // ---- Action confirm modal (Resolve/Close/Reopen) ----
  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState<ActionKind>("resolve");
  const [actionRow, setActionRow] = useState<Ticket | null>(null);
  const [actionState, setActionState] = useState<ModalState>("pending");
  const [actionLoading, setActionLoading] = useState(false);

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionOpen(false);
    setActionState("pending");
    setActionRow(null);
  };

  const openAction = (kind: ActionKind, row: Ticket) => {
    setActionKind(kind);
    setActionRow(row);
    setActionState("pending");
    setActionOpen(true);
  };

  const onConfirmAction = async () => {
    if (!actionRow) return;

    setActionLoading(true);
    setActionState("pending");
    try {
      if (actionKind === "resolve") await ticketsApi.resolve(actionRow.id);
      if (actionKind === "close") await ticketsApi.close(actionRow.id);
      if (actionKind === "reopen") await ticketsApi.reopen(actionRow.id);

      setActionState("success");
      toast.success("عملیات انجام شد");

      // ✅ رفرش لیست
      await refetchTickets(false);

      // ✅ بستن مودال
      setActionOpen(false);
      setActionRow(null);
    } catch (e: any) {
      setActionState("error");
      toast.error(e?.message || "خطا در انجام عملیات");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // ✅ Build server query from table state (مثل Users)

  const buildListQuery = useCallback(
    (offset: number): TicketsListQuery & Record<string, any> => {
      const query: TicketsListQuery & Record<string, any> = {
        offset,
        limit: pageSize,
      };

      // ⚠️ API شما برای subject LIKE نداره => این یکی فقط UI است
      // پس globalFilter را به سرور نمی‌فرستیم

      for (const f of columnFilters) {
        // company_id
        if (f.id === "company_id") {
          const v = String(f.value ?? "").trim();
          query.company_id = v ? (v as any) : undefined;
        }

        // branch_id
        if (f.id === "branch_id") {
          const v = String(f.value ?? "").trim();
          query.branch_id = v ? (v as any) : undefined;
        }

        // requester_id
        if (f.id === "requester_id") {
          const v = String(f.value ?? "").trim();
          query.requester_id = v ? (v as any) : undefined;
        }

        // responder_id
        if (f.id === "responder_id") {
          const v = String(f.value ?? "").trim();
          query.responder_id = v ? (v as any) : undefined;
        }

        // status (select)
        if (f.id === "status") {
          const v = f.value as any;

          // ColumnFilter(select) معمولاً آرایه می‌دهد
          if (Array.isArray(v)) {
            if (v.length === 1 && v[0]) query.status = v[0] as TicketStatus;
            else query.status = undefined;
          } else {
            query.status = v ? (v as TicketStatus) : undefined;
          }
        }
      }

      // NOTE: sorting mapping to API نداریم، UI-only
      return query;
    },
    [columnFilters, pageSize],
  );

  // ---- Fetch ----
  const refetchTickets = useCallback(
    async (forceFirstPage?: boolean) => {
      const nextPageIndex = forceFirstPage ? 0 : pageIndex;
      const nextOffset = nextPageIndex * pageSize;

      setLoading(true);
      try {
        const query = buildListQuery(nextOffset);
        const res = await ticketsApi.list(query);

        const nextItems = res.items || [];
        setItems(nextItems);
        setTotal(res.total ?? 0);

        // ✅ D) لود اسم‌ها
        prefetchLookups(nextItems).catch(() => void 0);

        if (forceFirstPage) setPageIndex(0);
      } catch (e: any) {
        toast.error(e?.message || "خطا در دریافت لیست تیکت‌ها");
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, pageSize, buildListQuery, prefetchLookups],
  );

  useEffect(() => {
    refetchTickets(false);
  }, [refetchTickets]);

  // ✅ مثل Users: اگر فیلتر/مرتب‌سازی تغییر کرد صفحه اول
  const didHydrateRef = useRef(false);
  useEffect(() => {
    didHydrateRef.current = true;
  }, []);

  useDidUpdate(() => {
    if (!didHydrateRef.current) return;
    setPageIndex(0);
  }, [globalFilter, columnFilters, sorting]);

  // ----------------------------------------------------------------------
  // ✅ Client-side subject search (همان q قبلی، اما با globalFilter مشترک Users)
  const filteredItems = useMemo(() => {
    const query = String(globalFilter ?? "").trim().toLowerCase();
    if (!query) return items;
    return items.filter((t) => (t.subject || "").toLowerCase().includes(query));
  }, [items, globalFilter]);

  // ----------------------------------------------------------------------
  // Table

  const tableColumns = useMemo(() => columns, []);

  const table = useReactTable({
    data: filteredItems,
    columns: tableColumns as any,

    // ✅ stable row id
    getRowId: (row: any) => row.id,

    // ✅ server-side table
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,

    pageCount: Math.max(1, Math.ceil(total / pageSize)),

    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination: { pageIndex, pageSize },
      columnVisibility,
      columnPinning,
      tableSettings,
    } as any,

    // ✅ E) meta.lookups رو به table بده
    meta: {
      setTableSettings,

      lookups: {
        companies: companiesMapRef.current,
        branches: branchesMapRef.current,
        users: usersMapRef.current,
      },

      // Toolbar
      refetch: () => refetchTickets(false),

      // ✅ navigate for Actions column
      navigate: (path: string) => nav(path),

      // Actions column
      openAction,

      // (Optional) if someday needed for optimistic updates
      updateData: (rowIndex: number, columnId: string, value: any) => {
        skipAutoResetPageIndex();
        setItems((old) =>
          old.map((row, index) =>
            index === rowIndex ? ({ ...row, [columnId]: value } as any) : row,
          ),
        );
      },
    },

    enableSorting: !!tableSettings.enableSorting,
    enableColumnFilters: !!tableSettings.enableColumnFilters,
    enableRowSelection: true,
    enableColumnPinning: true,

    getCoreRowModel: getCoreRowModel(),

    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,

    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },

    autoResetPageIndex,
  });

  useDidUpdate(() => table.resetRowSelection(), [filteredItems]);
  useLockScrollbar(!!tableSettings.enableFullScreen);

  return (
    <Page title="Tickets">
      <div className="transition-content grid grid-cols-1 grid-rows-[auto_1fr] px-(--margin-x) py-4">
        {/* ✅ Header بالا (کمترین تغییر، فقط همینجا اضافه شد) */}
        <div className="flex items-center justify-between space-x-4">
          <div className="min-w-0">
            <h2 className="dark:text-dark-50 truncate text-xl font-medium tracking-wide text-gray-800">
              لیست تیکت‌ها
            </h2>
          </div>

          <Button
            color="primary"
            className="h-8 space-x-1.5 rounded-md px-3 text-xs rtl:space-x-reverse"
            onClick={() => nav("/support/tickets/new")}
          >
            <PlusIcon className="size-5" />
            <span>ایجاد تیکت جدید</span>
          </Button>
        </div>

        <div
          className={clsx(
            "flex flex-col",
            tableSettings.enableFullScreen &&
              "dark:bg-dark-900 fixed inset-0 z-61 h-full w-full bg-white pt-3",
          )}
        >
          <Toolbar table={table as any} loading={loading} />

          <Card
            className={clsx(
              "relative mt-3 flex grow flex-col",
              tableSettings.enableFullScreen && "overflow-hidden",
            )}
          >
            <div className="table-wrapper min-w-full grow overflow-x-auto">
              <Table
                hoverable
                dense={!!tableSettings.enableRowDense}
                sticky={!!tableSettings.enableFullScreen}
                className="w-full text-left rtl:text-right"
              >
                <THead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Th
                          key={header.id}
                          className={clsx(
                            "dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg first:rtl:rounded-tr-lg last:rtl:rounded-tl-lg",
                            header.column.getCanPin() && [
                              header.column.getIsPinned() === "left" &&
                                "sticky z-2 ltr:left-0 rtl:right-0",
                              header.column.getIsPinned() === "right" &&
                                "sticky z-2 ltr:right-0 rtl:left-0",
                            ],
                          )}
                        >
                          {header.column.getCanSort() ? (
                            <div
                              className="flex cursor-pointer items-center space-x-3 select-none"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span className="flex-1">
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                              </span>
                              <TableSortIcon sorted={header.column.getIsSorted()} />
                            </div>
                          ) : header.isPlaceholder ? null : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}

                          {/* ✅ header filters (server-side) */}
                          {header.column.getCanFilter() ? (
                            <ColumnFilter column={header.column} />
                          ) : null}
                        </Th>
                      ))}
                    </Tr>
                  ))}
                </THead>

                <TBody>
                  {loading ? (
                    <Tr>
                      <Td colSpan={table.getAllLeafColumns().length}>
                        <div className="dark:text-dark-200 flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                          <span className="inline-flex size-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-dark-500 dark:border-t-dark-200" />
                          <span>در حال دریافت اطلاعات...</span>
                        </div>
                      </Td>
                    </Tr>
                  ) : (
                    <>
                      {table.getRowModel().rows.map((row) => (
                        <Tr
                          key={row.original.id}
                          className={clsx(
                            "dark:border-b-dark-500 relative border-y border-transparent border-b-gray-200",
                            row.getIsSelected() &&
                              !isSafari &&
                              "row-selected after:bg-primary-500/10 ltr:after:border-l-primary-500 rtl:after:border-r-primary-500 after:pointer-events-none after:absolute after:inset-0 after:z-2 after:h-full after:w-full after:border-3 after:border-transparent",
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <Td
                              key={cell.id}
                              className={clsx(
                                "relative",
                                cardSkin === "shadow"
                                  ? "dark:bg-dark-700"
                                  : "dark:bg-dark-900",
                                cell.column.getCanPin() && [
                                  cell.column.getIsPinned() === "left" &&
                                    "sticky z-2 ltr:left-0 rtl:right-0",
                                  cell.column.getIsPinned() === "right" &&
                                    "sticky z-2 ltr:right-0 rtl:left-0",
                                ],
                              )}
                            >
                              {cell.column.getIsPinned() && (
                                <div
                                  className={clsx(
                                    "dark:border-dark-500 pointer-events-none absolute inset-0 border-gray-200",
                                    cell.column.getIsPinned() === "left"
                                      ? "ltr:border-r rtl:border-l"
                                      : "ltr:border-l rtl:border-r",
                                  )}
                                />
                              )}

                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Td>
                          ))}
                        </Tr>
                      ))}

                      {!loading && table.getRowModel().rows.length === 0 && (
                        <Tr>
                          <Td
                            colSpan={table.getAllLeafColumns().length}
                            className="py-10 text-center"
                          >
                            موردی یافت نشد
                          </Td>
                        </Tr>
                      )}
                    </>
                  )}
                </TBody>
              </Table>
            </div>

            {/* ✅ ساختار Users: اکشن بار انتخاب ردیف‌ها */}
            <SelectedRowsActions table={table as any} />

            {total > 0 && (
              <div
                className={clsx(
                  "px-4 pb-4 sm:px-5 sm:pt-4",
                  tableSettings.enableFullScreen && "dark:bg-dark-800 bg-gray-50",
                  !(
                    table.getIsSomeRowsSelected() || table.getIsAllRowsSelected()
                  ) && "pt-4",
                )}
              >
                <PaginationSection table={table as any} total={total} />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ✅ ConfirmModal for status actions */}
      <ConfirmModal
        show={actionOpen}
        onClose={closeActionModal}
        messages={confirmMessages[actionKind]}
        onOk={onConfirmAction}
        confirmLoading={actionLoading}
        state={actionState}
      />
    </Page>
  );
}
