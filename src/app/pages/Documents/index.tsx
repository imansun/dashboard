// src/app/pages/documents/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Card, Button, Badge } from "@/components/ui";
import { docsApi } from "@/app/services/docs";
import { useAuthContext } from "@/app/contexts/auth/context";

type Folder = { id: string; name: string };

export default function DocumentsPage() {
  const { user } = useAuthContext() as any;

  const scope = useMemo(() => {
    return {
      company_id: user?.company_id as string,
      branch_id: user?.branch_id as string,
    };
  }, [user?.company_id, user?.branch_id]);

  // -----------------------------
  // List docs
  // -----------------------------
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
      });

      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Upload
  // -----------------------------
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchFolders = async () => {
    if (!scope.company_id || !scope.branch_id) return;

    setFoldersLoading(true);
    try {
      const res = await docsApi.listFolders({ ...scope });
      const list = (res ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
      })) as Folder[];

      setFolders(list);

      // auto select first folder if empty
      if (!folderId && list.length > 0) {
        setFolderId(list[0].id);
      }
    } finally {
      setFoldersLoading(false);
    }
  };

  const resetUploadForm = () => {
    setTitle("");
    setDescription("");
    setFile(null);
  };

  const onUpload = async () => {
    if (!scope.company_id || !scope.branch_id) return;
    if (!folderId) return;
    if (!title.trim()) return;
    if (!description.trim()) return;
    if (!file) return;

    setUploading(true);
    try {
      await docsApi.uploadDocument({
        ...scope,
        folder_id: folderId,
        title: title.trim(),
        description: description.trim(),
        file,
      });

      resetUploadForm();
      await fetchList();
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchList();
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.company_id, scope.branch_id]);

  return (
    <div className="px-(--margin-x) py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-dark-50">
            اسناد
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            مدیریت اسناد (لیست + دانلود + جزئیات + آپلود)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در عنوان/توضیحات..."
            className="form-input form-input-base w-full sm:w-72 bg-transparent border border-gray-200 dark:border-dark-500"
          />
          <Button variant="filled" onClick={fetchList} disabled={loading}>
            {loading ? "..." : "جستجو"}
          </Button>
        </div>
      </div>

      {/* Upload + List */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upload Card */}
        <Card skin="bordered" className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
              آپلود سند جدید
            </p>
            <Badge variant="soft" color="info" className="h-5 px-2">
              Upload
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-dark-300">
                پوشه
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={foldersLoading || uploading}
                className="form-input form-input-base w-full bg-transparent border border-gray-200 dark:border-dark-500"
              >
                {folders.length === 0 ? (
                  <option value="">
                    {foldersLoading ? "درحال دریافت..." : "هیچ پوشه‌ای ندارید"}
                  </option>
                ) : (
                  folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                )}
              </select>

              <div className="mt-2 flex items-center justify-between">
                <Button
                  variant="soft"
                  onClick={fetchFolders}
                  disabled={foldersLoading || uploading}
                >
                  ریفرش پوشه‌ها
                </Button>

                <Button
                  variant="soft"
                  component={Link as any}
                  to="/documents/folders"
                  disabled={uploading}
                >
                  مدیریت پوشه‌ها
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-dark-300">
                عنوان
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان..."
                className="form-input form-input-base w-full bg-transparent border border-gray-200 dark:border-dark-500"
                disabled={uploading}
              />
              {!title.trim() && (
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-300">
                  عنوان الزامی است.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-dark-300">
                توضیحات
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات..."
                rows={3}
                className="form-input form-input-base w-full bg-transparent border border-gray-200 dark:border-dark-500"
                disabled={uploading}
              />
              {!description.trim() && (
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-300">
                  توضیحات الزامی است.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-dark-300">
                فایل
              </label>
              <input
                type="file"
                className="block w-full text-xs text-gray-700 dark:text-dark-100"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                }}
                disabled={uploading}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-dark-300">
                {file ? `انتخاب شد: ${file.name}` : "فایلی انتخاب نشده."}
              </p>
            </div>

            <Button
              variant="filled"
              className="w-full"
              onClick={onUpload}
              disabled={
                uploading ||
                foldersLoading ||
                !folderId ||
                !title.trim() ||
                !description.trim() ||
                !file
              }
            >
              {uploading ? "درحال آپلود..." : "آپلود"}
            </Button>

            {folders.length === 0 && !foldersLoading && (
              <div className="mt-2 text-xs text-gray-500 dark:text-dark-300">
                برای آپلود باید اول یک پوشه بسازید.
              </div>
            )}
          </div>
        </Card>

        {/* Documents List */}
        <Card skin="bordered" className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-600">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-dark-100">
                لیست اسناد
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
                      component={Link as any}
                      to={`/documents/${doc.id}`}
                    >
                      جزئیات
                    </Button>

                    <Button
                      variant="soft"
                      color="error"
                      onClick={async () => {
                        await docsApi.deleteDocument({ id: doc.id, ...scope });
                        fetchList();
                      }}
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
