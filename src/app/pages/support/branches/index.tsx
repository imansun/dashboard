// src/app/pages/support/branches/index.tsx
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
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
  Input,
  Select,
  Badge,
} from "@/components/ui";
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";
import { CollapsibleSearch } from "@/components/shared/CollapsibleSearch";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { useBoxSize } from "@/hooks";

import { branchesApi } from "@/app/services/branches/branches.api";
import type {
  Branch,
  BranchesListQuery,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "@/app/services/branches/branches.types";

// ----------------------------------------------------------------------
// Modal shell (same pattern as users page)
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
            <Button variant="flat" isIcon className="size-8 rounded-full" onClick={onClose}>
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
const deleteConfirmMessages: ConfirmMessages = {
  pending: {
    description:
      "آیا مطمئن هستید که می‌خواهید این شعبه را حذف کنید؟ پس از حذف، امکان بازیابی وجود ندارد.",
  },
  success: { title: "شعبه حذف شد" },
};

function normalizeCountry(v: string) {
  return v.trim().toUpperCase();
}

function isIso2(v: string) {
  const s = normalizeCountry(v);
  return /^[A-Z]{2}$/.test(s);
}

// ----------------------------------------------------------------------
export default function SupportBranchesPage() {
  // server state
  const [items, setItems] = useState<Branch[]>([]);
  const [total, setTotal] = useState(0);

  // ui state
  const [loading, setLoading] = useState(false);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [companyIdFilter, setCompanyIdFilter] = useState("");

  // table pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([]);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Branch | null>(null);

  // delete confirm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<ModalState>("pending");

  const refetch = useCallback(
    async (forceFirstPage?: boolean) => {
      const nextOffset = (forceFirstPage ? 0 : pageIndex) * pageSize;

      setLoading(true);
      try {
        const query: BranchesListQuery = {
          offset: nextOffset,
          limit: pageSize,
          company_id: companyIdFilter.trim() || undefined,
          name: nameFilter.trim() || undefined,
          city: cityFilter.trim() || undefined,
          country: normalizeCountry(countryFilter) || undefined,
        };

        const res = await branchesApi.list(query);
        setItems(res.items || []);
        setTotal(res.total ?? 0);

        if (forceFirstPage) setPageIndex(0);
      } catch (e: any) {
        toast.error(e?.message || "خطا در دریافت لیست شعبه‌ها");
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, pageSize, companyIdFilter, nameFilter, cityFilter, countryFilter],
  );

  // same “filters change -> pageIndex=0 then fetch” pattern as users
  const prevFiltersRef = useRef({
    nameFilter,
    cityFilter,
    countryFilter,
    companyIdFilter,
    pageSize,
  });

  useEffect(() => {
    const prev = prevFiltersRef.current;

    const filtersChanged =
      prev.nameFilter !== nameFilter ||
      prev.cityFilter !== cityFilter ||
      prev.countryFilter !== countryFilter ||
      prev.companyIdFilter !== companyIdFilter ||
      prev.pageSize !== pageSize;

    prevFiltersRef.current = {
      nameFilter,
      cityFilter,
      countryFilter,
      companyIdFilter,
      pageSize,
    };

    if (filtersChanged && pageIndex !== 0) {
      setPageIndex(0);
      return;
    }

    refetch(false);
  }, [nameFilter, cityFilter, countryFilter, companyIdFilter, pageSize, pageIndex, refetch]);

  // ----------------------------------------------------------------------
  // columns
  const columns = useMemo<ColumnDef<Branch>[]>(
    () => [
      {
        header: "نام شعبه",
        accessorKey: "name",
        cell: ({ getValue }) => (
          <div className="font-medium text-gray-800 dark:text-dark-100">
            {String(getValue() ?? "")}
          </div>
        ),
      },
      {
        header: "شرکت",
        accessorKey: "company_id",
        cell: ({ getValue }) => (
          <span className="text-xs text-gray-500 dark:text-dark-200">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        header: "کشور",
        accessorKey: "country",
        cell: ({ getValue }) => {
          const v = String(getValue() ?? "");
          return v ? (
            <Badge variant="outlined" className="uppercase">
              {v}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400 dark:text-dark-300">—</span>
          );
        },
      },
      {
        header: "شهر",
        accessorKey: "city",
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-700 dark:text-dark-100">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        header: "Timezone",
        accessorKey: "timezone",
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
          const b = row.original;

          const openEdit = () => {
            setActiveRow(b);
            setEditOpen(true);
          };

          const openDelete = () => {
            setActiveRow(b);
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
  // Create modal state
  const [cCompanyId, setCCompanyId] = useState("");
  const [cName, setCName] = useState("");
  const [cCountry, setCCountry] = useState("AZ");
  const [cCity, setCCity] = useState("Baku");
  const [cTimezone, setCTimezone] = useState("Asia/Baku");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const resetCreate = () => {
    setCCompanyId("");
    setCName("");
    setCCountry("AZ");
    setCCity("Baku");
    setCTimezone("Asia/Baku");
  };

  const submitCreate = async () => {
    const payload: CreateBranchPayload = {
      company_id: cCompanyId.trim(),
      name: cName.trim(),
      country: normalizeCountry(cCountry),
      city: cCity.trim(),
      timezone: cTimezone.trim(),
    };

    if (!payload.company_id) return toast.error("company_id را وارد کنید");
    if (!payload.name) return toast.error("نام شعبه را وارد کنید");
    if (!payload.city) return toast.error("شهر را وارد کنید");
    if (!payload.timezone) return toast.error("timezone را وارد کنید");
    if (!isIso2(payload.country)) return toast.error("کد کشور باید ۲ حرفی باشد (مثل AZ)");

    setCreateSubmitting(true);
    try {
      await branchesApi.create(payload);
      toast.success("شعبه ایجاد شد");
      setCreateOpen(false);
      resetCreate();
      await refetch(true);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد شعبه");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Edit modal state
  const [eName, setEName] = useState("");
  const [eCountry, setECountry] = useState("");
  const [eCity, setECity] = useState("");
  const [eTimezone, setETimezone] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!editOpen || !activeRow) return;
    setEName(activeRow.name || "");
    setECountry(activeRow.country || "");
    setECity(activeRow.city || "");
    setETimezone(activeRow.timezone || "");
  }, [editOpen, activeRow]);

  const submitEdit = async () => {
    if (!activeRow) return;

    const payload: UpdateBranchPayload = {
      name: eName.trim() || undefined,
      country: eCountry.trim() ? normalizeCountry(eCountry) : undefined,
      city: eCity.trim() || undefined,
      timezone: eTimezone.trim() || undefined,
    };

    if (payload.country && !isIso2(payload.country)) {
      return toast.error("کد کشور باید ۲ حرفی باشد (مثل AZ)");
    }

    setEditSubmitting(true);
    try {
      await branchesApi.update(activeRow.id, payload);
      toast.success("شعبه به‌روزرسانی شد");
      setEditOpen(false);
      setActiveRow(null);
      await refetch(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ویرایش شعبه");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // delete flow
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
      await branchesApi.remove(activeRow.id);
      setDeleteState("success");
      toast.success("شعبه حذف شد");
      await refetch(true);
    } catch (e: any) {
      setDeleteState("error");
      toast.error(e?.message || "خطا در حذف شعبه");
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  return (
    <Page title="شعبه‌ها">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                شعبه‌ها
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-dark-200">
                مدیریت شعبه‌ها (لیست، ایجاد، ویرایش، حذف)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                className="h-9 gap-2"
                onClick={() => refetch(false)}
                disabled={loading}
              >
                <ArrowPathIcon className="size-4.5" />
                <span>{loading ? "در حال بروزرسانی..." : "بروزرسانی"}</span>
              </Button>
              <Button className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4.5" />
                <span>ایجاد شعبه</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mt-4 p-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <CollapsibleSearch
                  placeholder="فیلتر نام شعبه (LIKE)..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>

              <Input
                label="City (LIKE)"
                placeholder="Baku"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                classNames={{ root: "w-full lg:w-56" }}
              />

              <Input
                label="Country"
                placeholder="AZ"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                classNames={{ root: "w-full lg:w-44" }}
              />

              <Input
                label="Company ID"
                placeholder="UUID"
                value={companyIdFilter}
                onChange={(e) => setCompanyIdFilter(e.target.value)}
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
        title="ایجاد شعبه"
        onClose={() => {
          if (createSubmitting) return;
          setCreateOpen(false);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Company ID"
            placeholder="UUID"
            value={cCompanyId}
            onChange={(e) => setCCompanyId(e.target.value)}
          />
          <Input
            label="Name"
            placeholder="HQ Baku"
            value={cName}
            onChange={(e) => setCName(e.target.value)}
          />
          <Input
            label="Country (ISO2)"
            placeholder="AZ"
            value={cCountry}
            onChange={(e) => setCCountry(e.target.value)}
          />
          <Input
            label="City"
            placeholder="Baku"
            value={cCity}
            onChange={(e) => setCCity(e.target.value)}
          />
          <Input
            label="Timezone (IANA)"
            placeholder="Asia/Baku"
            value={cTimezone}
            onChange={(e) => setCTimezone(e.target.value)}
            classNames={{ root: "sm:col-span-2" }}
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
        title={`ویرایش شعبه${activeRow?.name ? `: ${activeRow.name}` : ""}`}
        onClose={() => {
          if (editSubmitting) return;
          setEditOpen(false);
          setActiveRow(null);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Name" value={eName} onChange={(e) => setEName(e.target.value)} />
          <Input
            label="Country (ISO2)"
            value={eCountry}
            onChange={(e) => setECountry(e.target.value)}
          />
          <Input label="City" value={eCity} onChange={(e) => setECity(e.target.value)} />
          <Input
            label="Timezone"
            value={eTimezone}
            onChange={(e) => setETimezone(e.target.value)}
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
