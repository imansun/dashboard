// src\app\pages\settings\sections\Rbac.tsx
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Button, Card } from "@/components/ui";
import { Input } from "@/components/ui/Form/Input";
import { Select } from "@/components/ui/Form/Select";

import { usersApi } from "@/app/services/users/users.api";
import type { User } from "@/app/services/users/users.types";

import { rbacApi } from "@/app/services/rbac/rbac.api";
import type {
  AssignRolePayload,
  RoleItem,
  PermissionItem,
} from "@/app/services/rbac/rbac.types";

type TabKey = "user_roles" | "effective_access" | "matrix";
type ScopeMode = "global" | "company" | "branch";

export default function RbacSettingsPage() {
  const [tab, setTab] = useState<TabKey>("user_roles");

  // user picker
  const [emailQuery, setEmailQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // catalogs
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadCatalogs() {
    const [r, p] = await Promise.all([
      rbacApi.listRoles(),
      rbacApi.listPermissions(),
    ]);

    setRoles(r.data.items ?? []);
    setPermissions(p.data.items ?? []);
  }

  async function searchUsers() {
    // از usersApi.list خودت استفاده می‌کنیم
    const res = await usersApi.list({
      email: emailQuery.trim() || undefined,
      offset: 0,
      limit: 20,
    });
    setUsers(res.data.items);
    if (!selectedUserId && res.data.items?.[0]?.id) {
      setSelectedUserId(res.data.items[0].id);
    }
  }

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    Promise.all([loadCatalogs(), searchUsers()])
      .catch((e: any) =>
        setErrorMsg(e?.response?.data?.message || "خطا در دریافت اطلاعات RBAC")
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page title="RBAC">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
            RBAC
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">
            مدیریت نقش‌ها، سطح دسترسی موثر و ماتریس نقش/پرمیشن
          </p>

          {/* Top bar: user search + user select */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <Input
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.currentTarget.value)}
                placeholder="جستجوی ایمیل کاربر (Exact/Like بسته به API)"
              />
            </div>
            <div className="md:col-span-3">
              <Button
                disabled={loading}
                className="w-full"
                onClick={() => searchUsers()}
              >
                جستجو
              </Button>
            </div>
            <div className="md:col-span-3">
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.currentTarget.value)}
              >
                <option value="" disabled>
                  انتخاب کاربر
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-900/20 dark:text-error-200">
              {errorMsg}
            </div>
          )}

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            <TabButton
              active={tab === "user_roles"}
              onClick={() => setTab("user_roles")}
            >
              نقش‌های کاربر
            </TabButton>
            <TabButton
              active={tab === "effective_access"}
              onClick={() => setTab("effective_access")}
            >
              دسترسی موثر
            </TabButton>
            <TabButton active={tab === "matrix"} onClick={() => setTab("matrix")}>
              ماتریس نقش/پرمیشن
            </TabButton>
          </div>

          <div className="mt-4">
            {tab === "user_roles" && (
              <UserRolesSection
                userId={selectedUserId}
                roles={roles}
                loading={loading}
                onError={setErrorMsg}
              />
            )}

            {tab === "effective_access" && (
              <EffectiveAccessSection
                userId={selectedUserId}
                loading={loading}
                onError={setErrorMsg}
              />
            )}

            {tab === "matrix" && (
              <MatrixSection
                roles={roles}
                permissions={permissions}
                loading={loading}
                onError={setErrorMsg}
              />
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "filled" : "soft"}
      color={active ? "primary" : "neutral"}
      onClick={onClick}
      className="h-9"
    >
      {children}
    </Button>
  );
}

// -------------------- Sections --------------------

function UserRolesSection({
  userId,
  roles,
  loading,
  onError,
}: {
  userId: string;
  roles: RoleItem[];
  loading: boolean;
  onError: (msg: string | null) => void;
}) {
  const [roleKey, setRoleKey] = useState("");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("global");
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");

  const [assignments, setAssignments] = useState<any[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const payload: AssignRolePayload = useMemo(() => {
    const p: AssignRolePayload = { role_key: roleKey };
    if (scopeMode === "company" || scopeMode === "branch")
      p.company_id = companyId || null;
    if (scopeMode === "branch") p.branch_id = branchId || null;
    return p;
  }, [roleKey, scopeMode, companyId, branchId]);

  async function refresh() {
    if (!userId) return;
    const res = await rbacApi.listUserRoles(userId);
    setAssignments(res.data ?? []);
  }

  useEffect(() => {
    setAssignments([]);
    onError(null);
    if (!userId) return;
    setIsBusy(true);
    refresh()
      .catch((e: any) =>
        onError(e?.response?.data?.message || "خطا در دریافت نقش‌های کاربر")
      )
      .finally(() => setIsBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Card className="p-4 sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
            Role Assignments
          </p>
          <Button
            variant="outlined"
            disabled={!userId || isBusy || loading}
            onClick={refresh}
          >
            رفرش
          </Button>
        </div>

        {/* Assign form */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <Select value={roleKey} onChange={(e) => setRoleKey(e.currentTarget.value)}>
              <option value="">انتخاب نقش</option>
              {roles.map((r) => (
                <option key={r.id} value={r.key}>
                  {r.name} ({r.key})
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-3">
            <Select
              value={scopeMode}
              onChange={(e) => setScopeMode(e.currentTarget.value as ScopeMode)}
            >
              <option value="global">Global</option>
              <option value="company">Company</option>
              <option value="branch">Branch</option>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Input
              value={companyId}
              onChange={(e) => setCompanyId(e.currentTarget.value)}
              placeholder="company_id (UUID)"
              disabled={scopeMode === "global"}
            />
          </div>

          <div className="md:col-span-3">
            <Input
              value={branchId}
              onChange={(e) => setBranchId(e.currentTarget.value)}
              placeholder="branch_id (UUID)"
              disabled={scopeMode !== "branch"}
            />
          </div>

          <div className="md:col-span-12 flex gap-2">
            <Button
              disabled={!userId || !payload.role_key || isBusy || loading}
              onClick={async () => {
                onError(null);
                setIsBusy(true);
                try {
                  await rbacApi.assignUserRole(userId, payload);
                  await refresh();
                } catch (e: any) {
                  onError(e?.response?.data?.message || "خطا در Assign role");
                } finally {
                  setIsBusy(false);
                }
              }}
            >
              Assign
            </Button>

            <Button
              variant="outlined"
              disabled={!userId || !payload.role_key || isBusy || loading}
              onClick={async () => {
                onError(null);
                setIsBusy(true);
                try {
                  await rbacApi.removeUserRole(userId, payload);
                  await refresh();
                } catch (e: any) {
                  onError(e?.response?.data?.message || "خطا در Remove role");
                } finally {
                  setIsBusy(false);
                }
              }}
            >
              Remove (Scoped)
            </Button>
          </div>
        </div>

        {/* Assignments list (simple) */}
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600/70">
          <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-200">
            <div className="col-span-4">Role</div>
            <div className="col-span-4">Company</div>
            <div className="col-span-4">Branch</div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-dark-600/70">
            {assignments.map((a, idx) => (
              <div
                key={`${a.role_key}-${a.company_id}-${a.branch_id}-${idx}`}
                className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm text-gray-800 dark:text-dark-100"
              >
                <div className="col-span-4 truncate">{a.role_key}</div>
                <div className="col-span-4 truncate">{a.company_id ?? "—"}</div>
                <div className="col-span-4 truncate">{a.branch_id ?? "—"}</div>
              </div>
            ))}

            {!isBusy && assignments.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-dark-200">
                موردی یافت نشد
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function EffectiveAccessSection({
  userId,
  loading,
  onError,
}: {
  userId: string;
  loading: boolean;
  onError: (msg: string | null) => void;
}) {
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function fetchAccess() {
    if (!userId) return;
    const res = await rbacApi.getUserAccess(userId, {
      company_id: companyId.trim() || undefined,
      branch_id: branchId.trim() || undefined,
    });
    setData(res.data);
  }

  return (
    <Card className="p-4 sm:px-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Input
            value={companyId}
            onChange={(e) => setCompanyId(e.currentTarget.value)}
            placeholder="company_id (اختیاری)"
          />
        </div>
        <div className="md:col-span-4">
          <Input
            value={branchId}
            onChange={(e) => setBranchId(e.currentTarget.value)}
            placeholder="branch_id (اختیاری)"
          />
        </div>
        <div className="md:col-span-4">
          <Button
            className="w-full"
            disabled={!userId || isBusy || loading}
            onClick={async () => {
              onError(null);
              setIsBusy(true);
              try {
                await fetchAccess();
              } catch (e: any) {
                onError(
                  e?.response?.data?.message || "خطا در دریافت دسترسی موثر"
                );
              } finally {
                setIsBusy(false);
              }
            }}
          >
            دریافت
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {!data ? (
          <div className="text-sm text-gray-500 dark:text-dark-200">
            هنوز داده‌ای دریافت نشده.
          </div>
        ) : (
          <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-dark-800 dark:text-dark-100">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}

function MatrixSection({
  roles,
  permissions,
  loading,
  onError,
}: {
  roles: RoleItem[];
  permissions: PermissionItem[];
  loading: boolean;
  onError: (msg: string | null) => void;
}) {
  const [matrix, setMatrix] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Record<string, boolean>>(
    {}
  );
  const [isBusy, setIsBusy] = useState(false);

  async function loadMatrix() {
    const res = await rbacApi.getMatrix();
    setMatrix(res.data);
  }

  async function loadRole(roleKey: string) {
    const res = await rbacApi.getRolePermissions(roleKey);
    const perms = res.data ?? [];
    setRolePerms(perms);
    setSelectedPerms(Object.fromEntries(perms.map((p) => [p, true])));
  }

  useEffect(() => {
    setIsBusy(true);
    loadMatrix()
      .catch((e: any) =>
        onError(e?.response?.data?.message || "خطا در دریافت ماتریس RBAC")
      )
      .finally(() => setIsBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allPermissionKeys = useMemo(() => {
    // 1) اولویت با catalog که از API permissions میاد (items)
    const fromCatalog = permissions?.map((p) => p.key) ?? [];
    if (fromCatalog.length) return fromCatalog;

    // 2) fallback: از matrix.permissions_catalog اگر وجود داشت
    const fromMatrix =
      matrix?.permissions_catalog?.map((p: any) => p?.key).filter(Boolean) ?? [];
    if (fromMatrix.length) return fromMatrix;

    return [];
  }, [permissions, matrix]);

  return (
    <Card className="p-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outlined" disabled={isBusy || loading} onClick={loadMatrix}>
          رفرش ماتریس
        </Button>

        <div className="min-w-[220px]">
          <Select
            value={selectedRole}
            onChange={async (e) => {
              const rk = e.currentTarget.value;
              setSelectedRole(rk);
              onError(null);
              setIsBusy(true);
              try {
                await loadRole(rk);
              } catch (err: any) {
                onError(err?.response?.data?.message || "خطا در دریافت permissions نقش");
              } finally {
                setIsBusy(false);
              }
            }}
          >
            <option value="">انتخاب نقش</option>
            {roles.map((r) => (
              <option key={r.id} value={r.key}>
                {r.name} ({r.key})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
            Matrix
          </p>
          <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-dark-800 dark:text-dark-100">
            {matrix ? JSON.stringify(matrix, null, 2) : "—"}
          </pre>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
            Role Permissions
          </p>

          {!selectedRole ? (
            <div className="mt-2 text-sm text-gray-500 dark:text-dark-200">
              یک نقش انتخاب کن تا permissions آن را ببینی و Sync کنی.
            </div>
          ) : (
            <>
              <div className="mt-2 max-h-[360px] overflow-auto rounded-lg border border-gray-200 p-2 dark:border-dark-600/70">
                {allPermissionKeys.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-dark-200">
                    catalog permissions خالی است.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {allPermissionKeys.map((p) => (
                      <label
                        key={p}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-dark-800"
                      >
                        <span className="truncate text-gray-700 dark:text-dark-100">
                          {p}
                        </span>
                        <input
                          type="checkbox"
                          checked={!!selectedPerms[p]}
                          onChange={(e) =>
                            setSelectedPerms((prev) => ({
                              ...prev,
                              [p]: e.currentTarget.checked,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  disabled={isBusy || loading}
                  onClick={async () => {
                    onError(null);
                    setIsBusy(true);
                    try {
                      const next = Object.entries(selectedPerms)
                        .filter(([, v]) => v)
                        .map(([k]) => k);

                      await rbacApi.replaceRolePermissions(selectedRole, {
                        permissions: next,
                      });
                      await loadRole(selectedRole);
                    } catch (e: any) {
                      onError(e?.response?.data?.message || "خطا در Sync permissions نقش");
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                >
                  Sync (Replace)
                </Button>

                <Button
                  variant="outlined"
                  disabled={isBusy || loading}
                  onClick={() => {
                    // reset to current role perms
                    setSelectedPerms(
                      Object.fromEntries(rolePerms.map((p) => [p, true]))
                    );
                  }}
                >
                  بازگشت به وضعیت فعلی نقش
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
