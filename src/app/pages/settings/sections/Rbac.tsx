// src/app/pages/settings/sections/Rbac.tsx

// Import Dependencies
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  XMarkIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/solid";
import clsx from "clsx";
import { toast } from "sonner";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Checkbox, Input } from "@/components/ui";
import { Combobox } from "@/components/shared/form/StyledCombobox";
import { useDisclosure } from "@/hooks";

import { usersApi } from "@/app/services/users/users.api";
import type { User } from "@/app/services/users/users.types";
import { rbacApi } from "@/app/services/rbac/rbac.api";
import type {
  MatrixResponse,
  PermissionItem,
} from "@/app/services/rbac/rbac.types";

// ----------------------------------------------------------------------

type EffectiveRole = {
  role_key: string;
  company_id: string | null;
  branch_id: string | null;
};

type EffectiveAccessResponse = {
  user_id: string;
  scope: { company_id: string | null; branch_id: string | null };
  roles: EffectiveRole[];
  permissions: string[];
};

// -------- Permission translations (client) --------
const resourceFa: Record<string, string> = {
  users: "کاربران",
  tickets: "تیکت‌ها",
  companies: "شرکت‌ها",
  branches: "شعبه‌ها",
  categories: "دسته‌بندی‌ها",
  docs: "اسناد",
  sla: "SLA",
};

const actionFa: Record<string, string> = {
  read: "مشاهده",
  manage: "مدیریت",
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  reply: "پاسخ",
  resolve: "Resolve",
  reopen: "Reopen",
  close: "Close",
  upload: "آپلود",
  download: "دانلود",
  change_password: "تغییر رمز",
};

function permissionLabelFa(key: string) {
  const [res, act] = String(key || "").split(".");
  const resTxt = resourceFa[res] || res || "—";
  const actTxt = actionFa[act] || act || "—";
  return `${actTxt} ${resTxt}`.trim();
}

function scopeText(companyId: string, branchId: string) {
  return companyId || branchId
    ? `company=${companyId || "—"} / branch=${branchId || "—"}`
    : "بدون Scope";
}

// ----------------------------------------------------------------------

export default function RbacSettingsPage() {
  // user picker
  const [emailQuery, setEmailQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // scope (auto from user)
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");

  // effective access
  const [access, setAccess] = useState<EffectiveAccessResponse | null>(null);

  // user overrides
  const [overrides, setOverrides] =
    useState<
      import("@/app/services/rbac/rbac.types").UserPermissionOverridesResponse | null
    >(null);

  const [selectedGrants, setSelectedGrants] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedRevokes, setSelectedRevokes] = useState<Record<string, boolean>>(
    {},
  );
  const [busyOverrides, setBusyOverrides] = useState(false);

  // drawer
  const [isDrawerOpen, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("تأیید");
  const [confirmDesc, setConfirmDesc] = useState<string | null>(null);
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  function askConfirm(opts: {
    title: string;
    description?: string;
    action: () => Promise<void>;
  }) {
    setConfirmTitle(opts.title);
    setConfirmDesc(opts.description ?? null);
    confirmActionRef.current = opts.action;
    setConfirmOpen(true);
  }

  async function runConfirmAction() {
    if (!confirmActionRef.current) return;
    setConfirmBusy(true);
    try {
      await confirmActionRef.current();
      setConfirmOpen(false);
    } finally {
      setConfirmBusy(false);
      confirmActionRef.current = null;
    }
  }

  // matrix (roles + perms catalog)
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);

  // role selection in drawer
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
  const [selectedPerms, setSelectedPerms] = useState<Record<string, boolean>>(
    {},
  );
  const [roleFilter, setRoleFilter] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [busyAssign, setBusyAssign] = useState(false);
  const [busySync, setBusySync] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  const permsCatalog = useMemo(() => {
    return matrix?.permissions_catalog ?? [];
  }, [matrix]);

  const permsMap = useMemo(() => {
    return new Map<string, Pick<PermissionItem, "key" | "description">>(
      permsCatalog.map((p) => [p.key, p]),
    );
  }, [permsCatalog]);

  const rolesList = useMemo(() => {
    const roles = matrix?.roles ?? [];
    const q = roleFilter.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const k = r.key.toLowerCase();
      const n = r.name.toLowerCase();
      return k.includes(q) || n.includes(q);
    });
  }, [matrix, roleFilter]);

  const selectedRole = useMemo(() => {
    return (matrix?.roles ?? []).find((r) => r.key === selectedRoleKey) || null;
  }, [matrix, selectedRoleKey]);

  async function fetchUsers(query: string) {
    setLoadingUsers(true);
    try {
      const res = await usersApi.list({
        email: query.trim() || undefined,
        offset: 0,
        limit: 20,
      });
      const data: any = (res as any)?.data ?? res;
      setUsers(data.items ?? []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "خطا در دریافت کاربران";
      setErrorMsg(msg);
      toast.error("خطا", { description: msg });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchMatrix({ silent }: { silent?: boolean } = {}) {
    if (!silent) toast.info("در حال دریافت Matrix...");
    setLoadingMatrix(true);
    try {
      const res = await rbacApi.getMatrix();
      const data: any = (res as any)?.data ?? res;
      setMatrix(data as MatrixResponse);

      if (!selectedRoleKey && data?.roles?.[0]?.key) {
        setSelectedRoleKey(data.roles[0].key);
      }

      if (!silent) toast.success("Matrix دریافت شد");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "خطا در دریافت matrix";
      setErrorMsg(msg);
      toast.error("خطا در دریافت Matrix", { description: msg });
    } finally {
      setLoadingMatrix(false);
    }
  }

  async function fetchAccess({ silent }: { silent?: boolean } = {}) {
    if (!selectedUser?.id) return;

    if (!silent) toast.info("در حال دریافت دسترسی موثر...");
    setLoadingAccess(true);
    setErrorMsg(null);
    try {
      const res = await rbacApi.getUserAccess(selectedUser.id, {
        company_id: companyId.trim() || undefined,
        branch_id: branchId.trim() || undefined,
      });
      const data: any = (res as any)?.data ?? res;
      setAccess(data as EffectiveAccessResponse);

      if (!silent) toast.success("دسترسی موثر دریافت شد");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "خطا در دریافت دسترسی موثر";
      setErrorMsg(msg);
      setAccess(null);
      toast.error("خطا در دریافت دسترسی موثر", { description: msg });
    } finally {
      setLoadingAccess(false);
    }
  }

  // ✅ fetch overrides (similar to fetchAccess)
  async function fetchOverrides({ silent }: { silent?: boolean } = {}) {
    if (!selectedUser?.id) return;

    if (!silent) toast.info("در حال دریافت overrides کاربر...");
    setBusyOverrides(true);
    try {
      const res = await rbacApi.getUserOverrides(selectedUser.id, {
        company_id: companyId.trim() || undefined,
        branch_id: branchId.trim() || undefined,
      });
      const data: any = (res as any)?.data ?? res;
      setOverrides(data);

      // ✅ sync UI with server
      setSelectedGrants(
        Object.fromEntries((data?.grants ?? []).map((p: string) => [p, true])),
      );
      setSelectedRevokes(
        Object.fromEntries((data?.revokes ?? []).map((p: string) => [p, true])),
      );

      if (!silent) toast.success("Overrides دریافت شد");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "خطا در دریافت overrides";
      toast.error("خطا", { description: msg });
      setOverrides(null);
    } finally {
      setBusyOverrides(false);
    }
  }

  // init
  useEffect(() => {
    fetchUsers("").catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // server search debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchUsers(emailQuery).catch(() => void 0);
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailQuery]);

  // auto fill scope from user
  useEffect(() => {
    if (!selectedUser) {
      setCompanyId("");
      setBranchId("");
      setAccess(null);
      setOverrides(null);
      setSelectedGrants({});
      setSelectedRevokes({});
      return;
    }
    const u: any = selectedUser as any;
    setCompanyId(u.company_id ?? "");
    setBranchId(u.branch_id ?? "");
  }, [selectedUser]);

  // when user changes => refresh access + overrides (silent)
  useEffect(() => {
    if (!selectedUser?.id) return;
    fetchAccess({ silent: true }).catch(() => void 0);
    fetchOverrides({ silent: true }).catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  // when scope changes => refetch overrides (silent)
  useEffect(() => {
    if (!selectedUser?.id) return;
    fetchOverrides({ silent: true }).catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, companyId, branchId]);

  // when role changes => set selected perms to that role perms
  useEffect(() => {
    if (!selectedRole) return;
    setSelectedPerms(
      Object.fromEntries(
        (selectedRole.permissions ?? []).map((p) => [p, true]),
      ),
    );
  }, [selectedRole?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rolesCount = access?.roles?.length ?? 0;
  const permsCount = access?.permissions?.length ?? 0;

  const grantsCount = overrides?.grants?.length ?? 0;
  const revokesCount = overrides?.revokes?.length ?? 0;

  // ✅ derived counts from current UI selections (not only server)
  const uiGrantsCount = useMemo(() => {
    return Object.values(selectedGrants).filter(Boolean).length;
  }, [selectedGrants]);

  const uiRevokesCount = useMemo(() => {
    return Object.values(selectedRevokes).filter(Boolean).length;
  }, [selectedRevokes]);

  return (
    <Page title="RBAC">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <h2 className="dark:text-dark-50 truncate text-xl font-medium tracking-wide text-gray-800">
            RBAC
          </h2>
          <p className="dark:text-dark-200 mt-1 text-sm text-gray-500">
            انتخاب کاربر + نمایش نقش/پرمیشن‌های موثر + مدیریت نقش‌ها/پرمیشن‌ها
            در کشوی پایین
          </p>

          {/* Top: User selection */}
          <Card className="mt-4 p-4 sm:px-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <Combobox
                  data={users}
                  displayField="email"
                  value={selectedUser as any}
                  onChange={(u: any) => {
                    setSelectedUser(u);
                    toast.info("کاربر انتخاب شد", {
                      description: u?.email ? String(u.email) : undefined,
                    });
                  }}
                  placeholder={
                    loadingUsers ? "در حال دریافت..." : "یک کاربر انتخاب کنید"
                  }
                  label="انتخاب کاربر"
                  searchFields={["email"]}
                />
                <div className="mt-2">
                  <Input
                    value={emailQuery}
                    onChange={(e) => setEmailQuery(e.currentTarget.value)}
                    placeholder="جستجوی ایمیل (Server)"
                    label="Search (Server)"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <Input
                  value={companyId}
                  onChange={(e) => setCompanyId(e.currentTarget.value)}
                  placeholder="company_id (اختیاری)"
                  label="Company ID"
                />
              </div>

              <div className="md:col-span-3">
                <Input
                  value={branchId}
                  onChange={(e) => setBranchId(e.currentTarget.value)}
                  placeholder="branch_id (اختیاری)"
                  label="Branch ID"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 md:col-span-12">
                <Button
                  disabled={!selectedUser?.id || loadingAccess || busyOverrides}
                  onClick={async () => {
                    await fetchAccess();
                    await fetchOverrides({ silent: true });
                  }}
                  className="space-x-2 rtl:space-x-reverse"
                >
                  <ArrowPathIcon className="size-5" />
                  <span>
                    {loadingAccess || busyOverrides
                      ? "در حال دریافت..."
                      : "دریافت دسترسی موثر"}
                  </span>
                </Button>

                <Button
                  variant="soft"
                  color="primary"
                  disabled={!selectedUser?.id}
                  onClick={async () => {
                    setErrorMsg(null);
                    openDrawer();
                    toast.info("Drawer باز شد");
                    if (!matrix) await fetchMatrix();
                    if (selectedUser?.id) await fetchOverrides({ silent: true });
                  }}
                  className="space-x-2 rtl:space-x-reverse"
                >
                  <CloudArrowUpIcon className="size-5" />
                  <span>مدیریت Role/Permission (Drawer)</span>
                </Button>

                <div className="dark:text-dark-200 text-xs text-gray-500">
                  {selectedUser?.id ? (
                    <>
                      roles:{" "}
                      <span className="dark:text-dark-100 text-gray-700">
                        {rolesCount}
                      </span>{" "}
                      — perms:{" "}
                      <span className="dark:text-dark-100 text-gray-700">
                        {permsCount}
                      </span>
                      {" — "}
                      overrides:{" "}
                      <span className="dark:text-dark-100 text-gray-700">
                        {grantsCount + revokesCount}
                      </span>
                    </>
                  ) : (
                    "ابتدا یک کاربر انتخاب کنید."
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="border-error-200 bg-error-50 text-error-700 dark:border-error-900/40 dark:bg-error-900/20 dark:text-error-200 mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                <ShieldExclamationIcon className="mt-0.5 size-4.5 shrink-0" />
                <span className="min-w-0">{errorMsg}</span>
              </div>
            )}
          </Card>

          {/* Effective Access: roles + perms */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4 sm:px-5">
              <div className="flex items-center justify-between">
                <p className="dark:text-dark-100 text-sm font-medium text-gray-800">
                  Roles (Effective)
                </p>
                <span className="dark:text-dark-200 text-xs text-gray-500">
                  {rolesCount} نقش
                </span>
              </div>

              <div className="dark:border-dark-600/70 mt-3 overflow-hidden rounded-lg border border-gray-200">
                <div className="dark:bg-dark-800 dark:text-dark-200 grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                  <div className="col-span-5">role_key</div>
                  <div className="col-span-4">company_id</div>
                  <div className="col-span-3">branch_id</div>
                </div>

                <div className="dark:divide-dark-600/70 divide-y divide-gray-200">
                  {access?.roles?.map((r, idx) => (
                    <div
                      key={`${r.role_key}-${r.company_id}-${r.branch_id}-${idx}`}
                      className="dark:text-dark-100 grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm text-gray-800"
                    >
                      <div className="col-span-5 truncate">{r.role_key}</div>
                      <div className="col-span-4 truncate">
                        {r.company_id ?? "—"}
                      </div>
                      <div className="col-span-3 truncate">
                        {r.branch_id ?? "—"}
                      </div>
                    </div>
                  ))}

                  {!loadingAccess && selectedUser?.id && rolesCount === 0 && (
                    <div className="dark:text-dark-200 px-3 py-6 text-center text-sm text-gray-500">
                      نقشی یافت نشد.
                    </div>
                  )}

                  {!selectedUser?.id && (
                    <div className="dark:text-dark-200 px-3 py-6 text-center text-sm text-gray-500">
                      برای نمایش نقش‌ها یک کاربر انتخاب کنید.
                    </div>
                  )}

                  {loadingAccess && (
                    <div className="dark:text-dark-200 px-3 py-6 text-center text-sm text-gray-500">
                      در حال دریافت...
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:px-5">
              <div className="flex items-center justify-between">
                <p className="dark:text-dark-100 text-sm font-medium text-gray-800">
                  Permissions (Effective)
                </p>
                <span className="dark:text-dark-200 text-xs text-gray-500">
                  {permsCount} پرمیشن
                </span>
              </div>

              <div className="dark:border-dark-600/70 mt-3 overflow-hidden rounded-lg border border-gray-200">
                <div className="dark:bg-dark-800 dark:text-dark-200 grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                  <div className="col-span-4">ترجمه</div>
                  <div className="col-span-4">توضیح</div>
                  <div className="col-span-4">key</div>
                </div>

                <div className="dark:divide-dark-600/70 divide-y divide-gray-200">
                  {access?.permissions?.map((key) => {
                    const meta = permsMap.get(key);
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm"
                      >
                        <div className="dark:text-dark-100 col-span-4 truncate text-gray-800">
                          {permissionLabelFa(key)}
                        </div>
                        <div className="dark:text-dark-200 col-span-4 truncate text-gray-600">
                          {meta?.description ?? "—"}
                        </div>
                        <div className="dark:text-dark-200 col-span-4 truncate font-mono text-xs text-gray-500">
                          {key}
                        </div>
                      </div>
                    );
                  })}

                  {!loadingAccess && selectedUser?.id && permsCount === 0 && (
                    <div className="dark:text-dark-200 px-3 py-6 text-center text-sm text-gray-500">
                      پرمیشنی یافت نشد.
                    </div>
                  )}

                  {!selectedUser?.id && (
                    <div className="dark:text-dark-200 px-3 py-6 text-center text-sm text-gray-500">
                      برای نمایش پرمیشن‌ها یک کاربر انتخاب کنید.
                    </div>
                  )}

                  {loadingAccess && (
                    <div className="dark:text-dark-200 px-3 py-6 text-center text-sm text-gray-500">
                      در حال دریافت...
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Confirm Modal */}
          <Transition appear show={confirmOpen} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-110"
              onClose={() => {
                if (!confirmBusy) setConfirmOpen(false);
              }}
            >
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm dark:bg-black/40" />
              </TransitionChild>

              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="shadow-soft dark:bg-dark-700 fixed top-1/2 left-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4">
                  <DialogTitle className="dark:text-dark-100 text-base font-medium text-gray-800">
                    {confirmTitle}
                  </DialogTitle>

                  {confirmDesc && (
                    <p className="dark:text-dark-200 mt-2 text-sm text-gray-600">
                      {confirmDesc}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outlined"
                      disabled={confirmBusy}
                      onClick={() => setConfirmOpen(false)}
                    >
                      انصراف
                    </Button>
                    <Button
                      color="primary"
                      disabled={confirmBusy}
                      onClick={async () => {
                        toast.info("در حال انجام عملیات...");
                        try {
                          await runConfirmAction();
                          toast.success("انجام شد");
                        } catch (e: any) {
                          const msg =
                            e?.response?.data?.message ||
                            e?.message ||
                            "خطا در انجام عملیات";
                          toast.error("خطا", { description: msg });
                        }
                      }}
                    >
                      {confirmBusy ? "در حال انجام..." : "تأیید"}
                    </Button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </Dialog>
          </Transition>

          {/* Bottom Drawer */}
          <Transition appear show={isDrawerOpen} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-100"
              onClose={() => {
                if (!busyAssign && !busySync && !busyOverrides) closeDrawer();
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
                {/* ✅ UPDATED: بیشتر باز می‌شود تا دکمه‌های Sync نصفه دیده نشوند */}
                <DialogPanel className="dark:bg-dark-700 fixed bottom-0 left-0 flex w-full transform-gpu flex-col rounded-t-2xl bg-white transition-transform duration-200 max-h-[96vh]">
                  {/* ✅ UPDATED: Handle کوچک برای زیبایی */}
                  <div className="flex justify-center pt-2">
                    <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-dark-500" />
                  </div>

                  <div className="dark:bg-dark-800 flex items-center justify-between gap-2 rounded-t-2xl bg-gray-200 px-4 py-3 sm:px-5">
                    <DialogTitle
                      as="h3"
                      className="dark:text-dark-100 text-base font-medium text-gray-800"
                    >
                      مدیریت Role/Permissions
                    </DialogTitle>

                    {/* ✅ UPDATED: دکمه‌های آیکون‌دار */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outlined"
                        isIcon
                        className="size-8 rounded-full"
                        disabled={loadingMatrix}
                        onClick={() => fetchMatrix({ silent: true })}
                        title="رفرش Matrix"
                      >
                        <ArrowPathIcon className="size-5" />
                      </Button>

                      <Button
                        onClick={closeDrawer}
                        variant="flat"
                        isIcon
                        className="size-8 shrink-0 rounded-full"
                        disabled={busyAssign || busySync || busyOverrides}
                        title="بستن"
                      >
                        <XMarkIcon className="size-5" />
                      </Button>
                    </div>
                  </div>

                  {/* ✅ UPDATED: کل محتوای drawer اسکرول‌پذیر شد تا انتها همیشه در دسترس باشد */}
                  <div className="flex-1 overflow-auto p-4 sm:p-5">
                    {!matrix && (
                      <div className="flex min-h-[40vh] items-center justify-center">
                        <Button
                          disabled={loadingMatrix}
                          onClick={() => fetchMatrix()}
                          className="space-x-2 rtl:space-x-reverse"
                        >
                          <ArrowPathIcon className="size-5" />
                          <span>
                            {loadingMatrix
                              ? "در حال دریافت..."
                              : "دریافت Matrix"}
                          </span>
                        </Button>
                      </div>
                    )}

                    {matrix && (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Roles column */}
                        <div className="lg:col-span-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="dark:text-dark-100 text-sm font-medium text-gray-800">
                              Roleها
                            </p>

                            <Button
                              variant="outlined"
                              disabled={loadingMatrix}
                              onClick={() => fetchMatrix()}
                              className="space-x-2 rtl:space-x-reverse"
                            >
                              <ArrowPathIcon className="size-5" />
                              <span>رفرش</span>
                            </Button>
                          </div>

                          <div className="mt-2">
                            <Input
                              value={roleFilter}
                              onChange={(e) =>
                                setRoleFilter(e.currentTarget.value)
                              }
                              placeholder="جستجو role..."
                            />
                          </div>

                          <div className="dark:border-dark-600/70 mt-3 max-h-[40vh] overflow-auto rounded-lg border border-gray-200">
                            {rolesList.map((r) => (
                              <button
                                key={r.key}
                                className={clsx(
                                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm",
                                  r.key === selectedRoleKey
                                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200"
                                    : "dark:hover:bg-dark-800 hover:bg-gray-50",
                                )}
                                onClick={() => {
                                  setSelectedRoleKey(r.key);
                                  toast.info("نقش انتخاب شد", {
                                    description: `${r.name} (${r.key})`,
                                  });
                                }}
                                type="button"
                              >
                                <span className="truncate">{r.name}</span>
                                <span className="dark:text-dark-200 shrink-0 font-mono text-xs text-gray-500">
                                  {r.key}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Assign role to selected user */}
                          <Card className="mt-4 p-3">
                            <p className="dark:text-dark-100 text-sm font-medium text-gray-800">
                              Assign Role به کاربر
                            </p>

                            <div className="mt-2 space-y-2">
                              <div className="dark:text-dark-200 text-xs text-gray-500">
                                کاربر:{" "}
                                <span className="dark:text-dark-100 text-gray-700">
                                  {selectedUser?.email ?? "—"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <Input
                                  value={companyId}
                                  onChange={(e) =>
                                    setCompanyId(e.currentTarget.value)
                                  }
                                  placeholder="company_id (اختیاری)"
                                />
                                <Input
                                  value={branchId}
                                  onChange={(e) =>
                                    setBranchId(e.currentTarget.value)
                                  }
                                  placeholder="branch_id (اختیاری)"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {/* Assign */}
                                <Button
                                  disabled={
                                    !selectedUser?.id ||
                                    !selectedRoleKey ||
                                    busyAssign
                                  }
                                  onClick={() => {
                                    if (!selectedUser?.id || !selectedRoleKey)
                                      return;

                                    const userEmail =
                                      selectedUser?.email ?? "—";
                                    const scopeTxt = scopeText(
                                      companyId,
                                      branchId,
                                    );

                                    askConfirm({
                                      title: "تأیید Assign Role",
                                      description: `نقش "${selectedRoleKey}" برای کاربر "${userEmail}" ثبت شود؟ (${scopeTxt})`,
                                      action: async () => {
                                        setErrorMsg(null);
                                        setBusyAssign(true);
                                        try {
                                          await rbacApi.assignUserRole(
                                            selectedUser.id,
                                            {
                                              role_key: selectedRoleKey,
                                              company_id:
                                                companyId.trim() || null,
                                              branch_id:
                                                branchId.trim() || null,
                                            },
                                          );

                                          toast.success("Role ثبت شد", {
                                            description: `${selectedRoleKey} → ${userEmail}`,
                                          });

                                          await fetchAccess({ silent: true });
                                          await fetchOverrides({
                                            silent: true,
                                          });
                                        } catch (e: any) {
                                          const msg =
                                            e?.response?.data?.message ||
                                            e?.message ||
                                            "خطا در Assign role";
                                          setErrorMsg(msg);
                                          toast.error("خطا در Assign role", {
                                            description: msg,
                                          });
                                          throw e;
                                        } finally {
                                          setBusyAssign(false);
                                        }
                                      },
                                    });
                                  }}
                                  className="w-full"
                                >
                                  {busyAssign ? "در حال ثبت..." : "Assign"}
                                </Button>

                                {/* Remove */}
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  disabled={
                                    !selectedUser?.id ||
                                    !selectedRoleKey ||
                                    busyAssign
                                  }
                                  onClick={() => {
                                    if (!selectedUser?.id || !selectedRoleKey)
                                      return;

                                    const userEmail =
                                      selectedUser?.email ?? "—";
                                    const scopeTxt = scopeText(
                                      companyId,
                                      branchId,
                                    );

                                    askConfirm({
                                      title: "تأیید حذف نقش",
                                      description: `نقش "${selectedRoleKey}" از کاربر "${userEmail}" حذف شود؟ (${scopeTxt})`,
                                      action: async () => {
                                        setErrorMsg(null);
                                        setBusyAssign(true);
                                        try {
                                          await rbacApi.removeUserRole(
                                            selectedUser.id,
                                            {
                                              role_key: selectedRoleKey,
                                              company_id:
                                                companyId.trim() || null,
                                              branch_id:
                                                branchId.trim() || null,
                                            },
                                          );

                                          toast.success("Role حذف شد", {
                                            description: `${selectedRoleKey} ← ${userEmail}`,
                                          });

                                          await fetchAccess({ silent: true });
                                          await fetchOverrides({
                                            silent: true,
                                          });
                                        } catch (e: any) {
                                          const msg =
                                            e?.response?.data?.message ||
                                            e?.message ||
                                            "خطا در حذف نقش";
                                          setErrorMsg(msg);
                                          toast.error("خطا در حذف نقش", {
                                            description: msg,
                                          });
                                          throw e;
                                        } finally {
                                          setBusyAssign(false);
                                        }
                                      },
                                    });
                                  }}
                                  className="w-full"
                                >
                                  {busyAssign ? "در حال انجام..." : "Remove"}
                                </Button>
                              </div>

                              <div className="dark:text-dark-200 text-xs text-gray-500">
                                نکته: حذف هم Scoped است؛ یعنی دقیقاً همین role +
                                company_id + branch_id حذف می‌شود.
                              </div>
                            </div>
                          </Card>

                          {/* Permission Overrides card (inside Drawer) */}
                          <Card className="mt-4 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                                  Permission Overrides کاربر (GRANT/REVOKE)
                                </p>

                                <p className="mt-1 text-xs text-gray-500 dark:text-dark-200">
                                  فقط overrides در همین scope را جایگزین می‌کند
                                  و به role ها کاری ندارد.
                                </p>

                                {/* ✅ زیباسازی: Badge برای نمایش شمارش‌ها */}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="soft"
                                    color="success"
                                    className="gap-2 rounded-full px-3"
                                  >
                                    <span>GRANT</span>
                                    <span className="font-mono">
                                      {uiGrantsCount}
                                    </span>
                                  </Badge>
                                  <Badge
                                    variant="soft"
                                    color="warning"
                                    className="gap-2 rounded-full px-3"
                                  >
                                    <span>REVOKE</span>
                                    <span className="font-mono">
                                      {uiRevokesCount}
                                    </span>
                                  </Badge>
                                  <Badge
                                    variant="outlined"
                                    className="rounded-full px-3"
                                  >
                                    {scopeText(companyId, branchId)}
                                  </Badge>
                                </div>
                              </div>

                              <Button
                                variant="outlined"
                                isIcon
                                className="size-9 rounded-full"
                                disabled={!selectedUser?.id || busyOverrides}
                                onClick={() => fetchOverrides()}
                                title="رفرش Overrides"
                              >
                                <ArrowPathIcon className="size-5" />
                              </Button>
                            </div>

                            {/* ✅ UPDATED: لیست‌ها بلندتر + اسکرول داخلی؛ دکمه Sync دیگر نصفه نمی‌ماند */}
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                              {/* GRANTS */}
                              <div className="rounded-lg border border-gray-200 p-2 dark:border-dark-600/70">
                                <p className="mb-2 text-xs font-medium text-gray-700 dark:text-dark-200">
                                  GRANT (اجازه اضافی)
                                </p>

                                <div className="max-h-56 overflow-auto space-y-1 pr-1">
                                  {permsCatalog.map((p) => {
                                    const checked = !!selectedGrants[p.key];

                                    return (
                                      <div
                                        key={`g-${p.key}`}
                                        className="rounded-md px-1 py-1 hover:bg-gray-50 dark:hover:bg-dark-800"
                                      >
                                        {/* ✅ UPDATED: استفاده از Checkbox کامپوننت + جلوگیری از مشکل e.currentTarget */}
                                        <Checkbox
                                          variant="outlined"
                                          checked={checked}
                                          label={
                                            <span className="truncate text-xs text-gray-800 dark:text-dark-100">
                                              {permissionLabelFa(p.key)}
                                            </span>
                                          }
                                          onChange={() => {
                                            const nextChecked = !checked;

                                            setSelectedGrants((prev) => {
                                              const next = { ...prev };
                                              next[p.key] = nextChecked;
                                              return next;
                                            });

                                            // اگر در REVOKE تیک بود، حذفش کن
                                            if (nextChecked) {
                                              setSelectedRevokes((prev) => {
                                                if (!prev[p.key]) return prev;
                                                const next = { ...prev };
                                                delete next[p.key];
                                                return next;
                                              });
                                            }
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* REVOKES */}
                              <div className="rounded-lg border border-gray-200 p-2 dark:border-dark-600/70">
                                <p className="mb-2 text-xs font-medium text-gray-700 dark:text-dark-200">
                                  REVOKE (محرومیت)
                                </p>

                                <div className="max-h-56 overflow-auto space-y-1 pr-1">
                                  {permsCatalog.map((p) => {
                                    const checked = !!selectedRevokes[p.key];

                                    return (
                                      <div
                                        key={`r-${p.key}`}
                                        className="rounded-md px-1 py-1 hover:bg-gray-50 dark:hover:bg-dark-800"
                                      >
                                        <Checkbox
                                          variant="outlined"
                                          checked={checked}
                                          label={
                                            <span className="truncate text-xs text-gray-800 dark:text-dark-100">
                                              {permissionLabelFa(p.key)}
                                            </span>
                                          }
                                          onChange={() => {
                                            const nextChecked = !checked;

                                            setSelectedRevokes((prev) => {
                                              const next = { ...prev };
                                              next[p.key] = nextChecked;
                                              return next;
                                            });

                                            // اگر در GRANT تیک بود، حذفش کن
                                            if (nextChecked) {
                                              setSelectedGrants((prev) => {
                                                if (!prev[p.key]) return prev;
                                                const next = { ...prev };
                                                delete next[p.key];
                                                return next;
                                              });
                                            }
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* ✅ UPDATED: اکشن‌بار استیکی داخل کارت برای اینکه همیشه دیده شود */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-2 dark:bg-dark-800">
                              <div className="text-xs text-gray-500 dark:text-dark-200">
                                کاربر:{" "}
                                <span className="text-gray-700 dark:text-dark-100">
                                  {selectedUser?.email ?? "—"}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outlined"
                                  disabled={!overrides || busyOverrides}
                                  onClick={() => {
                                    setSelectedGrants(
                                      Object.fromEntries(
                                        (overrides?.grants ?? []).map((k) => [
                                          k,
                                          true,
                                        ]),
                                      ),
                                    );
                                    setSelectedRevokes(
                                      Object.fromEntries(
                                        (overrides?.revokes ?? []).map((k) => [
                                          k,
                                          true,
                                        ]),
                                      ),
                                    );
                                    toast.info("به وضعیت فعلی overrides برگشت");
                                  }}
                                  className="space-x-2 rtl:space-x-reverse"
                                >
                                  <ArrowPathIcon className="size-5" />
                                  <span>بازگشت</span>
                                </Button>

                                <Button
                                  color="primary"
                                  disabled={!selectedUser?.id || busyOverrides}
                                  onClick={() => {
                                    if (!selectedUser?.id) return;

                                    const grants = Object.entries(
                                      selectedGrants,
                                    )
                                      .filter(([, v]) => v)
                                      .map(([k]) => k);

                                    const revokes = Object.entries(
                                      selectedRevokes,
                                    )
                                      .filter(([, v]) => v)
                                      .map(([k]) => k);

                                    const userEmail =
                                      selectedUser?.email ?? "—";
                                    const scopeTxt = scopeText(
                                      companyId,
                                      branchId,
                                    );

                                    askConfirm({
                                      title: "تأیید Sync Overrides",
                                      description:
                                        `Overrides کاربر "${userEmail}" در scope (${scopeTxt}) با مقادیر جدید جایگزین شود؟ ` +
                                        `(GRANT=${grants.length} / REVOKE=${revokes.length})`,
                                      action: async () => {
                                        setBusyOverrides(true);
                                        try {
                                          await rbacApi.replaceUserOverrides(
                                            selectedUser.id,
                                            {
                                              company_id:
                                                companyId.trim() || null,
                                              branch_id:
                                                branchId.trim() || null,
                                              grants,
                                              revokes,
                                            },
                                          );

                                          toast.success("Overrides ذخیره شد", {
                                            description: `${userEmail} (G:${grants.length} / R:${revokes.length})`,
                                          });

                                          await fetchOverrides({
                                            silent: true,
                                          });
                                          await fetchAccess({ silent: true });
                                        } catch (e: any) {
                                          const msg =
                                            e?.response?.data?.message ||
                                            e?.message ||
                                            "خطا در ذخیره overrides";
                                          toast.error("خطا", {
                                            description: msg,
                                          });
                                          throw e;
                                        } finally {
                                          setBusyOverrides(false);
                                        }
                                      },
                                    });
                                  }}
                                  className="space-x-2 rtl:space-x-reverse"
                                >
                                  <CloudArrowUpIcon className="size-5" />
                                  <span>
                                    {busyOverrides
                                      ? "در حال Sync..."
                                      : "Sync Overrides"}
                                  </span>
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Permissions column */}
                        <div className="lg:col-span-8">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="dark:text-dark-100 text-sm font-medium text-gray-800">
                                Permissions نقش
                              </p>
                              <p className="dark:text-dark-200 mt-0.5 text-xs text-gray-500">
                                نقش انتخاب‌شده:{" "}
                                <span className="dark:text-dark-100 font-mono text-gray-700">
                                  {selectedRoleKey || "—"}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outlined"
                                disabled={!selectedRole || busySync}
                                onClick={() => {
                                  if (!selectedRole) return;
                                  setSelectedPerms(
                                    Object.fromEntries(
                                      (selectedRole.permissions ?? []).map(
                                        (p) => [p, true],
                                      ),
                                    ),
                                  );
                                  toast.info("به وضعیت فعلی نقش برگشت");
                                }}
                              >
                                بازگشت به وضعیت نقش
                              </Button>

                              <Button
                                color="primary"
                                disabled={!selectedRoleKey || busySync}
                                onClick={() => {
                                  if (!selectedRoleKey) return;

                                  const next = Object.entries(selectedPerms)
                                    .filter(([, v]) => v)
                                    .map(([k]) => k);

                                  askConfirm({
                                    title: "تأیید Sync (Replace)",
                                    description:
                                      `پرمیشن‌های نقش "${selectedRoleKey}" با ${next.length} مورد انتخاب‌شده جایگزین شود؟ ` +
                                      `این عملیات جایگزین کامل است (Replace).`,
                                    action: async () => {
                                      setErrorMsg(null);
                                      setBusySync(true);
                                      try {
                                        await rbacApi.replaceRolePermissions(
                                          selectedRoleKey,
                                          {
                                            permissions: next,
                                          },
                                        );

                                        toast.success(
                                          "Permissions نقش Sync شد",
                                          {
                                            description: `${selectedRoleKey} (${next.length})`,
                                          },
                                        );

                                        await fetchMatrix({ silent: true });
                                        await fetchAccess({ silent: true });
                                        await fetchOverrides({
                                          silent: true,
                                        });
                                      } catch (e: any) {
                                        const msg =
                                          e?.response?.data?.message ||
                                          e?.message ||
                                          "خطا در Sync permissions نقش";
                                        setErrorMsg(msg);
                                        toast.error("خطا در Sync", {
                                          description: msg,
                                        });
                                        throw e;
                                      } finally {
                                        setBusySync(false);
                                      }
                                    },
                                  });
                                }}
                                className="space-x-2 rtl:space-x-reverse"
                              >
                                <CloudArrowUpIcon className="size-5" />
                                <span>
                                  {busySync
                                    ? "در حال Sync..."
                                    : "Sync (Replace)"}
                                </span>
                              </Button>
                            </div>
                          </div>

                          <div className="dark:border-dark-600/70 mt-3 max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
                            <div className="dark:bg-dark-800 dark:text-dark-200 grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                              <div className="col-span-1">✓</div>
                              <div className="col-span-4">ترجمه</div>
                              <div className="col-span-4">توضیح</div>
                              <div className="col-span-3">key</div>
                            </div>

                            <div className="dark:divide-dark-600/70 divide-y divide-gray-200">
                              {permsCatalog.map((p) => {
                                const checked = !!selectedPerms[p.key];

                                return (
                                  <label
                                    key={p.key}
                                    className="dark:hover:bg-dark-800 grid cursor-pointer grid-cols-12 items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                                  >
                                    <div className="col-span-1">
                                      {/* ✅ UPDATED: جلوگیری از مشکل currentTarget با عدم استفاده از event */}
                                      <Checkbox
                                        checked={checked}
                                        onChange={() => {
                                          setSelectedPerms((prev) => ({
                                            ...prev,
                                            [p.key]: !checked,
                                          }));
                                        }}
                                      />
                                    </div>

                                    <div className="dark:text-dark-100 col-span-4 truncate text-gray-800">
                                      {permissionLabelFa(p.key)}
                                    </div>

                                    <div className="dark:text-dark-200 col-span-4 truncate text-gray-600">
                                      {p.description}
                                    </div>

                                    <div className="dark:text-dark-200 col-span-3 truncate font-mono text-xs text-gray-500">
                                      {p.key}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="dark:text-dark-200 mt-3 text-xs text-gray-500">
                            نکته: Sync (Replace) یعنی دقیقاً همین تیک‌ها جایگزین
                            permissions نقش می‌شوند.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </Dialog>
          </Transition>
        </div>
      </div>
    </Page>
  );
}
