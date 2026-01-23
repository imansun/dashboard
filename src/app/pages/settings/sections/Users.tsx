// src\app\pages\settings\sections\Users.tsx
import { useEffect, useMemo, useState } from "react";
import { Page } from "@/components/shared/Page";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form/Input";
import { Select } from "@/components/ui/Form/Select";
import { usersApi } from "@/app/services/users/users.api";
import type { User } from "@/app/services/users/users.types";

type ActiveFilter = "all" | "true" | "false";

export default function UsersSettingsPage() {
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState<ActiveFilter>("all");

  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeBool = useMemo(() => {
    if (isActive === "all") return undefined;
    return isActive === "true";
  }, [isActive]);

  async function fetchList(nextOffset = offset) {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await usersApi.list({
        email: email.trim() || undefined,
        is_active: activeBool,
        offset: nextOffset,
        limit,
      });

      setItems(res.data.items);
      setTotal(res.data.total);
      setOffset(res.data.offset);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || "خطا در دریافت لیست کاربران");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchList(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <Page title="Users">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium tracking-wide text-gray-800 dark:text-dark-50">
            کاربران
          </h2>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <Input
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                placeholder="فیلتر ایمیل (Exact)"
              />
            </div>

            <div className="md:col-span-3">
              <Select
                value={isActive}
                onChange={(e) => setIsActive(e.currentTarget.value as ActiveFilter)}
              >
                <option value="all">همه</option>
                <option value="true">فعال</option>
                <option value="false">غیرفعال</option>
              </Select>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <Button
                className="w-full"
                disabled={isLoading}
                onClick={() => fetchList(0)}
              >
                {isLoading ? "در حال بارگذاری..." : "جستجو"}
              </Button>

              <Button
                variant="outlined"
                className="w-full"
                disabled={isLoading}
                onClick={() => {
                  setEmail("");
                  setIsActive("all");
                  // بعد از reset، لیست از اول
                  queueMicrotask(() => fetchList(0));
                }}
              >
                پاک کردن
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-900/20 dark:text-error-200">
              {errorMsg}
            </div>
          )}

          {/* List */}
          <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600/70">
            <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-200">
              <div className="col-span-6">ایمیل</div>
              <div className="col-span-3">وضعیت</div>
              <div className="col-span-3 text-end">عملیات</div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-dark-600/70">
              {items.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm text-gray-800 dark:text-dark-100"
                >
                  <div className="col-span-6 truncate">{u.email}</div>
                  <div className="col-span-3">
                    {u.is_active ? "فعال" : "غیرفعال"}
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    {u.is_active ? (
                      <Button
                        variant="soft"
                        color="warning"
                        disabled={isLoading}
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            await usersApi.deactivate(u.id);
                            await fetchList(offset);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        غیرفعال
                      </Button>
                    ) : (
                      <Button
                        variant="soft"
                        color="success"
                        disabled={isLoading}
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            await usersApi.activate(u.id);
                            await fetchList(offset);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        فعال
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {!isLoading && items.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-dark-200">
                  موردی یافت نشد
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-dark-200">
            <div>
              {total > 0 ? (
                <>
                  نمایش {offset + 1} تا {Math.min(offset + limit, total)} از {total}
                </>
              ) : (
                "—"
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(limit)}
                onChange={(e) => {
                  setOffset(0);
                  setLimit(Number(e.currentTarget.value));
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>

              <Button
                variant="outlined"
                disabled={!canPrev || isLoading}
                onClick={() => fetchList(Math.max(0, offset - limit))}
              >
                قبلی
              </Button>
              <Button
                variant="outlined"
                disabled={!canNext || isLoading}
                onClick={() => fetchList(offset + limit)}
              >
                بعدی
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
