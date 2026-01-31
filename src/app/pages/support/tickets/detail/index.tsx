// src/app/pages/support/tickets/detail/index.tsx
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  LinkIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  BuildingOffice2Icon,
  RectangleGroupIcon,
  TagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

import { Page } from "@/components/shared/Page";
import {
  Card,
  Button,
  Input,
  Textarea,
  Badge,
  ScrollShadow,
  Spinner,
  GhostSpinner,
} from "@/components/ui";
import { ConfirmModal, type ModalState } from "@/components/shared/ConfirmModal";
import { useThemeContext } from "@/app/contexts/theme/context";

import { ticketsApi } from "@/app/services/tickets/tickets.api";
import type { Ticket, TicketMessage, TicketStatus } from "@/app/services/tickets/tickets.types";

import { usersApi } from "@/app/services/users/users.api";
import { companiesApi } from "@/app/services/companies/companies.api";
import { branchesApi } from "@/app/services/branches/branches.api";
import { categoriesApi } from "@/app/services/categories/categories.api";

// ----------------------------------------------------------------------
// UI Helpers

function StatusBadge({ value, t }: { value: TicketStatus; t: (k: string) => string }) {
  const map: Record<TicketStatus, { label: string; color: any }> = {
    OPEN: { label: t("support.tickets.detail.status.OPEN"), color: "primary" },
    IN_PROGRESS: { label: t("support.tickets.detail.status.IN_PROGRESS"), color: "warning" },
    RESOLVED: { label: t("support.tickets.detail.status.RESOLVED"), color: "success" },
    CLOSED: { label: t("support.tickets.detail.status.CLOSED"), color: "neutral" },
  };

  const meta = map[value] ?? { label: String(value), color: "neutral" };

  return (
    <Badge
      variant="soft"
      color={meta.color}
      className="gap-2 rounded-full border border-this-darker/15 px-3 py-1 dark:border-this-lighter/15"
    >
      <span className="size-2.5 rounded-full border-2 border-this dark:border-this-light" />
      <span className="text-xs">{meta.label}</span>
    </Badge>
  );
}

type ActionKind = "resolve" | "close" | "reopen";

// ----------------------------------------------------------------------
// Page

export default function TicketDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const { cardSkin } = useThemeContext();

  const ticketId = id || "";

  const companiesMapRef = useRef(new Map<string, { id: string; name: string }>());
  const branchesMapRef = useRef(new Map<string, { id: string; name: string }>());
  const categoriesMapRef = useRef(new Map<string, { id: string; name: string }>());
  const usersMapRef = useRef(new Map<string, { id: string; email?: string; name?: string }>());

  const [, bumpLookups] = useState(0);
  const bump = () => bumpLookups((x) => x + 1);

  function userLabel(u?: { name?: string; email?: string }) {
    return u?.name || u?.email || "—";
  }

  const prefetchLookups = useCallback(async (tix: Ticket | null) => {
    if (!tix) return;

    const tasks: Promise<any>[] = [];

    const companyId = tix.company_id ? String(tix.company_id) : "";
    const branchId = tix.branch_id ? String(tix.branch_id) : "";
    const categoryId = tix.category_id ? String(tix.category_id) : "";
    const requesterId = tix.requester_id ? String(tix.requester_id) : "";
    const responderId = tix.responder_id ? String(tix.responder_id) : "";

    if (companyId && !companiesMapRef.current.has(companyId)) {
      tasks.push(
        companiesApi
          .getById(companyId)
          .then((res: any) => {
            const data = res?.data ?? res;
            if (data?.id)
              companiesMapRef.current.set(companyId, {
                id: data.id,
                name: data.name ?? data.title ?? "—",
              });
          })
          .catch(() => void 0),
      );
    }

    if (branchId && !branchesMapRef.current.has(branchId)) {
      tasks.push(
        branchesApi
          .getById(branchId)
          .then((res: any) => {
            const data = res?.data ?? res;
            if (data?.id)
              branchesMapRef.current.set(branchId, {
                id: data.id,
                name: data.name ?? data.title ?? "—",
              });
          })
          .catch(() => void 0),
      );
    }

    if (categoryId && !categoriesMapRef.current.has(categoryId)) {
      tasks.push(
        categoriesApi
          .getById(categoryId)
          .then((res: any) => {
            const data = res?.data ?? res;
            if (data?.id)
              categoriesMapRef.current.set(categoryId, {
                id: data.id,
                name: data.name ?? data.title ?? "—",
              });
          })
          .catch(() => void 0),
      );
    }

    for (const uid of [requesterId, responderId]) {
      if (!uid) continue;
      if (usersMapRef.current.has(uid)) continue;

      tasks.push(
        usersApi
          .getById(uid)
          .then((res: any) => {
            const data = res?.data ?? res;
            if (data?.id)
              usersMapRef.current.set(uid, {
                id: data.id,
                email: data.email,
                name: data.name,
              });
          })
          .catch(() => void 0),
      );
    }

    if (tasks.length) {
      await Promise.allSettled(tasks);
      bump();
    }
  }, []);

  const lookups = useMemo(
    () => ({
      companies: companiesMapRef.current,
      branches: branchesMapRef.current,
      categories: categoriesMapRef.current,
      users: usersMapRef.current,
    }),
    [],
  );

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const [docCompanyId, setDocCompanyId] = useState("");
  const [docBranchId, setDocBranchId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [linking, setLinking] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState<ActionKind>("resolve");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionState, setActionState] = useState<ModalState>("pending");

  const actionMessages = useMemo(() => {
    const base = "support.tickets.detail.confirm";
    return {
      pending: { description: t(`${base}.${actionKind}.pending`) },
      success: { title: t(`${base}.${actionKind}.success`) },
    };
  }, [actionKind, t]);

  const refetch = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    try {
      const [tix, m] = await Promise.all([
        ticketsApi.getById(ticketId),
        ticketsApi.listMessages(ticketId, { offset: 0, limit: 100 }),
      ]);

      setTicket(tix);
      setMessages(m.items || []);
      prefetchLookups(tix).catch(() => void 0);

      if (tix?.company_id && !docCompanyId) setDocCompanyId(String(tix.company_id));
      if (tix?.branch_id && !docBranchId) setDocBranchId(String(tix.branch_id));
    } catch (e: any) {
      toast.error(e?.message || t("support.tickets.detail.actions.detail_error"));
    } finally {
      setLoading(false);
    }
  }, [ticketId, docCompanyId, docBranchId, prefetchLookups, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const openAction = (k: ActionKind) => {
    setActionKind(k);
    setActionState("pending");
    setActionOpen(true);
  };

  const confirmAction = async () => {
    if (!ticketId) return;

    setActionLoading(true);
    setActionState("pending");
    try {
      if (actionKind === "resolve") await ticketsApi.resolve(ticketId);
      if (actionKind === "close") await ticketsApi.close(ticketId);
      if (actionKind === "reopen") await ticketsApi.reopen(ticketId);

      setActionState("success");
      toast.success(t("support.tickets.detail.actions.done"));
      await refetch();
    } catch (e: any) {
      setActionState("error");
      toast.error(e?.message || t("support.tickets.detail.actions.error"));
    } finally {
      setActionLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = body.trim();
    if (!text) return;

    setSending(true);
    try {
      await ticketsApi.createMessage(ticketId, { body: text });
      setBody("");
      await refetch();
      toast.success(t("support.tickets.detail.messages.sent"));
    } catch (e: any) {
      toast.error(e?.message || t("support.tickets.detail.actions.error"));
    } finally {
      setSending(false);
    }
  };

  const linkDoc = async () => {
    const docId = documentId.trim();
    if (!docId) return toast.error(t("support.tickets.detail.link_doc.required_document_id"));

    setLinking(true);
    try {
      await ticketsApi.linkDoc(ticketId, {
        company_id: docCompanyId.trim() || undefined,
        branch_id: docBranchId.trim() || undefined,
        document_id: docId,
        version_id: versionId.trim() || undefined,
      });

      toast.success(t("support.tickets.detail.link_doc.success"));
      setDocumentId("");
      setVersionId("");
    } catch (e: any) {
      toast.error(e?.message || t("support.tickets.detail.link_doc.error"));
    } finally {
      setLinking(false);
    }
  };

  return (
    <Page title={t("support.tickets.detail.title")}>
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6">
        <TicketHeader
          t={t}
          loading={loading}
          actionLoading={actionLoading}
          actionKind={actionKind}
          onBack={() => nav(-1)}
          onRefresh={refetch}
          onResolve={() => openAction("resolve")}
          onClose={() => openAction("close")}
          onReopen={() => openAction("reopen")}
          disabled={!ticketId}
        />

        <div className="my-5 h-px bg-gray-200 dark:bg-dark-500" />

        <TicketSummary
          t={t}
          cardSkin={cardSkin}
          ticket={ticket}
          loading={loading}
          lookups={lookups}
          userLabel={userLabel}
        />

        <div className="my-5 h-px bg-gray-200 dark:bg-dark-500" />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TicketMessages
              t={t}
              cardSkin={cardSkin}
              messages={messages}
              value={body}
              onChange={setBody}
              onSend={sendMessage}
              sending={sending}
            />
          </div>

          <div className="lg:col-span-1">
            <TicketLinkDoc
              t={t}
              cardSkin={cardSkin}
              docCompanyId={docCompanyId}
              setDocCompanyId={setDocCompanyId}
              docBranchId={docBranchId}
              setDocBranchId={setDocBranchId}
              documentId={documentId}
              setDocumentId={setDocumentId}
              versionId={versionId}
              setVersionId={setVersionId}
              linking={linking}
              onLink={linkDoc}
            />
          </div>
        </div>
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

// ----------------------------------------------------------------------
// Components (in-file)

function TicketHeader(props: {
  t: (k: string) => string;
  loading: boolean;
  disabled: boolean;
  actionLoading: boolean;
  actionKind: ActionKind;
  onBack: () => void;
  onRefresh: () => void;
  onResolve: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const { cardSkin } = useThemeContext();

  const busy = props.loading || props.actionLoading;

  const actionButton = (kind: ActionKind) => {
    const isActive = props.actionLoading && props.actionKind === kind;

    if (kind === "resolve") {
      return (
        <Button
          color="success"
          variant="soft"
          className="h-10 space-x-2 rtl:space-x-reverse"
          onClick={props.onResolve}
          disabled={props.disabled || busy}
        >
          {isActive ? <GhostSpinner className="size-4 border-2" /> : <CheckCircleIcon className="size-5" />}
          <span>{props.t("support.tickets.detail.resolve")}</span>
        </Button>
      );
    }

    if (kind === "close") {
      return (
        <Button
          color="error"
          variant="soft"
          className="h-10 space-x-2 rtl:space-x-reverse"
          onClick={props.onClose}
          disabled={props.disabled || busy}
        >
          {isActive ? <GhostSpinner className="size-4 border-2" /> : <XMarkIcon className="size-5" />}
          <span>{props.t("support.tickets.detail.close")}</span>
        </Button>
      );
    }

    return (
      <Button
        color="warning"
        variant="soft"
        className="h-10 space-x-2 rtl:space-x-reverse"
        onClick={props.onReopen}
        disabled={props.disabled || busy}
      >
        {isActive ? <GhostSpinner className="size-4 border-2" /> : <ArrowUturnLeftIcon className="size-5" />}
        <span>{props.t("support.tickets.detail.reopen")}</span>
      </Button>
    );
  };

  return (
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
            onClick={props.onBack}
            disabled={busy}
          >
            <ArrowLeftIcon className="size-5 rtl:rotate-180" />
          </Button>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <Badge color="info" variant="soft" className="gap-2 rounded-full px-3">
                <TicketIcon className="size-4" />
                <span className="text-xs">{props.t("support.tickets.detail.title")}</span>
              </Badge>

              {busy && (
                <Badge variant="soft" className="gap-2 rounded-full px-3">
                  <Spinner className="size-3.5 border-2" />
                  <span className="text-xs">{props.t("support.tickets.detail.loading")}</span>
                </Badge>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-dark-200">
              {props.disabled ? "—" : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="flat"
            className="h-10 space-x-2 rtl:space-x-reverse"
            onClick={props.onRefresh}
            disabled={props.loading}
          >
            {props.loading ? (
              <GhostSpinner className="size-4 border-2" />
            ) : (
              <ArrowPathIcon className="size-5" />
            )}
            <span>{props.t("support.tickets.detail.refresh")}</span>
          </Button>

          <div className="mx-1 hidden h-8 w-px bg-gray-200 dark:bg-dark-500 sm:block" />

          <div className="flex flex-wrap gap-2">
            {actionButton("resolve")}
            {actionButton("close")}
            {actionButton("reopen")}
          </div>
        </div>
      </div>
    </header>
  );
}

function TicketSummary(props: {
  t: (k: string) => string;
  ticket: Ticket | null;
  loading: boolean;
  cardSkin: any;
  lookups: {
    companies: Map<string, { id: string; name: string }>;
    branches: Map<string, { id: string; name: string }>;
    categories: Map<string, { id: string; name: string }>;
    users: Map<string, { id: string; email?: string; name?: string }>;
  };
  userLabel: (u?: { name?: string; email?: string }) => string;
}) {
  const { ticket, loading, cardSkin, lookups, userLabel, t } = props;

  const companyName = ticket?.company_id ? lookups.companies.get(String(ticket.company_id))?.name : undefined;
  const branchName = ticket?.branch_id ? lookups.branches.get(String(ticket.branch_id))?.name : undefined;
  const categoryName = ticket?.category_id ? lookups.categories.get(String(ticket.category_id))?.name : undefined;

  const requester = ticket?.requester_id ? lookups.users.get(String(ticket.requester_id)) : undefined;
  const responder = ticket?.responder_id ? lookups.users.get(String(ticket.responder_id)) : undefined;

  return (
    <Card
      className={clsx(
        "rounded-2xl",
        cardSkin === "shadow" ? "" : "",
        "p-4 sm:px-5",
      )}
    >
      {ticket ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-800 dark:text-dark-50">
                {ticket.subject}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge value={ticket.status} t={t} />
                <Badge variant="soft" className="gap-2 rounded-full px-3">
                  <ChatBubbleLeftRightIcon className="size-4" />
                  <span className="text-xs">{(ticket as any)?.messages_count ?? "—"}</span>
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge color="primary" variant="soft" className="gap-2 rounded-full px-3">
                <UserIcon className="size-4" />
                <span className="text-xs">
                  {t("support.tickets.detail.fields.requester")}: {userLabel(requester)}
                </span>
              </Badge>
              <Badge variant="soft" className="gap-2 rounded-full px-3">
                <UserIcon className="size-4" />
                <span className="text-xs">
                  {t("support.tickets.detail.fields.responder")}: {userLabel(responder)}
                </span>
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100">
            {ticket.description || "—"}
          </div>

          <div className="h-px bg-gray-200 dark:bg-dark-500" />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <InfoLine
              label={t("support.tickets.detail.fields.company")}
              icon={<BuildingOffice2Icon className="size-4" />}
              value={companyName || "—"}
            />
            <InfoLine
              label={t("support.tickets.detail.fields.branch")}
              icon={<RectangleGroupIcon className="size-4" />}
              value={branchName || "—"}
            />
            <InfoLine
              label={t("support.tickets.detail.fields.category")}
              icon={<TagIcon className="size-4" />}
              value={categoryName || "—"}
            />
          </div>
        </div>
      ) : (
        <div className="py-6 text-sm text-gray-500 dark:text-dark-200">
          {loading ? t("support.tickets.detail.loading") : t("support.tickets.detail.not_found")}
        </div>
      )}
    </Card>
  );
}

function InfoLine(props: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 dark:border-dark-500 dark:bg-dark-900 dark:text-dark-200">
      <span className="text-gray-500 dark:text-dark-200">{props.icon}</span>
      <span className="font-medium text-gray-700 dark:text-dark-100">{props.label}:</span>
      <span className="truncate">{String(props.value ?? "—")}</span>
    </div>
  );
}

function TicketMessages(props: {
  t: (k: string) => string;
  messages: TicketMessage[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  cardSkin: any;
}) {
  const { messages, value, onChange, onSend, sending, t } = props;

  return (
    <Card className="rounded-2xl p-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge color="info" variant="soft" className="gap-2 rounded-full px-3">
            <ChatBubbleLeftRightIcon className="size-4" />
            <span className="text-xs">{t("support.tickets.detail.messages.title")}</span>
          </Badge>
          <Badge variant="soft" className="rounded-full px-3">
            <span className="text-xs">{messages.length}</span>
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <ScrollShadow
          className="h-64 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-500 dark:bg-dark-800"
          size={18}
        >
          <div className="flex flex-col gap-3">
            {messages.length ? (
              messages.map((m) => <MessageItem key={m.id} message={m} />)
            ) : (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-dark-200">
                {t("support.tickets.detail.messages.empty")}
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>

      <div className="my-4 h-px bg-gray-200 dark:bg-dark-500" />

      <div className="flex flex-col gap-2">
        <Textarea
          label={t("support.tickets.detail.messages.new_message")}
          placeholder={t("support.tickets.detail.messages.placeholder")}
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          rows={4}
        />

        <div className="flex justify-end">
          <Button
            color="primary"
            className="h-10 space-x-2 rtl:space-x-reverse"
            onClick={onSend}
            disabled={sending || !value.trim()}
          >
            {sending ? (
              <GhostSpinner className="size-4 border-2" />
            ) : (
              <PaperAirplaneIcon className="size-5 rtl:rotate-180" />
            )}
            <span>{t("support.tickets.detail.messages.send")}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MessageItem({ message }: { message: TicketMessage }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-dark-500 dark:bg-dark-900">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="soft" className="rounded-full px-3">
          <span className="text-xs">{message.sender_id ?? "—"}</span>
        </Badge>
        <span className="text-xs text-gray-500 dark:text-dark-200">{message.created_at}</span>
      </div>

      <div className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-dark-100">
        {message.body}
      </div>
    </div>
  );
}

function TicketLinkDoc(props: {
  t: (k: string) => string;
  docCompanyId: string;
  setDocCompanyId: (v: string) => void;
  docBranchId: string;
  setDocBranchId: (v: string) => void;
  documentId: string;
  setDocumentId: (v: string) => void;
  versionId: string;
  setVersionId: (v: string) => void;
  linking: boolean;
  onLink: () => void;
  cardSkin: any;
}) {
  const { t } = props;

  return (
    <Card className="rounded-2xl p-4 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <Badge color="secondary" variant="soft" className="gap-2 rounded-full px-3">
          <LinkIcon className="size-4" />
          <span className="text-xs">{t("support.tickets.detail.link_doc.title")}</span>
        </Badge>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-dark-200">
        {t("support.tickets.detail.link_doc.document_id")}{" "}
        {t("support.tickets.detail.link_doc.required_document_id").includes("الزامی") ? "" : "*"}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          label={t("support.tickets.detail.link_doc.company_id_optional")}
          value={props.docCompanyId}
          onChange={(e) => props.setDocCompanyId(e.target.value)}
        />
        <Input
          label={t("support.tickets.detail.link_doc.branch_id_optional")}
          value={props.docBranchId}
          onChange={(e) => props.setDocBranchId(e.target.value)}
        />
        <Input
          label={t("support.tickets.detail.link_doc.document_id")}
          value={props.documentId}
          onChange={(e) => props.setDocumentId(e.target.value)}
        />
        <Input
          label={t("support.tickets.detail.link_doc.version_id_optional")}
          value={props.versionId}
          onChange={(e) => props.setVersionId(e.target.value)}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          color="info"
          variant="soft"
          className="h-10 space-x-2 rtl:space-x-reverse"
          onClick={props.onLink}
          disabled={props.linking || !props.documentId.trim()}
        >
          {props.linking ? <GhostSpinner className="size-4 border-2" /> : <LinkIcon className="size-5" />}
          <span>{t("support.tickets.detail.link_doc.button")}</span>
        </Button>
      </div>
    </Card>
  );
}
