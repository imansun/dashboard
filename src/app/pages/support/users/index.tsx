// src/app/pages/support/users/index.tsx
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
  KeyIcon,
  XCircleIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Local Imports
import { Page } from "@/components/shared/Page";
import { authedHttp } from "@/app/services/authedHttp";
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
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";
import { CollapsibleSearch } from "@/components/shared/CollapsibleSearch";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { StyledSwitch } from "@/components/shared/form/StyledSwitch";
import { useBoxSize } from "@/hooks";

// ----------------------------------------------------------------------
// Types

type ApiList<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

type User = {
  id: string;
  email: string;
  is_active: boolean;
  company_id: string | null;
  branch_id: string | null;

  // optional (depends on your backend)
  role?: string;
  roles?: string[];
  perms?: string[];
};

// ----------------------------------------------------------------------
// API helpers

const usersApi = {
  list: (params: {
    offset?: number;
    limit?: number;
    email?: string;
    company_id?: string;
    branch_id?: string;
    is_active?: boolean | null;
  }) =>
    authedHttp.get<ApiList<User>>("/api/v1/users", {
      params: {
        offset: params.offset ?? 0,
        limit: params.limit ?? 20,
        email: params.email || undefined,
        company_id: params.company_id || undefined,
        branch_id: params.branch_id || undefined,
        is_active:
          params.is_active === null || params.is_active === undefined
            ? undefined
            : String(params.is_active),
      },
    }),

  create: (body: {
    email: string;
    password: string;
    is_active?: boolean;
    company_id?: string;
    branch_id?: string;
  }) => authedHttp.post<User>("/api/v1/users", body),

  update: (
    id: string,
    body: Partial<Pick<User, "email" | "company_id" | "branch_id" | "is_active">>,
  ) => authedHttp.patch<User>(`/api/v1/users/${id}`, body),

  remove: (id: string) =>
    authedHttp.delete<{ message?: string }>(`/api/v1/users/${id}`),

  activate: (id: string) =>
    authedHttp.post<{ message?: string }>(`/api/v1/users/${id}/activate`),

  deactivate: (id: string) =>
    authedHttp.post<{ message?: string }>(`/api/v1/users/${id}/deactivate`),

  changePassword: (id: string, new_password: string) =>
    authedHttp.post<{ message?: string }>(`/api/v1/users/${id}/change-password`, {
      new_password,
    }),
};

// ----------------------------------------------------------------------
// Small UI helpers

function RoleBadges({ user }: { user: User }) {
  const roles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
  if (!roles.length)
    return <span className="text-xs text-gray-400 dark:text-dark-300">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {roles.slice(0, 3).map((r) => (
        <Badge key={r} variant="outlined" className="capitalize">
          {r}
        </Badge>
      ))}
      {roles.length > 3 && (
        <Badge variant="soft" color="neutral">
          +{roles.length - 3}
        </Badge>
      )}
    </div>
  );
}

function StatusCell({
  value,
  onToggle,
  loading,
}: {
  value: boolean;
  loading: boolean;
  onToggle: (next: boolean) => void;
}) {
  return <StyledSwitch checked={value} onChange={onToggle} loading={loading} />;
}

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
// Page

const deleteConfirmMessages: ConfirmMessages = {
  pending: {
    description:
      "آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟ پس از حذف، امکان بازیابی وجود ندارد.",
  },
  success: { title: "کاربر حذف شد" },
};

export default function SupportUsersPage() {
  // server state
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  // ui state
  const [loading, setLoading] = useState(false);
  const [globalEmail, setGlobalEmail] = useState(""); // maps to `email` filter (exact)
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");

  // table pagination state (tanstack)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // sorting (optional)
  const [sorting, setSorting] = useState<SortingState>([]);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [activeRow, setActiveRow] = useState<User | null>(null);

  // delete confirm modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<ModalState>("pending");

  // per-row status loading
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // ✅ helper (fetch + optional force first page)
  const refetchUsers = useCallback(
    async (forceFirstPage?: boolean) => {
      const nextOffset = (forceFirstPage ? 0 : pageIndex) * pageSize;

      setLoading(true);
      try {
        const res = await usersApi.list({
          offset: nextOffset,
          limit: pageSize,
          email: globalEmail.trim() || undefined,
          company_id: companyId.trim() || undefined,
          branch_id: branchId.trim() || undefined,
          is_active: activeFilter === "" ? null : activeFilter === "true",
        });

        setItems(res.items || []);
        setTotal(res.total ?? 0);

        if (forceFirstPage) setPageIndex(0);
      } catch (e: any) {
        toast.error(e?.message || "خطا در دریافت لیست کاربران");
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, pageSize, globalEmail, companyId, branchId, activeFilter],
  );

  // ✅ Single effect: when filters/pageSize change, ensure pageIndex=0 before fetching
  const prevFiltersRef = useRef({
    globalEmail,
    activeFilter,
    companyId,
    branchId,
    pageSize,
  });

  useEffect(() => {
    const prev = prevFiltersRef.current;

    const filtersChanged =
      prev.globalEmail !== globalEmail ||
      prev.activeFilter !== activeFilter ||
      prev.companyId !== companyId ||
      prev.branchId !== branchId ||
      prev.pageSize !== pageSize;

    prevFiltersRef.current = {
      globalEmail,
      activeFilter,
      companyId,
      branchId,
      pageSize,
    };

    // اگر فیلترها/سایز صفحه عوض شد و صفحه فعلی ۰ نیست، اول صفحه رو ۰ کن، fetch در رندر بعدی انجام میشه
    if (filtersChanged && pageIndex !== 0) {
      setPageIndex(0);
      return;
    }

    // fetch (برای init، تغییر pageIndex، یا وقتی فیلترها عوض شدن و pageIndex=0 هست)
    refetchUsers(false);
  }, [globalEmail, activeFilter, companyId, branchId, pageSize, pageIndex, refetchUsers]);

  // columns
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        header: "ایمیل",
        accessorKey: "email",
        cell: ({ getValue }) => (
          <div className="font-medium text-gray-800 dark:text-dark-100">
            {String(getValue() ?? "")}
          </div>
        ),
      },
      {
        header: "نقش‌ها",
        id: "roles",
        cell: ({ row }) => <RoleBadges user={row.original} />,
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
        header: "شعبه",
        accessorKey: "branch_id",
        cell: ({ getValue }) => (
          <span className="text-xs text-gray-500 dark:text-dark-200">
            {String(getValue() ?? "—")}
          </span>
        ),
      },
      {
        header: "وضعیت",
        accessorKey: "is_active",
        cell: ({ row }) => {
          const u = row.original;
          const busy = statusLoadingId === u.id;

          const toggle = async (next: boolean) => {
            setStatusLoadingId(u.id);
            try {
              if (next) await usersApi.activate(u.id);
              else await usersApi.deactivate(u.id);

              toast.success(next ? "کاربر فعال شد" : "کاربر غیرفعال شد");
              // ✅ refresh list (keep current page)
              await refetchUsers(false);
            } catch (e: any) {
              toast.error(e?.message || "خطا در تغییر وضعیت کاربر");
            } finally {
              setStatusLoadingId(null);
            }
          };

          return <StatusCell value={!!u.is_active} loading={busy} onToggle={toggle} />;
        },
      },
      {
        header: "عملیات",
        id: "actions",
        cell: ({ row }) => {
          const u = row.original;

          const openEdit = () => {
            setActiveRow(u);
            setEditOpen(true);
          };

          const openPassword = () => {
            setActiveRow(u);
            setPasswordOpen(true);
          };

          const openDelete = () => {
            setActiveRow(u);
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
                  className="size-8 rounded-full"
                  onClick={openPassword}
                  data-tooltip
                  data-tooltip-content="تغییر رمز"
                  data-tooltip-place="top"
                >
                  <KeyIcon className="size-4.5" />
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
    [refetchUsers, statusLoadingId],
  );

  // a tiny tanstack table instance (we use it for render only)
  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,

    // manual pagination (server-side)
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    onPaginationChange: (updater: any) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
  });

  // sticky action bar / selection is not used here
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const { height: theadHeight } = useBoxSize({ ref: theadRef });

  // ----------------------------------------------------------------------
  // Create modal form

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createBranchId, setCreateBranchId] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const resetCreate = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateIsActive(true);
    setCreateCompanyId("");
    setCreateBranchId("");
  };

  const submitCreate = async () => {
    const email = createEmail.trim();
    const password = createPassword;

    if (!email) return toast.error("ایمیل را وارد کنید");
    if (!password || password.length < 8)
      return toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");

    setCreateSubmitting(true);
    try {
      await usersApi.create({
        email,
        password,
        is_active: createIsActive,
        company_id: createCompanyId.trim() || undefined,
        branch_id: createBranchId.trim() || undefined,
      });

      toast.success("کاربر ایجاد شد");
      setCreateOpen(false);
      resetCreate();

      // ✅ مهم: بعد از Create همیشه صفحه اول
      await refetchUsers(true);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد کاربر");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Edit modal form

  const [editEmail, setEditEmail] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!editOpen || !activeRow) return;
    setEditEmail(activeRow.email || "");
    setEditCompanyId(activeRow.company_id || "");
    setEditBranchId(activeRow.branch_id || "");
    setEditIsActive(!!activeRow.is_active);
  }, [editOpen, activeRow]);

  const submitEdit = async () => {
    if (!activeRow) return;

    const email = editEmail.trim();
    if (!email) return toast.error("ایمیل را وارد کنید");

    setEditSubmitting(true);
    try {
      await usersApi.update(activeRow.id, {
        email,
        company_id: editCompanyId.trim() || null,
        branch_id: editBranchId.trim() || null,
        is_active: editIsActive,
      });

      toast.success("اطلاعات کاربر به‌روزرسانی شد");
      setEditOpen(false);
      setActiveRow(null);

      // ✅ refresh list (keep current page)
      await refetchUsers(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ویرایش کاربر");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Change password modal form

  const [newPassword, setNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    if (!passwordOpen) setNewPassword("");
  }, [passwordOpen]);

  const submitPassword = async () => {
    if (!activeRow) return;
    if (!newPassword || newPassword.length < 8) {
      return toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }

    setPasswordSubmitting(true);
    try {
      await usersApi.changePassword(activeRow.id, newPassword);
      toast.success("رمز عبور تغییر کرد");
      setPasswordOpen(false);
      setActiveRow(null);

      // (اختیاری) اگر خواستی لیست هم رفرش بشه:
      // await refetchUsers(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در تغییر رمز عبور");
    } finally {
      setPasswordSubmitting(false);
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
      await usersApi.remove(activeRow.id);
      setDeleteState("success");
      toast.success("کاربر حذف شد");

      // ✅ بعد از Delete بهتره صفحه اول (تا صفحه خالی گیر نکنه)
      await refetchUsers(true);
    } catch (e: any) {
      setDeleteState("error");
      toast.error(e?.message || "خطا در حذف کاربر");
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // ----------------------------------------------------------------------

  return (
    <Page title="کاربران">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
                کاربران
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-dark-200">
                مدیریت کاربران (لیست، ایجاد، ویرایش، حذف، فعال/غیرفعال، تغییر رمز)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                className="h-9 gap-2"
                onClick={() => refetchUsers(false)}
                disabled={loading}
              >
                <ArrowPathIcon className="size-4.5" />
                <span>{loading ? "در حال بروزرسانی..." : "بروزرسانی"}</span>
              </Button>
              <Button className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4.5" />
                <span>ایجاد کاربر</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mt-4 p-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <CollapsibleSearch
                  placeholder="فیلتر دقیق ایمیل (Exact email)..."
                  value={globalEmail}
                  onChange={(e) => setGlobalEmail(e.target.value)}
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
                classNames={{ root: "w-full lg:w-60" }}
              />

              <Input
                label="Branch ID"
                placeholder="UUID"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                classNames={{ root: "w-full lg:w-60" }}
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
                {/* PaginationSection expects a tanstack table */}
                <PaginationSection table={table as any} />
              </div>
            )}

            {/* reserved space to match your advanced table patterns */}
            <div style={{ height: theadHeight ? 0 : 0 }} />
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <ModalShell
        show={createOpen}
        title="ایجاد کاربر"
        onClose={() => {
          if (createSubmitting) return;
          setCreateOpen(false);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Email"
            placeholder="user@global.local"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="حداقل ۸ کاراکتر"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
          />
          <Input
            label="Company ID (اختیاری)"
            placeholder="UUID"
            value={createCompanyId}
            onChange={(e) => setCreateCompanyId(e.target.value)}
          />
          <Input
            label="Branch ID (اختیاری)"
            placeholder="UUID"
            value={createBranchId}
            onChange={(e) => setCreateBranchId(e.target.value)}
          />

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-500">
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-dark-100">
                  فعال باشد
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-dark-200">
                  اگر خاموش باشد، کاربر غیرفعال ایجاد می‌شود.
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
        title={`ویرایش کاربر${activeRow?.email ? `: ${activeRow.email}` : ""}`}
        onClose={() => {
          if (editSubmitting) return;
          setEditOpen(false);
          setActiveRow(null);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          <Select
            label="وضعیت"
            value={editIsActive ? "true" : "false"}
            onChange={(e) => setEditIsActive(e.target.value === "true")}
            data={[
              { label: "فعال", value: "true" },
              { label: "غیرفعال", value: "false" },
            ]}
          />
          <Input
            label="Company ID"
            placeholder="UUID"
            value={editCompanyId}
            onChange={(e) => setEditCompanyId(e.target.value)}
          />
          <Input
            label="Branch ID"
            placeholder="UUID"
            value={editBranchId}
            onChange={(e) => setEditBranchId(e.target.value)}
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

      {/* Change Password Modal */}
      <ModalShell
        show={passwordOpen}
        title={`تغییر رمز${activeRow?.email ? `: ${activeRow.email}` : ""}`}
        onClose={() => {
          if (passwordSubmitting) return;
          setPasswordOpen(false);
          setActiveRow(null);
        }}
      >
        <Input
          label="رمز جدید"
          type="password"
          placeholder="حداقل ۸ کاراکتر"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outlined"
            className="h-9"
            onClick={() => {
              setPasswordOpen(false);
              setActiveRow(null);
            }}
            disabled={passwordSubmitting}
          >
            لغو
          </Button>
          <Button className="h-9 gap-2" onClick={submitPassword} disabled={passwordSubmitting}>
            {passwordSubmitting ? (
              <ArrowPathIcon className="size-4.5 animate-spin" />
            ) : (
              <KeyIcon className="size-4.5" />
            )}
            <span>تغییر رمز</span>
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
