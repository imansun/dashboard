// src/app/pages/support/users/index.tsx
import clsx from "clsx";
import {
  flexRender,
  getCoreRowModel,
  // ✅ server-side table => do NOT import filtered/faceted/sorted row models
  // getFacetedMinMaxValues,
  // getFacetedUniqueValues,
  // getFilteredRowModel,
  // getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogPanel,
  DialogTitle, // ✅ for Drawer header title
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid"; // ✅ Drawer close icon (better for header)

import { Page } from "@/components/shared/Page";
import { TableSortIcon } from "@/components/shared/table/TableSortIcon";
import { ColumnFilter } from "@/components/shared/table/ColumnFilter";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from "@/components/ui";
import {
  ConfirmModal,
  type ConfirmMessages,
  type ModalState,
} from "@/components/shared/ConfirmModal";
import { StyledSwitch } from "@/components/shared/form/StyledSwitch";

// ✅ NEW: StyledListbox
import { Listbox } from "@/components/shared/form/StyledListbox";

// ✅ NEW: Companies / Branches APIs
import { companiesApi } from "@/app/services/companies/companies.api";
import type { Company } from "@/app/services/companies/companies.types";

import { branchesApi } from "@/app/services/branches/branches.api";
import type { Branch } from "@/app/services/branches/branches.types";

import {
  useBoxSize,
  useDidUpdate,
  useLocalStorage,
  useLockScrollbar,
} from "@/hooks";
// ✅ server-side table => do NOT use fuzzyFilter / globalFilterFn / filterFns
// import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { useSkipper } from "@/utils/react-table/useSkipper";
import { useThemeContext } from "@/app/contexts/theme/context";
import { getUserAgentBrowser } from "@/utils/dom/getUserAgentBrowser";

// 🔻 UI parts (same pattern as orders)
import { Toolbar } from "./Toolbar";
import { columns } from "./columns";
import { SelectedRowsActions } from "./SelectedRowsActions";

// ✅ types from service
import type { User, UsersListQuery } from "@/app/services/users/users.types";

// ✅ IMPORTANT: use the single source of truth usersApi
import { usersApi } from "@/app/services/users/users.api";

// ----------------------------------------------------------------------
// Types

type TableSettingsState = {
  enableFullScreen?: boolean;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
  enableRowDense?: boolean;
};

const isSafari = getUserAgentBrowser() === "Safari";

// ----------------------------------------------------------------------
// ✅ helpers: dateRange number -> Local ISO (no "Z") + local start/end-of-day

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * خروجی ISO بدون Z (Local time) مثل:
 * 2026-01-21T00:00:00
 */
const toLocalIsoNoZ = (d: Date) => {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

/**
 * شروع روز (local) برای timestamp داده‌شده
 */
const toIsoStartLocal = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return toLocalIsoNoZ(d);
};

/**
 * پایان روز (local) برای timestamp داده‌شده
 * (ms ست میشه ولی خروجی ثانیه‌ایه و بدون Z برمی‌گرده)
 */
const toIsoEndLocal = (t: number) => {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return toLocalIsoNoZ(d);
};

// ----------------------------------------------------------------------
// Small UI helpers

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
            "shadow-soft dark:bg-dark-700 relative w-full max-w-xl overflow-hidden rounded-lg bg-white p-5 dark:shadow-none",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="dark:text-dark-100 truncate text-base font-medium tracking-wide text-gray-800">
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
// Delete confirm messages

const deleteConfirmMessages: ConfirmMessages = {
  pending: {
    description:
      "آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟ پس از حذف، امکان بازیابی وجود ندارد.",
  },
  success: { title: "کاربر حذف شد" },
};

// ----------------------------------------------------------------------
// Page

export default function SupportUsersPage() {
  const { cardSkin } = useThemeContext();
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  /**
   * ✅ تغییر 1: Table settings از useState => useLocalStorage
   * نکته: initializeWithValue پیشفرض true است، پس با refresh آخرین حالت برمی‌گردد.
   */
  const [tableSettings, setTableSettings] = useLocalStorage<TableSettingsState>(
    "support-users-tableSettings",
    {
      enableSorting: true,
      enableColumnFilters: true,
      enableFullScreen: false,
      enableRowDense: false,
    },
  );

  // ---- Server state ----
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // ---- Table states ----
  /**
   * ✅ تغییر 1: این state ها از useState => useLocalStorage
   * این‌ها فقط برای UI و ساخت query سرور هستند (نه اعمال روی کلاینت)
   */
  const [globalFilter, setGlobalFilter] = useLocalStorage(
    "support-users-globalFilter",
    "",
  );

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "support-users-sorting",
    [],
  );

  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    "support-users-columnFilters",
    [],
  );

  const [columnVisibility, setColumnVisibility] = useLocalStorage(
    "column-visibility-support-users",
    {},
  );

  const [columnPinning, setColumnPinning] = useLocalStorage(
    "column-pinning-support-users",
    {},
  );

  // Pagination state (API offset/limit)
  /**
   * ✅ تغییر 2 (پیشنهاد شما): pageIndex محلی بماند تا بعد refresh روی همان صفحه قفل نشود
   * اگر خواستی persistent شود:
   * const [pageIndex, setPageIndex] = useLocalStorage("support-users-pageIndex", 0);
   */
  const [pageIndex, setPageIndex] = useState(0);

  /**
   * ✅ تغییر 1: pageSize از useState => useLocalStorage
   */
  const [pageSize, setPageSize] = useLocalStorage("support-users-pageSize", 20);

  // ---- Modals / Drawers ----
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false); // ✅ controls Bottom Drawer now

  const [activeRow, setActiveRow] = useState<User | null>(null);

  // delete confirm modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<ModalState>("pending");

  // per-row status loading
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // ✅ NEW: Companies / Branches listbox state

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Create selections
  const [createCompany, setCreateCompany] = useState<Company | null>(null);
  const [createBranch, setCreateBranch] = useState<Branch | null>(null);

  // Edit selections
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  // ----------------------------------------------------------------------
  // ✅ NEW: Helper های دریافت لیست‌ها

  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await companiesApi.list({ offset: 0, limit: 100 });
      setCompanies(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "خطا در دریافت لیست شرکت‌ها");
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async (companyId?: string | null) => {
    if (!companyId) {
      setBranches([]);
      return;
    }

    setBranchesLoading(true);
    try {
      const res = await branchesApi.list({
        offset: 0,
        limit: 100,
        company_id: companyId,
      });
      setBranches(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "خطا در دریافت لیست شعب");
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  // ----------------------------------------------------------------------
  // ✅ Create Drawer effects:
  // - وقتی Drawer ایجاد باز می‌شود، کمپانی‌ها را لود کن
  // - با انتخاب کمپانی، شعب را وابسته به آن لود کن

  useEffect(() => {
    if (!createOpen) return;

    // هر بار Drawer ایجاد باز شد، لیست شرکت‌ها رو داشته باشیم
    if (!companies.length) void loadCompanies();
  }, [createOpen, companies.length, loadCompanies]);

  useEffect(() => {
    // createBranch باید با تغییر company ریست بشه
    setCreateBranch(null);
    void loadBranches(createCompany?.id ?? null);
  }, [createCompany?.id, loadBranches]);

  // ----------------------------------------------------------------------
  // ✅ Edit Drawer effects:
  // - با باز شدن Drawer ویرایش، انتخاب‌های پیش‌فرض را از activeRow sync کن
  // - branches را برای company مربوطه بگیر
  // - بعد از آمدن branches، editBranch را پیدا و ست کن

  // ✅ این ref باعث می‌شود وقتی خودمان داریم مقدار اولیه editCompany را ست می‌کنیم،
  // effect تغییر شرکت، ناخواسته یکبار اجرا نشود (و fetch اضافی نزند)
  const skipNextEditCompanyEffectRef = useRef(false);

  useEffect(() => {
    if (!editOpen || !activeRow) return;

    // مطمئن شو لیست شرکت‌ها داریم
    if (!companies.length) {
      void loadCompanies();
    }

    // از row اطلاعات شرکت/شعبه رو بساز
    const rowCompanyId =
      (activeRow as any)?.company_id ?? (activeRow as any)?.company?.id ?? null;

    const rowBranchId =
      (activeRow as any)?.branch_id ?? (activeRow as any)?.branch?.id ?? null;

    // اگر شرکت داخل خود row هست، سریع ست کن؛ وگرنه از لیست پیدا کن
    const initialCompany: Company | null =
      (activeRow as any)?.company?.id
        ? (activeRow as any).company
        : (companies.find((c) => c.id === rowCompanyId) ?? null);

    // ✅ چون داریم init انجام می‌دیم، effect تغییر شرکت را یک‌بار skip کن
    skipNextEditCompanyEffectRef.current = true;

    setEditCompany(initialCompany);

    // شعب بعداً با loadBranches میاد، پس فعلاً null
    setEditBranch(null);

    // load branches برای company (حتی اگر editCompany هنوز null باشد، rowCompanyId ممکن است موجود باشد)
    void loadBranches(rowCompanyId);

    // rowBranchId در effect پایین‌تر بعد از آمدن branches ست می‌شود
  }, [editOpen, activeRow, companies, companies.length, loadCompanies, loadBranches]);

  useEffect(() => {
    if (!editOpen || !activeRow) return;

    const rowBranchId =
      (activeRow as any)?.branch_id ?? (activeRow as any)?.branch?.id ?? null;

    if (!rowBranchId) {
      setEditBranch(null);
      return;
    }

    const found = branches.find((b) => b.id === rowBranchId) ?? null;
    setEditBranch(found);
  }, [editOpen, activeRow, branches]);

  // ✅ وقتی کاربر در ویرایش شرکت را عوض کرد: شعب ریست و دوباره لود
  useEffect(() => {
    if (!editOpen) return;

    // اگر این تغییر، فقط به‌خاطر init خودمان بوده، یک‌بار skip کن
    if (skipNextEditCompanyEffectRef.current) {
      skipNextEditCompanyEffectRef.current = false;
      return;
    }

    // با تغییر شرکت، شعب ریست و دوباره لود
    setEditBranch(null);
    void loadBranches(editCompany?.id ?? null);
  }, [editCompany?.id, editOpen, loadBranches]);

  // ----------------------------------------------------------------------
  // ✅ Build server query from table state (aligned with Orders dateRange output)

  const buildListQuery = useCallback(
    (offset: number): UsersListQuery & Record<string, any> => {
      const query: UsersListQuery & Record<string, any> = {
        offset,
        limit: pageSize,
      };

      // global search -> email contains (consistent with API docs)
      if (globalFilter?.trim()) {
        query.email = globalFilter.trim();
      }

      // map column filters to API query
      for (const f of columnFilters) {
        // ✅ created_at dateRange output: [minTs, maxTs] -> Local ISO bounds (no Z)
        if (f.id === "created_at") {
          const v = f.value as
            | [number | undefined, number | undefined]
            | undefined;

          const from = v?.[0];
          const to = v?.[1];

          if (typeof from === "number")
            query.created_from = toIsoStartLocal(from);
          if (typeof to === "number") query.created_to = toIsoEndLocal(to);
        }

        // ✅ updated_at dateRange output: [minTs, maxTs] -> Local ISO bounds (no Z)
        if (f.id === "updated_at") {
          const v = f.value as
            | [number | undefined, number | undefined]
            | undefined;

          const from = v?.[0];
          const to = v?.[1];

          if (typeof from === "number")
            query.updated_from = toIsoStartLocal(from);
          if (typeof to === "number") query.updated_to = toIsoEndLocal(to);
        }

        // ✅ company_name (string)
        if (f.id === "company_name") {
          const v = String(f.value ?? "").trim();
          if (v) query.company_name = v;
        }

        // ✅ branch_name (string)
        if (f.id === "branch_name") {
          const v = String(f.value ?? "").trim();
          if (v) query.branch_name = v;
        }

        // ✅ email (string)
        // NOTE: column filter will override global search by writing to the same query.email
        if (f.id === "email") {
          const v = String(f.value ?? "").trim();
          if (v) query.email = v;
          else delete query.email;
        }

        // ✅ is_active (boolean) - supports select filter returning boolean OR boolean[]
        if (f.id === "is_active") {
          const v = f.value as any;

          // حالت رایج ColumnFilter(select): آرایه‌ای از مقادیر انتخاب‌شده
          if (Array.isArray(v)) {
            if (v.length === 1) {
              const one = v[0];
              if (one === true || one === "true") query.is_active = true;
              else if (one === false || one === "false") query.is_active = false;
              else query.is_active = !!one;
            } else {
              // 0 یا 2 تا انتخاب => یعنی همه
              query.is_active = undefined;
            }
          }
          // حالت‌های تک مقداری
          else if (v === true || v === "true") query.is_active = true;
          else if (v === false || v === "false") query.is_active = false;
          else query.is_active = undefined;
        }

        // ✅ role_keys (multi select)
        if (f.id === "role_keys") {
          const v = f.value as string[] | undefined | null;
          if (Array.isArray(v) && v.length) query.role_keys = v;
          else query.role_keys = undefined;
        }
      }

      // NOTE: sorting mapping to API not provided; keep UI-only for now
      // ✅ (با manualSorting، TanStack روی داده‌ی آیتم‌ها sort انجام نمی‌دهد)
      return query;
    },
    [columnFilters, globalFilter, pageSize],
  );

  // ---- Fetch ----
  const refetchUsers = useCallback(
    async (forceFirstPage?: boolean) => {
      const nextPageIndex = forceFirstPage ? 0 : pageIndex;
      const nextOffset = nextPageIndex * pageSize;

      setLoading(true);
      try {
        const query = buildListQuery(nextOffset);
        const res = await usersApi.list(query);

        setItems(res.items || []);
        setTotal(res.total ?? 0);

        if (forceFirstPage) setPageIndex(0);
      } catch (e: any) {
        toast.error(e?.message || "خطا در دریافت لیست کاربران");
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, pageSize, buildListQuery],
  );

  useEffect(() => {
    refetchUsers(false);
  }, [pageIndex, pageSize, refetchUsers]);

  // ----------------------------------------------------------------------
  // ✅ تغییر 3: گارد برای reset-to-page-0 (برای جلوگیری از رفتار عجیب هنگام load اولیه)
  const didHydrateRef = useRef(false);

  useEffect(() => {
    // بعد از mount، اجازه می‌دهیم resetها فقط به تغییرات واقعی (پس از load اولیه) واکنش دهند
    didHydrateRef.current = true;
  }, []);

  // اگر فیلتر/مرتب‌سازی عوض شد، برگرد صفحه اول (الگو: orders)
  useDidUpdate(() => {
    // اگر useDidUpdate شما روی mount هم اجرا شود، این گارد جلوی reset ناخواسته را می‌گیرد
    if (!didHydrateRef.current) return;
    setPageIndex(0);
  }, [globalFilter, columnFilters, sorting]);

  // ---- Create form ----
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const resetCreate = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateIsActive(true);

    // ✅ انتخاب‌های Listbox ریست
    setCreateCompany(null);
    setCreateBranch(null);
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
        // ✅ وصل به انتخاب‌های Listbox
        company_id: createCompany?.id ?? undefined,
        branch_id: createBranch?.id ?? undefined,
      });

      toast.success("کاربر ایجاد شد");
      setCreateOpen(false);
      resetCreate();

      await refetchUsers(true);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد کاربر");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ---- Edit form ----
  const [editEmail, setEditEmail] = useState("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!editOpen || !activeRow) return;

    // ✅ فقط فیلدهای ساده را اینجا sync می‌کنیم
    // انتخاب شرکت/شعبه با effect‌های بالاتر sync می‌شود
    setEditEmail(activeRow.email || "");
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
        // ✅ وصل به انتخاب‌های Listbox
        company_id: editCompany ? editCompany.id : null,
        branch_id: editBranch ? editBranch.id : null,
        is_active: editIsActive,
      });

      toast.success("اطلاعات کاربر به‌روزرسانی شد");

      // ✅ UX: بعد از ذخیره، Drawer بسته می‌شود و رمز هم پاک می‌شود
      setEditOpen(false);
      setActiveRow(null);
      setNewPassword("");

      // ✅ انتخاب‌ها هم پاک شوند تا دفعه بعد stale نباشند
      setEditCompany(null);
      setEditBranch(null);

      await refetchUsers(false);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ویرایش کاربر");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- Change password (inside edit Drawer) ----
  const [newPassword, setNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  /**
   * ✅ UX: وقتی Drawer بسته می‌شود، رمز جدید باقی نماند
   * (علاوه بر handlerهای بستن، این گارد هم برای اطمینان است)
   */
  useEffect(() => {
    if (!editOpen) setNewPassword("");
  }, [editOpen]);

  const submitPassword = async () => {
    if (!activeRow) return;
    if (!newPassword || newPassword.length < 8) {
      return toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }

    setPasswordSubmitting(true);
    try {
      await usersApi.changePassword(activeRow.id, newPassword);

      // ✅ پیشنهاد UX: Drawer باز بماند، فقط input خالی شود
      toast.success("رمز عبور تغییر کرد");
      setNewPassword("");
    } catch (e: any) {
      toast.error(e?.message || "خطا در تغییر رمز عبور");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // ---- Delete flow ----
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

      await refetchUsers(true);
    } catch (e: any) {
      setDeleteState("error");
      toast.error(e?.message || "خطا در حذف کاربر");
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // ---- Row actions helpers (used by columns via table.meta) ----
  const openCreate = () => setCreateOpen(true);

  const openEdit = (u: User) => {
    setActiveRow(u);
    setEditOpen(true);
  };

  /**
   * ✅ قبلاً احتمالاً برای مودال تغییر رمز بود
   * الان UX بهتر: همان Drawer ویرایش باز شود و کاربر در همانجا رمز را تغییر دهد
   */
  const openPassword = (u: User) => {
    setNewPassword("");
    openEdit(u);
  };

  const openDelete = (u: User) => {
    setActiveRow(u);
    setDeleteState("pending");
    setDeleteModalOpen(true);
  };

  const toggleActive = async (u: User, next: boolean) => {
    setStatusLoadingId(u.id);
    try {
      if (next) await usersApi.activate(u.id);
      else await usersApi.deactivate(u.id);

      setItems((old) =>
        old.map((x) =>
          x.id === u.id ? ({ ...x, is_active: next } as any) : x,
        ),
      );

      toast.success(next ? "کاربر فعال شد" : "کاربر غیرفعال شد");
    } catch (e: any) {
      toast.error(e?.message || "خطا در تغییر وضعیت");
    } finally {
      setStatusLoadingId(null);
    }
  };

  // ---- Layout refs ----
  const cardRef = useRef<HTMLDivElement>(null);
  const { width: cardWidth } = useBoxSize({ ref: cardRef });

  // columns from local module (same as orders)
  const tableColumns = useMemo(() => columns, []);

  const table = useReactTable({
    data: items,
    columns: tableColumns as any,

    /**
     * ✅ Fix 1: rowId پایدار و یونیک (به جای index)
     * باعث می‌شود TanStack/React سلول‌ها را با context اشتباه reuse نکنند
     */
    getRowId: (row: any) => row.id,

    /**
     * ✅ Fix 2: server-side table (pagination/filtering/sorting)
     * مهم: چون دیتا از API می‌آید، نباید TanStack دوباره روی کلاینت فیلتر/سورت/پیجینیت کند
     */
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,

    // server-side page count (PaginationSection از total استفاده می‌کند)
    pageCount: Math.ceil(total / pageSize),

    state: {
      // ✅ این state ها فقط برای UI و ساخت query سرور هستند
      sorting,
      globalFilter,
      columnFilters,
      pagination: { pageIndex, pageSize },

      columnVisibility,
      columnPinning,

      // ✅ REQUIRED by TableSettings
      tableSettings,
    },

    // ✅ REQUIRED by TableSettings + place to expose actions to columns/toolbar
    meta: {
      setTableSettings,

      // handy: allow Toolbar to trigger refetch/create
      refetch: () => refetchUsers(false),
      openCreate,

      // row-level actions (columns can call via table.options.meta)
      openEdit,
      openPassword,
      openDelete,
      toggleActive,
      statusLoadingId,

      // optional (orders pattern) - allow optimistic table edits
      updateData: (rowIndex: number, columnId: string, value: any) => {
        skipAutoResetPageIndex();
        setItems((old) =>
          old.map((row, index) =>
            index === rowIndex ? ({ ...row, [columnId]: value } as any) : row,
          ),
        );
      },
      deleteRow: (row: any) => {
        skipAutoResetPageIndex();
        setItems((old) => old.filter((u) => u.id !== row.original.id));
      },
      deleteRows: (rows: any[]) => {
        skipAutoResetPageIndex();
        const ids = rows.map((r) => r.original.id);
        setItems((old) => old.filter((u) => !ids.includes(u.id)));
      },
    },

    enableSorting: tableSettings.enableSorting,
    enableColumnFilters: tableSettings.enableColumnFilters,

    // ✅ فقط core row model لازم است (همان items را رندر می‌کند)
    getCoreRowModel: getCoreRowModel(),

    // ✅ state handlers (برای کنترل UI و ساخت query)
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,

    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,

    /**
     * ✅ server-side pagination:
     * - getPaginationRowModel لازم نیست
     * - PaginationSection از state.pagination + total استفاده می‌کند
     */
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },

    // server-side total (PaginationSection uses total)
    autoResetPageIndex,
  });

  useDidUpdate(() => table.resetRowSelection(), [items]);
  useLockScrollbar(!!tableSettings.enableFullScreen);

  // ✅ Shared drawer close (keeps UX consistent everywhere)
  const closeEditDrawer = () => {
    setEditOpen(false);
    setActiveRow(null);
    setNewPassword("");

    // ✅ انتخاب‌ها هم پاک شوند تا دفعه بعد stale نباشند
    setEditCompany(null);
    setEditBranch(null);
  };

  return (
    <Page title="کاربران">
      <div className="transition-content grid grid-cols-1 grid-rows-[auto_1fr] px-(--margin-x) py-4">
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
            ref={cardRef}
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
                              <TableSortIcon
                                sorted={header.column.getIsSorted()}
                              />
                            </div>
                          ) : header.isPlaceholder ? null : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}

                          {/* ✅ keep this: رندر فیلترها (اما اعمال واقعی روی سرور انجام می‌شود) */}
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
                          <ArrowPathIcon className="size-5 animate-spin" />
                          <span>در حال دریافت اطلاعات...</span>
                        </div>
                      </Td>
                    </Tr>
                  ) : (
                    <>
                      {table.getRowModel().rows.map((row) => (
                        <Tr
                          /**
                           * ✅ Fix: key از id واقعی دیتابیس
                           * (دیگه row.id یا index نیست)
                           */
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

                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
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

            <SelectedRowsActions table={table as any} />

            {/* ✅ Fix: در server-side بهتره شرط را بر اساس total بگذاریم */}
            {total > 0 && (
              <div
                className={clsx(
                  "px-4 pb-4 sm:px-5 sm:pt-4",
                  tableSettings.enableFullScreen && "dark:bg-dark-800 bg-gray-50",
                  !(
                    table.getIsSomeRowsSelected() ||
                    table.getIsAllRowsSelected()
                  ) && "pt-4",
                )}
              >
                <PaginationSection table={table as any} total={total} />
              </div>
            )}
          </Card>
        </div>
      </div>

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

      {/* ✅ Create Bottom Drawer */}
      <Transition appear show={createOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-100"
          onClose={() => {
            // ✅ جلوگیری از بستن Drawer در حین submit
            if (!createSubmitting) {
              setCreateOpen(false);
            }
          }}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40" />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="ease-out transform-gpu transition-transform duration-200"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in transform-gpu transition-transform duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <DialogPanel className="fixed bottom-0 left-0 flex w-full transform-gpu flex-col rounded-t-2xl bg-white transition-transform duration-200 dark:bg-dark-700">
              {/* Header */}
              <div className="flex justify-between rounded-t-2xl bg-gray-200 px-4 py-3 dark:bg-dark-800 sm:px-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-medium text-gray-800 dark:text-dark-100"
                >
                  ایجاد کاربر جدید
                </DialogTitle>

                <Button
                  onClick={() => {
                    if (createSubmitting) return;
                    setCreateOpen(false);
                    resetCreate();
                  }}
                  variant="flat"
                  className="size-7 shrink-0 rounded-full p-0 ltr:-mr-1.5 rtl:-ml-1.5"
                >
                  <XMarkIcon className="size-4.5" />
                </Button>
              </div>

              {/* Body */}
              <div className="h-[calc(100vh-15rem)] overflow-auto p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 dark:text-dark-300">
                      ایمیل
                    </label>
                    <Input
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 dark:text-dark-300">
                      رمز عبور
                    </label>
                    <Input
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="حداقل ۸ کاراکتر"
                      type="password"
                    />
                  </div>

                  {/* ✅ Company / Branch Listbox (Create) */}
                  <div className="sm:col-span-2">
                    <Listbox
                      data={companies}
                      value={createCompany}
                      placeholder={
                        companiesLoading
                          ? "در حال دریافت شرکت‌ها..."
                          : "انتخاب شرکت"
                      }
                      onChange={setCreateCompany}
                      label="شرکت"
                      displayField="name"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Listbox
                      data={branches}
                      value={createBranch}
                      placeholder={
                        !createCompany
                          ? "ابتدا شرکت را انتخاب کنید"
                          : branchesLoading
                            ? "در حال دریافت شعب..."
                            : "انتخاب شعبه"
                      }
                      onChange={setCreateBranch}
                      label="شعبه"
                      displayField="name"
                      disabled={!createCompany || branchesLoading}
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-500">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                        وضعیت کاربر
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        فعال / غیرفعال
                      </p>
                    </div>

                    <StyledSwitch
                      checked={!!createIsActive}
                      onChange={(v) => setCreateIsActive(!!v)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-3 dark:border-dark-500 sm:px-5">
                <Button
                  variant="flat"
                  onClick={() => {
                    if (createSubmitting) return;
                    setCreateOpen(false);
                    resetCreate();
                  }}
                >
                  بستن
                </Button>

                <Button
                  color="primary"
                  onClick={submitCreate}
                  disabled={createSubmitting}
                  className="min-w-28"
                >
                  {createSubmitting ? "در حال ایجاد..." : "ایجاد کاربر"}
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>

      {/* ✅ Edit Bottom Drawer (now includes Change Password) */}
      <Transition appear show={editOpen} as={Fragment}>
        <Dialog as="div" className="relative z-100" onClose={closeEditDrawer}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40" />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="ease-out transform-gpu transition-transform duration-200"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in transform-gpu transition-transform duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <DialogPanel className="fixed bottom-0 left-0 flex w-full transform-gpu flex-col rounded-t-2xl bg-white transition-transform duration-200 dark:bg-dark-700">
              {/* Header */}
              <div className="flex justify-between rounded-t-2xl bg-gray-200 px-4 py-3 dark:bg-dark-800 sm:px-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-medium text-gray-800 dark:text-dark-100"
                >
                  ویرایش کاربر
                </DialogTitle>

                <Button
                  onClick={closeEditDrawer}
                  variant="flat"
                  className="size-7 shrink-0 rounded-full p-0 ltr:-mr-1.5 rtl:-ml-1.5"
                >
                  <XMarkIcon className="size-4.5" />
                </Button>
              </div>

              {/* Body */}
              <div className="h-[calc(100vh-15rem)] overflow-auto p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 dark:text-dark-300">
                      ایمیل
                    </label>
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  {/* ✅ Company / Branch Listbox (Edit) */}
                  <div className="sm:col-span-2">
                    <Listbox
                      data={companies}
                      value={editCompany}
                      placeholder={
                        companiesLoading
                          ? "در حال دریافت شرکت‌ها..."
                          : "انتخاب شرکت"
                      }
                      onChange={setEditCompany}
                      label="شرکت"
                      displayField="name"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Listbox
                      data={branches}
                      value={editBranch}
                      placeholder={
                        !editCompany
                          ? "ابتدا شرکت را انتخاب کنید"
                          : branchesLoading
                            ? "در حال دریافت شعب..."
                            : "انتخاب شعبه"
                      }
                      onChange={setEditBranch}
                      label="شعبه"
                      displayField="name"
                      disabled={!editCompany || branchesLoading}
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-500">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                        وضعیت کاربر
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        فعال / غیرفعال
                      </p>
                    </div>

                    <StyledSwitch
                      checked={!!editIsActive}
                      onChange={(v) => setEditIsActive(!!v)}
                    />
                  </div>

                  {/* ✅ تغییر رمز */}
                  <div className="sm:col-span-2 mt-2 rounded-lg border border-gray-200 p-3 dark:border-dark-500">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                          تغییر رمز عبور
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-300">
                          حداقل ۸ کاراکتر
                        </p>
                      </div>

                      <KeyIcon className="size-5 text-gray-500 dark:text-dark-300" />
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 dark:text-dark-300">
                          رمز جدید
                        </label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="********"
                        />
                      </div>

                      <Button
                        onClick={submitPassword}
                        disabled={passwordSubmitting || !activeRow}
                        className="sm:w-40"
                      >
                        {passwordSubmitting ? "در حال ثبت..." : "ثبت رمز"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-3 dark:border-dark-500 sm:px-5">
                <Button variant="flat" onClick={closeEditDrawer}>
                  بستن
                </Button>

                <Button
                  color="primary"
                  onClick={submitEdit}
                  disabled={editSubmitting}
                  className="min-w-28"
                >
                  {editSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </Page>
  );
}
