// Import Dependencies
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

// Local Imports
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
  Input,
} from "@/components/ui";
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";
import { CollapsibleSearch } from "@/components/shared/CollapsibleSearch";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { useBoxSize } from "@/hooks";
import { companiesApi } from "@/app/services/companies/companies.api";
import type { Company } from "@/app/services/companies/companies.types";

// ----------------------------------------------------------------------
// Modal shell (same style as users page)

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

// ----------------------------------------------------------------------
// Confirm texts

const deleteConfirmMessages: ConfirmMessages = {
  pending: {
    description:
      "آیا مطمئن هستید که می‌خواهید این شرکت را حذف کنید؟ پس از حذف، امکان بازیابی وجود ندارد.",
  },
  success: { title: "شرکت حذف شد" },
};

// ----------------------------------------------------------------------
// Page

export default function SupportCompaniesPage() {
  // server state
  const [items, setItems] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);

  // ui state
  const [loading, setLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState("");

  // table pagination state (tanstack)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // sorting (optional)
  const [sorting, setSorting] = useState<SortingState>([]);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [activeRow, setActiveRow] = useState<Company | null>(null);

  // delete confirm modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<ModalState>("pending");

  const refetchCompanies = useCallback(
    async (forceFirstPage?: boolean) => {
      const nextOffset = (forceFirstPage ? 0 : pageIndex) * pageSize;

      setLoading(true);
      try {
        const res = await companiesApi.list({
          offset: nextOffset,
          limit: pageSize,
          name: nameFilter.trim() || undefined,
        });

        setItems(res.items || []);
        setTotal(res.total ?? 0);

        if (forceFirstPage) setPageIndex(0);
      } catch (e: any) {
        toast.error(e?.message || "خطا در دریافت لیست شرکت‌ها");
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, pageSize, nameFilter],
  );

  // when filter/pageSize changes -> go to page 0 before fetch
  const prevFiltersRef = useRef({ nameFilter, pageSize });

  useEffect(() => {
    const prev = prevFiltersRef.current;

    const filtersChanged =
      prev.nameFilter !== nameFilter || prev.pageSize !== pageSize;

    prevFiltersRef.current = { nameFilter, pageSize };

    if (filtersChanged && pageIndex !== 0) {
      setPageIndex(0);
      return;
    }

    refetchCompanies(false);
  }, [nameFilter, pageSize, pageIndex, refetchCompanies]);

  // columns
  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        header: "نام شرکت",
        accessorKey: "name",
        cell: ({ getValue }) => (
          <div className="font-medium text-gray-800 dark:text-dark-100">
            {String(getValue() ?? "")}
          </div>
        ),
      },
      {
        header: "کد",
        accessorKey: "code",
        cell: ({ getValue }) => (
          <span className="text-xs text-gray-500 dark:text-dark-200">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        header: "ID",
        accessorKey: "id",
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
          const c = row.original;

          const openEdit = () => {
            setActiveRow(c);
            setEditOpen(true);
          };

          const openDelete = () => {
            setActiveRow(c);
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
    state: { sorting, pagination: { pageIndex, pageSize } },
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

  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const resetCreate = () => {
    setCreateName("");
    setCreateCode("");
  };

  const submitCreate = async () => {
    const name = createName.trim();
    const code = createCode.trim();

    if (!name) return toast.error("نام شرکت را وارد کنید");

    setCreateSubmitting(true);
    try {
      await companiesApi.create({ name, code: code || undefined });

      toast.success("شرکت ایجاد شد");
      setCreateOpen(false);
      resetCreate();

      await refetchCompanies(true);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد شرکت");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Edit form

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!editOpen || !activeRow) return;
    setEditName(activeRow.name || "");
    setEditCode(activeRow.code || "");
  }, [editOpen, activeRow]);

  const submitEdit = async () => {
    if (!activeRow) return;

    const name = editName.trim();
    const code = editCode.trim();

    if (!name) return toast.error("نام شرکت را وارد کنید");

    setEditSubmitting(true);
    try {
      await companiesApi.update(activeRow.id, {
        name,
        code: code ? code : null,
      });

      toast.success("شرکت به‌روزرسانی شد");
      setEditOpen(false);
      setActiveRow(null);

      await refetchCompanies(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ویرایش شرکت");
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
      await companiesApi.remove(activeRow.id);
      setDeleteState("success");
      toast.success("شرکت حذف شد");

      await refetchCompanies(true);
    } catch (e: any) {
      setDeleteState("error");
      toast.error(e?.message || "خطا در حذف شرکت");
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // ----------------------------------------------------------------------

  return (
    <Page title="شرکت‌ها">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                شرکت‌ها
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-dark-200">
                مدیریت شرکت‌ها (لیست، ایجاد، ویرایش، حذف)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                className="h-9 gap-2"
                onClick={() => refetchCompanies(false)}
                disabled={loading}
              >
                <ArrowPathIcon className="size-4.5" />
                <span>{loading ? "در حال بروزرسانی..." : "بروزرسانی"}</span>
              </Button>

              <Button className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4.5" />
                <span>ایجاد شرکت</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mt-4 p-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <CollapsibleSearch
                  placeholder="جستجوی نام شرکت (LIKE)..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
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
                <PaginationSection table={table as any} total={total} />
              </div>
            )}

            <div style={{ height: theadHeight ? 0 : 0 }} />
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <ModalShell
        show={createOpen}
        title="ایجاد شرکت"
        onClose={() => {
          if (createSubmitting) return;
          setCreateOpen(false);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="نام شرکت"
            placeholder="Global Org"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Input
            label="کد (اختیاری)"
            placeholder="GLOB"
            value={createCode}
            onChange={(e) => setCreateCode(e.target.value)}
          />
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
        title={`ویرایش شرکت${activeRow?.name ? `: ${activeRow.name}` : ""}`}
        onClose={() => {
          if (editSubmitting) return;
          setEditOpen(false);
          setActiveRow(null);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="نام شرکت"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="کد"
            placeholder="اختیاری"
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
          />
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
