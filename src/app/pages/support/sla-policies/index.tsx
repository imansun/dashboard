// src/app/pages/support/sla-policies/index.tsx
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  PencilIcon,
  TrashIcon,
  XCircleIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  Badge,
  Input,
  Select,
} from "@/components/ui";
import { CollapsibleSearch } from "@/components/shared/CollapsibleSearch";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { StyledSwitch } from "@/components/shared/form/StyledSwitch";
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";
import { useBoxSize } from "@/hooks";

import { slaPoliciesApi } from "@/app/services/slaPolicies/slaPolicies.api";
import type { SlaPolicy } from "@/app/services/slaPolicies/slaPolicies.types";

// ----------------------------------------------------------------------

function ModalShell({
  show,
  title,
  onClose,
  children,
  className,
}: {
  show: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6 sm:px-5"
        onClose={onClose}
      >
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40"
        />
        <TransitionChild
          as={DialogPanel}
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-2"
          className={clsx(
            "relative w-full max-w-xl overflow-hidden rounded-lg bg-white p-5 shadow-soft dark:bg-dark-700 dark:shadow-none",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-base font-medium tracking-wide text-gray-800 dark:text-dark-100">
              {title}
            </h3>
            <Button
              variant="flat"
              isIcon
              className="size-8 rounded-full"
              onClick={onClose}
            >
              <XCircleIcon className="size-5" />
            </Button>
          </div>
          <div className="mt-4">{children}</div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}

const deleteConfirmMessages: ConfirmMessages = {
  pending: {
    description:
      "آیا مطمئن هستید که می‌خواهید این SLA را حذف کنید؟ پس از حذف، امکان بازیابی وجود ندارد.",
  },
  success: { title: "SLA حذف شد" },
};

function ActiveBadge({ value }: { value: boolean }) {
  return value ? (
    <Badge variant="soft" color="success">
      Active
    </Badge>
  ) : (
    <Badge variant="soft" color="neutral">
      Inactive
    </Badge>
  );
}

function MinutesCell({ value }: { value: number }) {
  return (
    <span className="text-sm text-gray-700 dark:text-dark-100">
      {Number.isFinite(value) ? `${value} min` : "—"}
    </span>
  );
}

function safeInt(value: string, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

// ----------------------------------------------------------------------

export default function SupportSlaPoliciesPage() {
  // server state
  const [items, setItems] = useState<SlaPolicy[]>([]);
  const [total, setTotal] = useState(0);

  // ui state
  const [loading, setLoading] = useState(false);

  // filters
  const [companyId, setCompanyId] = useState("");
  const [nameLike, setNameLike] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // sorting (optional)
  const [sorting, setSorting] = useState<SortingState>([]);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<SlaPolicy | null>(null);

  // delete confirm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<ModalState>("pending");

  const refetchPolicies = useCallback(
    async (forceFirstPage?: boolean) => {
      const nextOffset = (forceFirstPage ? 0 : pageIndex) * pageSize;

      setLoading(true);
      try {
        const res = await slaPoliciesApi.list({
          offset: nextOffset,
          limit: pageSize,
          company_id: companyId.trim() || undefined,
          name: nameLike.trim() || undefined,
          is_active:
            activeFilter === ""
              ? undefined
              : activeFilter === "true",
        });

        setItems(res.items || []);
        setTotal(res.total ?? 0);

        if (forceFirstPage) setPageIndex(0);
      } catch (e: any) {
        toast.error(e?.message || "خطا در دریافت لیست SLA ها");
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, pageSize, companyId, nameLike, activeFilter],
  );

  const prevFiltersRef = useRef({
    companyId,
    nameLike,
    activeFilter,
    pageSize,
  });

  useEffect(() => {
    const prev = prevFiltersRef.current;

    const filtersChanged =
      prev.companyId !== companyId ||
      prev.nameLike !== nameLike ||
      prev.activeFilter !== activeFilter ||
      prev.pageSize !== pageSize;

    prevFiltersRef.current = { companyId, nameLike, activeFilter, pageSize };

    if (filtersChanged && pageIndex !== 0) {
      setPageIndex(0);
      return;
    }

    refetchPolicies(false);
  }, [companyId, nameLike, activeFilter, pageSize, pageIndex, refetchPolicies]);

  // ----------------------------------------------------------------------
  // columns

  const columns = useMemo<ColumnDef<SlaPolicy>[]>(
    () => [
      {
        header: "نام",
        accessorKey: "name",
        cell: ({ getValue }) => (
          <div className="font-medium text-gray-800 dark:text-dark-100">
            {String(getValue() ?? "")}
          </div>
        ),
      },
      {
        header: "توضیحات",
        accessorKey: "description",
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500 dark:text-dark-200 line-clamp-2">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        header: "First Response",
        accessorKey: "target_first_response_minutes",
        cell: ({ getValue }) => <MinutesCell value={Number(getValue() ?? 0)} />,
      },
      {
        header: "Resolution",
        accessorKey: "target_resolution_minutes",
        cell: ({ getValue }) => <MinutesCell value={Number(getValue() ?? 0)} />,
      },
      {
        header: "وضعیت",
        accessorKey: "is_active",
        cell: ({ getValue }) => <ActiveBadge value={!!getValue()} />,
      },
      {
        header: "Company ID",
        accessorKey: "company_id",
        cell: ({ getValue }) => (
          <span className="text-xs text-gray-500 dark:text-dark-200">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        header: "عملیات",
        id: "actions",
        cell: ({ row }) => {
          const p = row.original;

          const openEdit = () => {
            setActiveRow(p);
            setEditOpen(true);
          };

          const openDelete = () => {
            setActiveRow(p);
            setDeleteState("pending");
            setDeleteModalOpen(true);
          };

          return (
            <div className="flex justify-center">
              <div className="flex items-center gap-1">
                <Button
                  variant="flat"
                  isIcon
                  className="size-8 rounded-full"
                  onClick={openEdit}
                  data-tooltip
                  data-tooltip-content="ویرایش"
                  data-tooltip-place="top"
                >
                  <PencilIcon className="size-4.5" />
                </Button>

                <Button
                  variant="flat"
                  isIcon
                  className="size-8 rounded-full text-error dark:text-error-light"
                  onClick={openDelete}
                  data-tooltip
                  data-tooltip-content="حذف"
                  data-tooltip-place="top"
                >
                  <TrashIcon className="size-4.5" />
                </Button>
              </div>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    onPaginationChange: (updater: any) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
  });

  const theadRef = useRef<HTMLTableSectionElement>(null);
  const { height: theadHeight } = useBoxSize({ ref: theadRef });

  // ----------------------------------------------------------------------
  // Create form

  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createFirst, setCreateFirst] = useState("15");
  const [createResolution, setCreateResolution] = useState("240");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const resetCreate = () => {
    setCreateCompanyId("");
    setCreateName("");
    setCreateDescription("");
    setCreateFirst("15");
    setCreateResolution("240");
    setCreateIsActive(true);
  };

  const submitCreate = async () => {
    const _company = createCompanyId.trim();
    const _name = createName.trim();
    const _desc = createDescription.trim();

    if (!_company) return toast.error("Company ID را وارد کنید");
    if (!_name) return toast.error("نام SLA را وارد کنید");

    const first = safeInt(createFirst, 0);
    const res = safeInt(createResolution, 0);

    setCreateSubmitting(true);
    try {
      await slaPoliciesApi.create({
        company_id: _company,
        name: _name,
        description: _desc ? _desc : null,
        target_first_response_minutes: first,
        target_resolution_minutes: res,
        is_active: createIsActive,
      });

      toast.success("SLA ایجاد شد");
      setCreateOpen(false);
      resetCreate();

      await refetchPolicies(true);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد SLA");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Edit form

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFirst, setEditFirst] = useState("0");
  const [editResolution, setEditResolution] = useState("0");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!editOpen || !activeRow) return;
    setEditName(activeRow.name || "");
    setEditDescription(activeRow.description ?? "");
    setEditFirst(String(activeRow.target_first_response_minutes ?? 0));
    setEditResolution(String(activeRow.target_resolution_minutes ?? 0));
    setEditIsActive(!!activeRow.is_active);
  }, [editOpen, activeRow]);

  const submitEdit = async () => {
    if (!activeRow) return;

    const _name = editName.trim();
    const _desc = editDescription.trim();

    if (!_name) return toast.error("نام SLA را وارد کنید");

    const first = safeInt(editFirst, activeRow.target_first_response_minutes ?? 0);
    const res = safeInt(editResolution, activeRow.target_resolution_minutes ?? 0);

    setEditSubmitting(true);
    try {
      await slaPoliciesApi.update(activeRow.id, {
        name: _name,
        description: _desc ? _desc : null,
        target_first_response_minutes: first,
        target_resolution_minutes: res,
        is_active: editIsActive,
      });

      toast.success("SLA به‌روزرسانی شد");
      setEditOpen(false);
      setActiveRow(null);

      await refetchPolicies(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ویرایش SLA");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Delete flow

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setConfirmDeleteLoading(false);
    setDeleteState("pending");
  };

  const onConfirmDelete = async () => {
    if (!activeRow) return;

    setConfirmDeleteLoading(true);
    setDeleteState("pending");
    try {
      await slaPoliciesApi.remove(activeRow.id);
      setDeleteState("success");
      toast.success("SLA حذف شد");

      await refetchPolicies(true);
    } catch (e: any) {
      setDeleteState("error");
      toast.error(e?.message || "خطا در حذف SLA");
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // ----------------------------------------------------------------------

  return (
    <Page title="SLA Policies">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                SLA Policies
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-dark-200">
                مدیریت SLA (لیست، ایجاد، ویرایش، حذف)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                className="h-9 gap-2"
                onClick={() => refetchPolicies(false)}
                disabled={loading}
              >
                <ArrowPathIcon className="size-4.5" />
                <span>{loading ? "در حال بروزرسانی..." : "بروزرسانی"}</span>
              </Button>
              <Button className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4.5" />
                <span>ایجاد SLA</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mt-4 p-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <CollapsibleSearch
                  placeholder="فیلتر نام (LIKE)..."
                  value={nameLike}
                  onChange={(e) => setNameLike(e.target.value)}
                />
              </div>

              <Select
                label="وضعیت"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                data={[
                  { label: "همه", value: "" },
                  { label: "فعال", value: "true" },
                  { label: "غیرفعال", value: "false" },
                ]}
                classNames={{ root: "w-full lg:w-44" }}
              />

              <Input
                label="Company ID"
                placeholder="UUID"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                classNames={{ root: "w-full lg:w-72" }}
              />
            </div>
          </Card>

          {/* Table */}
          <Card className="relative mt-4">
            <div className="table-wrapper min-w-full overflow-x-auto">
              <Table hoverable className="w-full text-left rtl:text-right">
                <THead ref={theadRef}>
                  {table.getHeaderGroups().map((hg) => (
                    <Tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <Th
                          key={h.id}
                          className="bg-gray-200 font-semibold text-gray-800 uppercase dark:bg-dark-800 dark:text-dark-100 first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg first:rtl:rounded-tr-lg last:rtl:rounded-tl-lg"
                        >
                          {h.isPlaceholder
                            ? null
                            : flexRender(h.column.columnDef.header, h.getContext())}
                        </Th>
                      ))}
                    </Tr>
                  ))}
                </THead>

                <TBody>
                  {loading ? (
                    <Tr>
                      <Td colSpan={columns.length}>
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-dark-200">
                          <ArrowPathIcon className="size-5 animate-spin" />
                          <span>در حال دریافت اطلاعات...</span>
                        </div>
                      </Td>
                    </Tr>
                  ) : items.length ? (
                    table.getRowModel().rows.map((row) => (
                      <Tr
                        key={row.id}
                        className={clsx(
                          "relative border-y border-transparent border-b-gray-200 dark:border-b-dark-500",
                        )}
                      >
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

            {!!items.length && (
              <div className="p-4 sm:px-5">
                <PaginationSection table={table as any} />
              </div>
            )}

            <div style={{ height: theadHeight ? 0 : 0 }} />
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <ModalShell
        show={createOpen}
        title="ایجاد SLA"
        onClose={() => {
          if (createSubmitting) return;
          setCreateOpen(false);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Company ID"
            placeholder="UUID"
            value={createCompanyId}
            onChange={(e) => setCreateCompanyId(e.target.value)}
          />
          <Input
            label="Name"
            placeholder="CRITICAL_DEFAULT"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Input
            label="First Response (minutes)"
            type="number"
            min={0}
            value={createFirst}
            onChange={(e) => setCreateFirst(e.target.value)}
          />
          <Input
            label="Resolution (minutes)"
            type="number"
            min={0}
            value={createResolution}
            onChange={(e) => setCreateResolution(e.target.value)}
          />
          <Input
            label="Description (اختیاری)"
            placeholder="..."
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            classNames={{ root: "sm:col-span-2" }}
          />

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-500">
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-dark-100">
                  فعال باشد
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-dark-200">
                  اگر خاموش باشد، policy غیرفعال ایجاد می‌شود.
                </div>
              </div>
              <StyledSwitch
                checked={createIsActive}
                onChange={(v) => setCreateIsActive(v)}
                loading={false}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outlined"
            className="h-9"
            onClick={() => setCreateOpen(false)}
            disabled={createSubmitting}
          >
            لغو
          </Button>
          <Button className="h-9 gap-2" onClick={submitCreate} disabled={createSubmitting}>
            {createSubmitting ? (
              <ArrowPathIcon className="size-4.5 animate-spin" />
            ) : (
              <PlusIcon className="size-4.5" />
            )}
            <span>ایجاد</span>
          </Button>
        </div>
      </ModalShell>

      {/* Edit Modal */}
      <ModalShell
        show={editOpen}
        title={`ویرایش SLA${activeRow?.name ? `: ${activeRow.name}` : ""}`}
        onClose={() => {
          if (editSubmitting) return;
          setEditOpen(false);
          setActiveRow(null);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Company ID"
            value={activeRow?.company_id ?? ""}
            disabled
            classNames={{ root: "sm:col-span-2" }}
          />
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input
            label="First Response (minutes)"
            type="number"
            min={0}
            value={editFirst}
            onChange={(e) => setEditFirst(e.target.value)}
          />
          <Input
            label="Resolution (minutes)"
            type="number"
            min={0}
            value={editResolution}
            onChange={(e) => setEditResolution(e.target.value)}
          />
          <Input
            label="Description (اختیاری)"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            classNames={{ root: "sm:col-span-2" }}
          />

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-500">
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-dark-100">
                  فعال باشد
                </div>
              </div>
              <StyledSwitch
                checked={editIsActive}
                onChange={(v) => setEditIsActive(v)}
                loading={false}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outlined"
            className="h-9"
            onClick={() => {
              setEditOpen(false);
              setActiveRow(null);
            }}
            disabled={editSubmitting}
          >
            لغو
          </Button>
          <Button className="h-9 gap-2" onClick={submitEdit} disabled={editSubmitting}>
            {editSubmitting ? (
              <ArrowPathIcon className="size-4.5 animate-spin" />
            ) : (
              <PencilIcon className="size-4.5" />
            )}
            <span>ذخیره</span>
          </Button>
        </div>
      </ModalShell>

      {/* Delete ConfirmModal */}
      <ConfirmModal
        show={deleteModalOpen}
        onClose={() => {
          if (!confirmDeleteLoading) closeDeleteModal();
        }}
        messages={deleteConfirmMessages}
        onOk={onConfirmDelete}
        confirmLoading={confirmDeleteLoading}
        state={deleteState}
      />
    </Page>
  );
}
