import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { toast } from "sonner";
import {
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Card, Button, Table, THead, TBody, Tr, Th, Td, Input, Select, Badge } from "@/components/ui";
import { CollapsibleSearch } from "@/components/shared/CollapsibleSearch";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { ConfirmModal, type ConfirmMessages, type ModalState } from "@/components/shared/ConfirmModal";

import { ticketsApi } from "@/app/services/tickets/tickets.api";
import type { Ticket, TicketStatus } from "@/app/services/tickets/tickets.types";

function StatusBadge({ value }: { value: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; color: any }> = {
    OPEN: { label: "OPEN", color: "primary" },
    IN_PROGRESS: { label: "IN_PROGRESS", color: "warning" },
    RESOLVED: { label: "RESOLVED", color: "success" },
    CLOSED: { label: "CLOSED", color: "neutral" },
  };

  const meta = map[value] ?? { label: value, color: "neutral" };
  return (
    <Badge variant="soft" color={meta.color}>
      {meta.label}
    </Badge>
  );
}

const confirmMessages: Record<
  "resolve" | "close" | "reopen",
  ConfirmMessages
> = {
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

export default function SupportTicketsPage() {
  const nav = useNavigate();

  const [items, setItems] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // filters
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<"" | TicketStatus>("");
  const [requesterId, setRequesterId] = useState("");
  const [responderId, setResponderId] = useState("");

  // UX search (subject LIKE) چون API نداره، سمت کلاینت انجام می‌دیم
  const [q, setQ] = useState("");

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // action confirm modal
  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState<"resolve" | "close" | "reopen">("resolve");
  const [actionRow, setActionRow] = useState<Ticket | null>(null);
  const [actionState, setActionState] = useState<ModalState>("pending");
  const [actionLoading, setActionLoading] = useState(false);

  const refetch = useCallback(async (forceFirstPage?: boolean) => {
    const offset = (forceFirstPage ? 0 : pageIndex) * pageSize;
    setLoading(true);
    try {
      const res = await ticketsApi.list({
        offset,
        limit: pageSize,
        company_id: companyId.trim() || undefined,
        branch_id: branchId.trim() || undefined,
        status: status || undefined,
        requester_id: requesterId.trim() || undefined,
        responder_id: responderId.trim() || undefined,
      });

      setItems(res.items || []);
      setTotal(res.total ?? 0);
      if (forceFirstPage) setPageIndex(0);
    } catch (e: any) {
      toast.error(e?.message || "خطا در دریافت لیست تیکت‌ها");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, companyId, branchId, status, requesterId, responderId]);

  // reset page on filter change
  const prevFilters = useRef({ companyId, branchId, status, requesterId, responderId, pageSize });
  useEffect(() => {
    const prev = prevFilters.current;
    const changed =
      prev.companyId !== companyId ||
      prev.branchId !== branchId ||
      prev.status !== status ||
      prev.requesterId !== requesterId ||
      prev.responderId !== responderId ||
      prev.pageSize !== pageSize;

    prevFilters.current = { companyId, branchId, status, requesterId, responderId, pageSize };

    if (changed && pageIndex !== 0) {
      setPageIndex(0);
      return;
    }

    refetch(false);
  }, [companyId, branchId, status, requesterId, responderId, pageSize, pageIndex, refetch]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((t) => (t.subject || "").toLowerCase().includes(query));
  }, [items, q]);

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      header: "Subject",
      accessorKey: "subject",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-800 dark:text-dark-100">
            {row.original.subject}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-dark-200 truncate">
            {row.original.id}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => <StatusBadge value={getValue() as TicketStatus} />,
    },
    {
      header: "Company",
      accessorKey: "company_id",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500 dark:text-dark-200">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      header: "Branch",
      accessorKey: "branch_id",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500 dark:text-dark-200">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      header: "Category",
      accessorKey: "category_id",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500 dark:text-dark-200">{String(getValue() ?? "—")}</span>
      ),
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => {
        const t = row.original;

        const openAction = (kind: "resolve" | "close" | "reopen") => {
          setActionKind(kind);
          setActionRow(t);
          setActionState("pending");
          setActionOpen(true);
        };

        return (
          <div className="flex justify-center">
            <div className="flex items-center gap-1">
              <Button
                variant="flat"
                isIcon
                className="size-8 rounded-full"
                onClick={() => nav(`/support/tickets/${t.id}`)}
                data-tooltip
                data-tooltip-content="مشاهده"
              >
                <EyeIcon className="size-4.5" />
              </Button>

              <Button
                variant="flat"
                isIcon
                className="size-8 rounded-full"
                onClick={() => openAction("resolve")}
                data-tooltip
                data-tooltip-content="Resolve"
              >
                <CheckCircleIcon className="size-4.5" />
              </Button>

              <Button
                variant="flat"
                isIcon
                className="size-8 rounded-full"
                onClick={() => openAction("close")}
                data-tooltip
                data-tooltip-content="Close"
              >
                <XMarkIcon className="size-4.5" />
              </Button>

              <Button
                variant="flat"
                isIcon
                className="size-8 rounded-full"
                onClick={() => openAction("reopen")}
                data-tooltip
                data-tooltip-content="Reopen"
              >
                <ArrowUturnLeftIcon className="size-4.5" />
              </Button>
            </div>
          </div>
        );
      },
    },
  ], [nav]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { pagination: { pageIndex, pageSize } },
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    onPaginationChange: (updater: any) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
  });

  const onConfirmAction = async () => {
    if (!actionRow) return;
    setActionLoading(true);
    try {
      if (actionKind === "resolve") await ticketsApi.resolve(actionRow.id);
      if (actionKind === "close") await ticketsApi.close(actionRow.id);
      if (actionKind === "reopen") await ticketsApi.reopen(actionRow.id);

      setActionState("success");
      await refetch(false);
    } catch (e: any) {
      setActionState("error");
      toast.error(e?.message || "خطا در انجام عملیات");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Page title="Tickets">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
              Tickets
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-200">
              لیست تیکت‌ها + فیلتر و مدیریت وضعیت
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              className="h-9 gap-2"
              onClick={() => refetch(false)}
              disabled={loading}
            >
              <ArrowPathIcon className={clsx("size-4.5", loading && "animate-spin")} />
              <span>بروزرسانی</span>
            </Button>

            <Button
              className="h-9 gap-2"
              onClick={() => nav("/support/tickets/new")}
            >
              <PlusIcon className="size-4.5" />
              <span>ایجاد تیکت</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mt-4 p-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <CollapsibleSearch
                placeholder="جستجو در Subject (کلاینتی)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              data={[
                { label: "All", value: "" },
                { label: "OPEN", value: "OPEN" },
                { label: "IN_PROGRESS", value: "IN_PROGRESS" },
                { label: "RESOLVED", value: "RESOLVED" },
                { label: "CLOSED", value: "CLOSED" },
              ]}
              classNames={{ root: "w-full lg:w-52" }}
            />

            <Input
              label="Company ID"
              placeholder="UUID"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              classNames={{ root: "w-full lg:w-72" }}
            />
            <Input
              label="Branch ID"
              placeholder="UUID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              classNames={{ root: "w-full lg:w-72" }}
            />

            <Input
              label="Requester ID"
              placeholder="UUID"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              classNames={{ root: "w-full lg:w-72" }}
            />
            <Input
              label="Responder ID"
              placeholder="UUID"
              value={responderId}
              onChange={(e) => setResponderId(e.target.value)}
              classNames={{ root: "w-full lg:w-72" }}
            />
          </div>
        </Card>

        {/* Table */}
        <Card className="relative mt-4">
          <div className="table-wrapper min-w-full overflow-x-auto">
            <Table hoverable className="w-full text-left rtl:text-right">
              <THead>
                {table.getHeaderGroups().map((hg) => (
                  <Tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <Th key={h.id} className="bg-gray-200 font-semibold text-gray-800 dark:bg-dark-800 dark:text-dark-100">
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </Th>
                    ))}
                  </Tr>
                ))}
              </THead>

              <TBody>
                {loading ? (
                  <Tr>
                    <Td colSpan={columns.length}>
                      <div className="py-10 text-center text-sm text-gray-500 dark:text-dark-200">
                        در حال دریافت...
                      </div>
                    </Td>
                  </Tr>
                ) : filteredItems.length ? (
                  table.getRowModel().rows.map((row) => (
                    <Tr key={row.id} className="border-b border-gray-200 dark:border-dark-500">
                      {row.getVisibleCells().map((cell) => (
                        <Td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Td>
                      ))}
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={columns.length}>
                      <div className="py-10 text-center text-sm text-gray-500 dark:text-dark-200">
                        موردی یافت نشد.
                      </div>
                    </Td>
                  </Tr>
                )}
              </TBody>
            </Table>
          </div>

          {!!filteredItems.length && (
            <div className="p-4 sm:px-5">
              <PaginationSection table={table as any} />
            </div>
          )}
        </Card>
      </div>

      <ConfirmModal
        show={actionOpen}
        onClose={() => !actionLoading && setActionOpen(false)}
        messages={confirmMessages[actionKind]}
        onOk={onConfirmAction}
        confirmLoading={actionLoading}
        state={actionState}
      />
    </Page>
  );
}
