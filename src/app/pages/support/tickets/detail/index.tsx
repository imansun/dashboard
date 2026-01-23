import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Card, Button, Input, Textarea, Badge } from "@/components/ui";
import { ConfirmModal, type ModalState } from "@/components/shared/ConfirmModal";

import { ticketsApi } from "@/app/services/tickets/tickets.api";
import type { Ticket, TicketMessage, TicketStatus } from "@/app/services/tickets/tickets.types";

function StatusBadge({ value }: { value: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; color: any }> = {
    OPEN: { label: "OPEN", color: "primary" },
    IN_PROGRESS: { label: "IN_PROGRESS", color: "warning" },
    RESOLVED: { label: "RESOLVED", color: "success" },
    CLOSED: { label: "CLOSED", color: "neutral" },
  };
  const meta = map[value] ?? { label: value, color: "neutral" };
  return <Badge variant="soft" color={meta.color}>{meta.label}</Badge>;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const ticketId = id || "";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // message composer
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // link doc
  const [docCompanyId, setDocCompanyId] = useState("");
  const [docBranchId, setDocBranchId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [linking, setLinking] = useState(false);

  // status action confirm
  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState<"resolve" | "close" | "reopen">("resolve");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionState, setActionState] = useState<ModalState>("pending");

  const actionMessages = useMemo(() => {
    const map = {
      resolve: { pending: { description: "تیکت Resolve شود؟" }, success: { title: "Resolve شد" } },
      close: { pending: { description: "تیکت Close شود؟" }, success: { title: "Close شد" } },
      reopen: { pending: { description: "تیکت Reopen شود؟" }, success: { title: "Reopen شد" } },
    } as const;
    return map[actionKind];
  }, [actionKind]);

  const refetch = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        ticketsApi.getById(ticketId),
        ticketsApi.listMessages(ticketId, { offset: 0, limit: 100 }),
      ]);

      setTicket(t);
      setMessages(m.items || []);

      // کمک UX: اگر company/branch رو توی link doc دستی می‌خوای
      if (t?.company_id && !docCompanyId) setDocCompanyId(t.company_id);
      if (t?.branch_id && !docBranchId) setDocBranchId(t.branch_id);
    } catch (e: any) {
      toast.error(e?.message || "خطا در دریافت جزئیات تیکت");
    } finally {
      setLoading(false);
    }
  }, [ticketId, docCompanyId, docBranchId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const sendMessage = async () => {
    const text = body.trim();
    if (!text) return;

    setSending(true);
    try {
      await ticketsApi.addMessage(ticketId, { body: text });
      setBody("");
      await refetch();
      toast.success("پیام ارسال شد");
    } catch (e: any) {
      toast.error(e?.message || "خطا در ارسال پیام");
    } finally {
      setSending(false);
    }
  };

  const linkDoc = async () => {
    const docId = documentId.trim();
    if (!docId) return toast.error("document_id الزامی است");

    setLinking(true);
    try {
      await ticketsApi.linkDoc(ticketId, {
        company_id: docCompanyId.trim() || undefined,
        branch_id: docBranchId.trim() || undefined,
        document_id: docId,
        version_id: versionId.trim() || undefined,
      });

      toast.success("Document لینک شد");
      setDocumentId("");
      setVersionId("");
    } catch (e: any) {
      toast.error(e?.message || "خطا در لینک کردن document");
    } finally {
      setLinking(false);
    }
  };

  const openAction = (k: "resolve" | "close" | "reopen") => {
    setActionKind(k);
    setActionState("pending");
    setActionOpen(true);
  };

  const confirmAction = async () => {
    if (!ticketId) return;
    setActionLoading(true);
    try {
      if (actionKind === "resolve") await ticketsApi.resolve(ticketId);
      if (actionKind === "close") await ticketsApi.close(ticketId);
      if (actionKind === "reopen") await ticketsApi.reopen(ticketId);

      setActionState("success");
      await refetch();
    } catch (e: any) {
      setActionState("error");
      toast.error(e?.message || "خطا در انجام عملیات");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Page title="Ticket">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outlined" className="h-9 gap-2" onClick={() => nav(-1)}>
            <ArrowLeftIcon className="size-4.5" />
            بازگشت
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outlined" className="h-9 gap-2" onClick={refetch} disabled={loading}>
              <ArrowPathIcon className="size-4.5" />
              بروزرسانی
            </Button>

            <Button className="h-9" onClick={() => openAction("resolve")} disabled={!ticketId}>
              Resolve
            </Button>
            <Button className="h-9" onClick={() => openAction("close")} disabled={!ticketId}>
              Close
            </Button>
            <Button className="h-9" onClick={() => openAction("reopen")} disabled={!ticketId}>
              Reopen
            </Button>
          </div>
        </div>

        {/* Ticket summary */}
        <Card className="mt-4 p-4 sm:px-5">
          {ticket ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium text-gray-800 dark:text-dark-50">
                  {ticket.subject}
                </h2>
                <StatusBadge value={ticket.status} />
              </div>

              <div className="text-sm text-gray-600 dark:text-dark-200 whitespace-pre-line">
                {ticket.description || "—"}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="text-xs text-gray-500 dark:text-dark-200">ID: {ticket.id}</div>
                <div className="text-xs text-gray-500 dark:text-dark-200">Company: {ticket.company_id}</div>
                <div className="text-xs text-gray-500 dark:text-dark-200">Branch: {ticket.branch_id}</div>
                <div className="text-xs text-gray-500 dark:text-dark-200">Category: {ticket.category_id}</div>
                <div className="text-xs text-gray-500 dark:text-dark-200">Requester: {ticket.requester_id ?? "—"}</div>
                <div className="text-xs text-gray-500 dark:text-dark-200">Responder: {ticket.responder_id ?? "—"}</div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-gray-500 dark:text-dark-200">
              {loading ? "در حال دریافت..." : "تیکت پیدا نشد"}
            </div>
          )}
        </Card>

        {/* Messages */}
        <Card className="mt-4 p-4 sm:px-5">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800 dark:text-dark-100">Messages</h3>
            <span className="text-xs text-gray-500 dark:text-dark-200">
              {messages.length} پیام
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {messages.length ? (
              messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-gray-200 p-3 dark:border-dark-500">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500 dark:text-dark-200">
                      {m.sender_id ?? "—"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-dark-200">
                      {m.created_at}
                    </div>
                  </div>
                  <div className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-dark-100">
                    {m.body}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 dark:text-dark-200">
                پیامی وجود ندارد.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Textarea
              label="پیام جدید"
              placeholder="متن پیام..."
              value={body}
              onChange={(e: any) => setBody(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end">
              <Button className="h-9 gap-2" onClick={sendMessage} disabled={sending || !body.trim()}>
                <PaperAirplaneIcon className="size-4.5" />
                ارسال
              </Button>
            </div>
          </div>
        </Card>

        {/* Link doc */}
        <Card className="mt-4 p-4 sm:px-5">
          <h3 className="font-medium text-gray-800 dark:text-dark-100">Link Document</h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Company ID (optional)" value={docCompanyId} onChange={(e) => setDocCompanyId(e.target.value)} />
            <Input label="Branch ID (optional)" value={docBranchId} onChange={(e) => setDocBranchId(e.target.value)} />
            <Input label="Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} />
            <Input label="Version ID (optional)" value={versionId} onChange={(e) => setVersionId(e.target.value)} />
          </div>

          <div className="mt-3 flex justify-end">
            <Button className="h-9 gap-2" onClick={linkDoc} disabled={linking || !documentId.trim()}>
              <LinkIcon className="size-4.5" />
              لینک کردن
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmModal
        show={actionOpen}
        onClose={() => !actionLoading && setActionOpen(false)}
        messages={actionMessages as any}
        onOk={confirmAction}
        confirmLoading={actionLoading}
        state={actionState}
      />
    </Page>
  );
}
