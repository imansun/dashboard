import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Card, Button, Input, Textarea } from "@/components/ui";
import { ticketsApi } from "@/app/services/tickets/tickets.api";

export default function TicketCreatePage() {
  const nav = useNavigate();

  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const _category = categoryId.trim();
    const _subject = subject.trim();

    if (!_category) return toast.error("category_id الزامی است");
    if (!_subject) return toast.error("subject الزامی است");

    setSubmitting(true);
    try {
      const t = await ticketsApi.create({
        company_id: companyId.trim() || undefined,
        branch_id: branchId.trim() || undefined,
        category_id: _category,
        subject: _subject,
        description: description.trim() ? description.trim() : null,
      });

      toast.success("تیکت ایجاد شد");
      nav(`/support/tickets/${t.id}`);
    } catch (e: any) {
      toast.error(e?.message || "خطا در ایجاد تیکت");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title="Create Ticket">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outlined" className="h-9 gap-2" onClick={() => nav(-1)}>
            <ArrowLeftIcon className="size-4.5" />
            بازگشت
          </Button>
        </div>

        <Card className="mt-4 p-4 sm:px-5">
          <h2 className="text-lg font-medium text-gray-800 dark:text-dark-50">ایجاد تیکت</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input label="Company ID (optional)" placeholder="UUID" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
            <Input label="Branch ID (optional)" placeholder="UUID" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
            <Input label="Category ID" placeholder="UUID" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} classNames={{ root: "sm:col-span-2" }} />
            <Textarea label="Description" rows={5} value={description} onChange={(e: any) => setDescription(e.target.value)} classNames={{ root: "sm:col-span-2" }} />
          </div>

          <div className="mt-5 flex justify-end">
            <Button className="h-9 gap-2" onClick={submit} disabled={submitting}>
              <PlusIcon className="size-4.5" />
              ایجاد
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
