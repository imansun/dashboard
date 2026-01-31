// src/app/pages/archive/index.tsx
import { useEffect, useMemo, useState } from "react";

import { Card, Button, Badge } from "@/components/ui";
import { docsApi } from "@/app/services/docs";
import { useAuthContext } from "@/app/contexts/auth/context";

export default function ArchivePage() {
  const { user } = useAuthContext() as any;

  const scope = useMemo(() => {
    return {
      company_id: user?.company_id as string,
      branch_id: user?.branch_id as string,
    };
  }, [user?.company_id, user?.branch_id]);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const fetchList = async () => {
    if (!scope.company_id || !scope.branch_id) return;

    setLoading(true);
    try {
      const res = await docsApi.listDocuments({
        ...scope,
        offset: 0,
        limit: 20,
        q: q || undefined,
        only_deleted: true, // ✅ archive
      });

      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.company_id, scope.branch_id]);

  return (
    <div className="px-(--margin-x) py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-dark-50">
            بایگانی
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            اسناد حذف‌شده + بازیابی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو..."
            className="form-input form-input-base w-full sm:w-72 bg-transparent border border-gray-200 dark:border-dark-500"
          />
          <Button variant="filled" onClick={fetchList} disabled={loading}>
            {loading ? "..." : "جستجو"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <Card skin="bordered" className="p-0">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-600">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-dark-100">
                لیست حذف‌شده‌ها
              </span>
              <Badge variant="soft" color="secondary" className="h-5 px-2">
                {total}
              </Badge>
            </div>

            <Button variant="soft" onClick={fetchList} disabled={loading}>
              ریفرش
            </Button>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-dark-600">
            {items.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-dark-300">
                موردی یافت نشد.
                <div className="mt-2 text-xs opacity-80">
                  اگر لیست همیشه خالیه، احتمالاً بک‌اند پارامتر{" "}
                  <code>only_deleted</code> رو ساپورت نکرده.
                </div>
              </div>
            ) : (
              items.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                      {doc.title}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                      {doc.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="soft"
                      onClick={() => {
                        const url = docsApi.downloadLatestUrl({
                          id: doc.id,
                          ...scope,
                        });
                        window.open(url, "_blank");
                      }}
                    >
                      دانلود
                    </Button>

                    <Button
                      variant="soft"
                      color="success"
                      onClick={async () => {
                        await docsApi.restoreDocument({ id: doc.id, ...scope });
                        fetchList();
                      }}
                    >
                      بازیابی
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
