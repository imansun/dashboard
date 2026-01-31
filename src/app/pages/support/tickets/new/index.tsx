import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusIcon,
  ArrowPathIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  BuildingOffice2Icon,
  RectangleGroupIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, GhostSpinner, Input } from "@/components/ui";
import { useThemeContext } from "@/app/contexts/theme/context";

import { Combobox } from "@/components/shared/form/StyledCombobox";
import { Delta, TextEditor, type DeltaStatic } from "@/components/shared/form/TextEditor/TextEditor";

import { ticketsApi } from "@/app/services/tickets/tickets.api";
import { companiesApi } from "@/app/services/companies/companies.api";
import { branchesApi } from "@/app/services/branches/branches.api";
import { categoriesApi } from "@/app/services/categories/categories.api";

// ----------------------------------------------------------------------

type Option = {
  id: string;
  name: string;
  company_id?: string;
};

function toOptions(input: any): Option[] {
  const items = input?.items ?? input?.data?.items ?? input?.data ?? input ?? ([] as any[]);
  if (!Array.isArray(items)) return [];

  return items
    .map((x: any) => {
      const id = x?.id != null ? String(x.id) : "";
      const name = x?.name ?? x?.title ?? x?.label ?? "";
      if (!id) return null;

      return {
        id,
        name: String(name || id),
        company_id: x?.company_id != null ? String(x.company_id) : undefined,
      } as Option;
    })
    .filter(Boolean) as Option[];
}

function isDeltaMeaningful(delta?: DeltaStatic | null) {
  if (!delta) return false;

  // اگر متن واقعی یا embed داشته باشد، غیرخالی محسوب می‌کنیم
  const ops = (delta as any)?.ops ?? [];
  for (const op of ops) {
    const ins = op?.insert;
    if (!ins) continue;
    if (typeof ins === "string" && ins.replace(/\s/g, "").length > 0) return true;
    // embed مثل image/video
    if (typeof ins === "object") return true;
  }
  return false;
}

// ----------------------------------------------------------------------

export default function TicketCreatePage() {
  const nav = useNavigate();
  const { cardSkin } = useThemeContext();

  // Combobox values
  const [selectedCompany, setSelectedCompany] = useState<Option | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Option | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);

  const [companies, setCompanies] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // subject + description(editor)
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState<DeltaStatic>(new Delta());
  const descriptionTextRef = useRef<string>(""); // خروجی متن ساده برای submit

  const [submitting, setSubmitting] = useState(false);

  // ----------------------------------------------------------------------
  // Load options

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingOptions(true);
      try {
        const [c, b, cat] = await Promise.allSettled([
          companiesApi.list?.({ offset: 0, limit: 200 } as any) ??
            companiesApi.list?.() ??
            Promise.resolve([]),
          branchesApi.list?.({ offset: 0, limit: 500 } as any) ??
            branchesApi.list?.() ??
            Promise.resolve([]),
          categoriesApi.list?.({ offset: 0, limit: 500 } as any) ??
            categoriesApi.list?.() ??
            Promise.resolve([]),
        ]);

        if (cancelled) return;

        if (c.status === "fulfilled") setCompanies(toOptions(c.value));
        if (b.status === "fulfilled") setBranches(toOptions(b.value));
        if (cat.status === "fulfilled") setCategories(toOptions(cat.value));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const branchesForSelectedCompany = useMemo(() => {
    const cid = selectedCompany?.id;
    if (!cid) return branches;

    const hasCompanyId = branches.some((x) => !!x.company_id);
    if (!hasCompanyId) return branches;

    return branches.filter((b) => b.company_id === cid);
  }, [branches, selectedCompany?.id]);

  useEffect(() => {
    const cid = selectedCompany?.id;
    if (!cid) return;

    const list = branchesForSelectedCompany;
    if (!selectedBranch) return;

    const stillExists = list.some((x) => x.id === selectedBranch.id);
    if (!stillExists) setSelectedBranch(null);
  }, [selectedCompany?.id, branchesForSelectedCompany, selectedBranch]);

  // ----------------------------------------------------------------------

  const resetForm = () => {
    setSelectedCompany(null);
    setSelectedBranch(null);
    setSelectedCategory(null);
    setSubject("");
    setDescription(new Delta());
    descriptionTextRef.current = "";
  };

  const submit = async () => {
    const _subject = subject.trim();
    const _categoryId = selectedCategory?.id;
    const _companyId = selectedCompany?.id;
    const _branchId = selectedBranch?.id;

    if (!_companyId) return toast.error("شرکت الزامی است");
    if (!_branchId) return toast.error("شعبه الزامی است");
    if (!_categoryId) return toast.error("دسته‌بندی الزامی است");
    if (!_subject) return toast.error("موضوع تیکت الزامی است");

    setSubmitting(true);
    try {
      const hasDesc = isDeltaMeaningful(description);
      const descText = (descriptionTextRef.current || "").trim();

      const t = await ticketsApi.create({
        company_id: _companyId,
        branch_id: _branchId,
        category_id: _categoryId,
        subject: _subject,
        // ✅ مثل قبل: اگر خالی بود null
        description: hasDesc && descText ? descText : null,
      });

      toast.success("تیکت ایجاد شد");
      nav(`/support/tickets/${t.id}`);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد تیکت");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------

  return (
    <Page title="ایجاد تیکت">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        {/* Header */}
        <header
          className={clsx(
            cardSkin === "bordered" ? "dark:bg-dark-900" : "dark:bg-dark-750",
            "transition-content border-gray-150 dark:border-dark-600 rounded-2xl border bg-white p-3 sm:p-4",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                isIcon
                className="size-10 rounded-full"
                onClick={() => nav(-1)}
                disabled={submitting}
              >
                <ArrowLeftIcon className="size-5 rtl:rotate-180" />
              </Button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Badge color="info" variant="soft" className="gap-2 rounded-full px-3">
                    <TicketIcon className="size-4" />
                    <span className="text-xs">تیکت جدید</span>
                  </Badge>

                  {(loadingOptions || submitting) && (
                    <Badge variant="soft" className="gap-2 rounded-full px-3">
                      <GhostSpinner className="size-3.5 border-2" />
                      <span className="text-xs">
                        {submitting ? "در حال ثبت..." : "در حال بارگذاری..."}
                      </span>
                    </Badge>
                  )}
                </div>

                <div className="mt-1 text-xs text-gray-500 dark:text-dark-200">
                  شرکت، شعبه، موضوع و دسته‌بندی الزامی هستند.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="flat"
                className="h-10 space-x-2 rtl:space-x-reverse"
                onClick={resetForm}
                disabled={submitting}
              >
                <ArrowPathIcon className="size-5" />
                <span>پاک کردن فرم</span>
              </Button>

              <Button
                color="primary"
                className="h-10 space-x-2 rtl:space-x-reverse"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? <GhostSpinner className="size-4 border-2" /> : <PlusIcon className="size-5" />}
                <span>ایجاد تیکت</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="my-5 h-px bg-gray-200 dark:bg-dark-500" />

        {/* Form */}
        <Card className="rounded-2xl p-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
              مشخصات تیکت
            </h2>

            <Badge variant="soft" className="gap-2 rounded-full px-3">
              <ChatBubbleLeftRightIcon className="size-4" />
              <span className="text-xs">فرم ایجاد</span>
            </Badge>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200">
            فیلدهای شرکت و شعبه الزامی هستند. موضوع و دسته‌بندی الزامی است.
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {/* Company (required) */}
            <div className="sm:col-span-1">
              <Combobox
                data={companies}
                displayField="name"
                value={selectedCompany}
                onChange={setSelectedCompany as any}
                placeholder="انتخاب شرکت (الزامی)"
                label="شرکت (الزامی)"
                searchFields={["name", "id"]}
              />
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-dark-200">
                <BuildingOffice2Icon className="size-4" />
                <span>انتخاب از لیست (بدون وارد کردن شناسه)</span>
              </div>
            </div>

            {/* Branch (required) */}
            <div className="sm:col-span-1">
              <Combobox
                data={branchesForSelectedCompany}
                displayField="name"
                value={selectedBranch}
                onChange={setSelectedBranch as any}
                placeholder="انتخاب شعبه (الزامی)"
                label="شعبه (الزامی)"
                searchFields={["name", "id"]}
              />
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-dark-200">
                <RectangleGroupIcon className="size-4" />
                <span>در صورت انتخاب شرکت، شعبه‌های همان شرکت نمایش داده می‌شود</span>
              </div>
            </div>

            {/* Category (required) */}
            <div className="sm:col-span-2">
              <Combobox
                data={categories}
                displayField="name"
                value={selectedCategory}
                onChange={setSelectedCategory as any}
                placeholder="انتخاب دسته‌بندی"
                label="دسته‌بندی (الزامی)"
                searchFields={["name", "id"]}
              />
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-dark-200">
                <TagIcon className="size-4" />
                <span>این فیلد الزامی است</span>
              </div>
            </div>

            {/* Subject */}
            <Input
              label="موضوع (الزامی)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              classNames={{ root: "sm:col-span-2" }}
              placeholder="مثلاً: قطعی شبکه"
            />

            {/* Description (Quill) */}
            <div className="sm:col-span-2">
              <TextEditor
                label="توضیحات"
                value={description}
                onChange={(val, quill) => {
                  setDescription(val);
                  // ✅ خروجی متن ساده برای API
                  descriptionTextRef.current = (quill?.getText?.() || "").replace(/\n+$/, "");
                }}
                placeholder="جزئیات مشکل/درخواست را بنویسید..."
                classNames={{
                  root: "sm:col-span-2",
                  container:
                    "rounded-xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-900",
                }}
              />
              <div className="mt-1 text-[11px] text-gray-500 dark:text-dark-200">
                می‌توانید متن را فرمت‌دار بنویسید (Bold/Heading/…)، ولی به‌صورت متن برای ثبت تیکت ارسال می‌شود.
              </div>
            </div>
          </div>

          <div className="my-5 h-px bg-gray-200 dark:bg-dark-500" />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outlined" className="h-10" onClick={() => nav(-1)} disabled={submitting}>
              انصراف
            </Button>

            <Button color="primary" className="h-10 space-x-2 rtl:space-x-reverse" onClick={submit} disabled={submitting}>
              {submitting ? <GhostSpinner className="size-4 border-2" /> : <PlusIcon className="size-5" />}
              <span>ایجاد تیکت</span>
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
