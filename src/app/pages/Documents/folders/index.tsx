// src/app/pages/documents/folders/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Card, Button, Badge } from "@/components/ui";
import { docsApi } from "@/app/services/docs";
import { useAuthContext } from "@/app/contexts/auth/context";

type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
};

export default function DocumentFoldersPage() {
  const { user } = useAuthContext() as any;

  const scope = useMemo(() => {
    return {
      company_id: user?.company_id as string,
      branch_id: user?.branch_id as string,
    };
  }, [user?.company_id, user?.branch_id]);

  const [loading, setLoading] = useState(false);

  // current listing (children of current parent)
  const [folders, setFolders] = useState<Folder[]>([]);

  // stack for breadcrumb: root -> ... -> current parent
  const [stack, setStack] = useState<Folder[]>([]);

  const currentParent = stack.length ? stack[stack.length - 1] : null;

  const [name, setName] = useState("");

  const fetchCurrent = async () => {
    if (!scope.company_id || !scope.branch_id) return;

    setLoading(true);
    try {
      const res = await docsApi.listFolders({
        ...scope,
        parent_id: currentParent?.id ?? undefined,
      });

      setFolders((res ?? []) as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reset when scope changes
    setStack([]);
    setName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.company_id, scope.branch_id]);

  useEffect(() => {
    fetchCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParent?.id, scope.company_id, scope.branch_id]);

  const enterFolder = (f: Folder) => {
    setStack((prev) => [...prev, f]);
  };

  const goRoot = () => setStack([]);

  const goToCrumb = (idx: number) => {
    // idx is index in stack
    setStack((prev) => prev.slice(0, idx + 1));
  };

  const goBack = () => {
    setStack((prev) => prev.slice(0, -1));
  };

  const createFolder = async () => {
    if (!scope.company_id || !scope.branch_id) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      await docsApi.createFolder({
        ...scope,
        name: trimmed,
        parent_id: currentParent?.id ?? null,
      });

      setName("");
      await fetchCurrent();
    } finally {
      setLoading(false);
    }
  };

  const deleteFolder = async (id: string) => {
    if (!scope.company_id || !scope.branch_id) return;

    setLoading(true);
    try {
      await docsApi.deleteFolder({ id, ...scope });
      await fetchCurrent();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-(--margin-x) py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-dark-50">
            پوشه‌ها
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            مرور پوشه‌ها به صورت درختی + ساخت/حذف پوشه
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/documents"
            className="text-xs-plus text-gray-600 hover:text-gray-900 dark:text-dark-200 dark:hover:text-dark-50"
          >
            ← برگشت به اسناد
          </Link>
          <Button variant="soft" onClick={fetchCurrent} disabled={loading}>
            ریفرش
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-dark-200">
        <button
          onClick={goRoot}
          className="hover:text-gray-900 dark:hover:text-dark-50 outline-hidden"
        >
          Root
        </button>

        {stack.map((c, idx) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="opacity-50">/</span>
            <button
              onClick={() => goToCrumb(idx)}
              className="hover:text-gray-900 dark:hover:text-dark-50 outline-hidden"
            >
              {c.name}
            </button>
          </div>
        ))}

        {currentParent && (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="soft" color="info" className="h-5 px-2">
              سطح جاری
            </Badge>
            <span className="truncate">{currentParent.name}</span>

            <Button
              variant="soft"
              onClick={goBack}
              disabled={loading || stack.length === 0}
            >
              ← یک مرحله بالا
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Create folder */}
        <Card skin="bordered" className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
              ساخت پوشه جدید
            </p>
            <Badge variant="soft" color="secondary" className="h-5 px-2">
              {currentParent ? "Child" : "Root"}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                currentParent
                  ? `نام پوشه داخل "${currentParent.name}"`
                  : "نام پوشه (Root)..."
              }
              className="form-input form-input-base w-full bg-transparent border border-gray-200 dark:border-dark-500"
              disabled={loading}
            />

            <Button
              variant="filled"
              className="w-full"
              onClick={createFolder}
              disabled={loading || !name.trim()}
            >
              ایجاد پوشه
            </Button>

            <div className="pt-1 text-xs text-gray-400 dark:text-dark-300">
              {currentParent
                ? "پوشه داخل مسیر جاری ساخته می‌شود."
                : "پوشه در روت ساخته می‌شود."}
            </div>
          </div>
        </Card>

        {/* List */}
        <Card skin="bordered" className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-600">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-dark-100">
                لیست پوشه‌ها
              </span>
              <Badge variant="soft" color="secondary" className="h-5 px-2">
                {folders.length}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="soft"
                onClick={goRoot}
                disabled={loading || stack.length === 0}
              >
                رفتن به Root
              </Button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-dark-600">
            {folders.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-dark-300">
                پوشه‌ای در این سطح وجود ندارد.
              </div>
            ) : (
              folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => enterFolder(f)}
                      className="truncate text-sm font-medium text-gray-800 hover:text-primary-600 dark:text-dark-100 dark:hover:text-primary-400 outline-hidden"
                      disabled={loading}
                      title="ورود به پوشه"
                    >
                      {f.name}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      {f.parent_id ? "Child" : "Root"}
                      {f.created_at ? ` • ${f.created_at}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="soft"
                      onClick={() => enterFolder(f)}
                      disabled={loading}
                    >
                      ورود
                    </Button>

                    <Button
                      variant="soft"
                      color="error"
                      onClick={() => deleteFolder(f.id)}
                      disabled={loading}
                    >
                      حذف
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
