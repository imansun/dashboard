// src/app/pages/documents/detail/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { Card, Button, Badge } from "@/components/ui";
import { docsApi } from "@/app/services/docs";
import { useAuthContext } from "@/app/contexts/auth/context";

type Doc = {
  id: string;
  title: string;
  description: string;
  folder_id?: string | null;
  created_at?: string;
};

type Version = {
  id: string;
  created_at?: string;
  file_name?: string;
  size?: number;
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const { user } = useAuthContext() as any;

  const scope = useMemo(() => {
    return {
      company_id: user?.company_id as string,
      branch_id: user?.branch_id as string,
    };
  }, [user?.company_id, user?.branch_id]);

  const api = docsApi as any;

  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  // upload new version
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    if (!id) return;
    if (!scope.company_id || !scope.branch_id) return;

    setLoading(true);
    try {
      // optional endpoints (if exist in your docsApi)
      const d = api.getDocument
        ? await api.getDocument({ id, ...scope })
        : null;

      const v = api.listVersions
        ? await api.listVersions({ id, ...scope })
        : [];

      if (d) setDoc(d as Doc);
      if (Array.isArray(v)) setVersions(v as Version[]);
      if (v?.items && Array.isArray(v.items)) setVersions(v.items as Version[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, scope.company_id, scope.branch_id]);

  const downloadLatest = () => {
    if (!id) return;
    const url = docsApi.downloadLatestUrl({ id, ...scope });
    window.open(url, "_blank");
  };

  const deleteDoc = async () => {
    if (!id) return;
    if (!scope.company_id || !scope.branch_id) return;

    setLoading(true);
    try {
      await docsApi.deleteDocument({ id, ...scope });
      // after delete, go back
      window.location.href = "/documents";
    } finally {
      setLoading(false);
    }
  };

  const uploadNewVersion = async () => {
    if (!id) return;
    if (!scope.company_id || !scope.branch_id) return;
    if (!file) return;

    setUploading(true);
    try {
      if (api.uploadVersion) {
        await api.uploadVersion({ id, file, ...scope });
      } else if (api.uploadDocumentVersion) {
        await api.uploadDocumentVersion({ id, file, ...scope });
      } else {
        // fallback: if backend uses the same uploadDocument for new versions, you can wire it here later
        throw new Error("uploadVersion endpoint not found in docsApi");
      }

      setFile(null);
      await fetchAll();
    } finally {
      setUploading(false);
    }
  };

  const title = doc?.title ?? `سند #${id ?? ""}`;

  return (
    <div className="px-(--margin-x) py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-dark-50">
            جزئیات سند
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="soft" component={Link as any} to="/documents">
            ← برگشت
          </Button>
          <Button variant="soft" onClick={fetchAll} disabled={loading}>
            ریفرش
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Info */}
        <Card skin="bordered" className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
              اطلاعات سند
            </p>
            <Badge variant="soft" color="secondary" className="h-5 px-2">
              {id}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-dark-300">عنوان</p>
              <p className="mt-1 text-sm text-gray-800 dark:text-dark-100">
                {doc?.title ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-dark-300">توضیحات</p>
              <p className="mt-1 text-sm text-gray-800 dark:text-dark-100">
                {doc?.description ?? "—"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="filled" onClick={downloadLatest} disabled={loading}>
                دانلود آخرین نسخه
              </Button>

              <Button
                variant="soft"
                color="error"
                onClick={deleteDoc}
                disabled={loading}
              >
                حذف سند
              </Button>
            </div>
          </div>
        </Card>

        {/* Versions + Upload */}
        <Card skin="bordered" className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-600">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-dark-100">
                نسخه‌ها
              </span>
              <Badge variant="soft" color="info" className="h-5 px-2">
                {versions.length}
              </Badge>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  آپلود نسخه جدید
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-300">
                  یک فایل انتخاب کن و آپلود کن تا به نسخه‌ها اضافه شود.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  className="block w-full text-xs text-gray-700 dark:text-dark-100"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={uploading || loading}
                />
                <Button
                  variant="filled"
                  onClick={uploadNewVersion}
                  disabled={uploading || loading || !file}
                >
                  {uploading ? "درحال آپلود..." : "آپلود"}
                </Button>
              </div>
            </div>

            <div className="mt-4 divide-y divide-gray-200 dark:divide-dark-600">
              {versions.length === 0 ? (
                <div className="py-6 text-sm text-gray-500 dark:text-dark-300">
                  نسخه‌ای ثبت نشده (یا API نسخه‌ها هنوز وصل نشده).
                </div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                        {v.file_name ?? `Version ${v.id}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {v.created_at ?? "—"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {api.downloadVersionUrl && (
                        <Button
                          variant="soft"
                          onClick={() => {
                            const url = api.downloadVersionUrl({
                              id,
                              version_id: v.id,
                              ...scope,
                            });
                            window.open(url, "_blank");
                          }}
                        >
                          دانلود
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
