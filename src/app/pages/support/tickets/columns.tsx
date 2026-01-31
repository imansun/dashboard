// src/app/pages/support/tickets/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import {
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

import { Button, Badge } from "@/components/ui";
import type { Ticket, TicketStatus } from "@/app/services/tickets/tickets.types";

type LookupsMeta = {
  companies?: Map<string, { id: string; name: string }>;
  branches?: Map<string, { id: string; name: string }>;
  users?: Map<string, { id: string; email?: string; name?: string }>;
};

function userLabel(u?: { email?: string; name?: string }) {
  return u?.name || u?.email || "—";
}

function StatusBadge({ value }: { value: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; color: any }> = {
    OPEN: { label: "OPEN", color: "primary" },
    IN_PROGRESS: { label: "IN_PROGRESS", color: "warning" },
    RESOLVED: { label: "RESOLVED", color: "success" },
    CLOSED: { label: "CLOSED", color: "neutral" },
  };

  const meta = map[value] ?? { label: value, color: "neutral" };

  return (
    <Badge variant="soft" color={meta.color}>
      {meta.label}
    </Badge>
  );
}

export const columns: ColumnDef<Ticket>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          className="size-4 cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (!el) return;
            el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          className="size-4 cursor-pointer"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      </div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
    size: 48,
  },

  {
    header: "Subject",
    accessorKey: "subject",
    cell: ({ row }) => (
      <div className="min-w-0 truncate font-medium text-gray-800 dark:text-dark-100">
        {row.original.subject}
      </div>
    ),
    meta: { filterVariant: "text", placeholder: "موضوع..." },
  },

  {
    header: "Status",
    accessorKey: "status",
    cell: ({ getValue }) => <StatusBadge value={getValue() as TicketStatus} />,
    meta: {
      filterVariant: "select",
      selectOptions: [
        { label: "All", value: "" },
        { label: "OPEN", value: "OPEN" },
        { label: "IN_PROGRESS", value: "IN_PROGRESS" },
        { label: "RESOLVED", value: "RESOLVED" },
        { label: "CLOSED", value: "CLOSED" },
      ],
    },
  },

  {
    header: "Company",
    accessorKey: "company_id",
    cell: ({ getValue, table }) => {
      const id = String(getValue() ?? "");
      const lookups = (table.options.meta as any)?.lookups as
        | LookupsMeta
        | undefined;
      const name = id ? lookups?.companies?.get(id)?.name : null;

      return (
        <span className="text-xs text-gray-700 dark:text-dark-100">
          {name || id || "—"}
        </span>
      );
    },
    meta: { filterVariant: "text", placeholder: "Company..." },
  },

  {
    header: "Branch",
    accessorKey: "branch_id",
    cell: ({ getValue, table }) => {
      const id = String(getValue() ?? "");
      const lookups = (table.options.meta as any)?.lookups as
        | LookupsMeta
        | undefined;
      const name = id ? lookups?.branches?.get(id)?.name : null;

      return (
        <span className="text-xs text-gray-700 dark:text-dark-100">
          {name || id || "—"}
        </span>
      );
    },
    meta: { filterVariant: "text", placeholder: "Branch..." },
  },

  {
    header: "Requester",
    accessorKey: "requester_id",
    cell: ({ getValue, table }) => {
      const id = String(getValue() ?? "");
      const lookups = (table.options.meta as any)?.lookups as
        | LookupsMeta
        | undefined;
      const u = id ? lookups?.users?.get(id) : undefined;

      return (
        <span className="text-xs text-gray-700 dark:text-dark-100">
          {u ? userLabel(u) : id || "—"}
        </span>
      );
    },
    meta: { filterVariant: "text", placeholder: "Requester..." },
  },

  {
    header: "Responder",
    accessorKey: "responder_id",
    cell: ({ getValue, table }) => {
      const id = String(getValue() ?? "");
      const lookups = (table.options.meta as any)?.lookups as
        | LookupsMeta
        | undefined;
      const u = id ? lookups?.users?.get(id) : undefined;

      return (
        <span className="text-xs text-gray-700 dark:text-dark-100">
          {u ? userLabel(u) : id || "—"}
        </span>
      );
    },
    meta: { filterVariant: "text", placeholder: "Responder..." },
  },

  {
    header: "Actions",
    id: "actions",
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row, table }) => {
      const nav = (path: string) => table.options.meta?.navigate?.(path);

      const t = row.original;

      const openAction = (kind: "resolve" | "close" | "reopen") => {
        table.options.meta?.openAction?.(kind, t);
      };

      return (
        <div className="flex justify-center">
          <div className="flex items-center gap-1">
            <Button
              variant="flat"
              isIcon
              className="size-8 rounded-full"
              onClick={() => nav?.(`/support/tickets/${t.id}`)}
              data-tooltip
              data-tooltip-content="مشاهده"
            >
              <EyeIcon className="size-4.5" />
            </Button>

            <Button
              variant="flat"
              isIcon
              className="size-8 rounded-full"
              onClick={() => openAction("resolve")}
              data-tooltip
              data-tooltip-content="Resolve"
            >
              <CheckCircleIcon className="size-4.5" />
            </Button>

            <Button
              variant="flat"
              isIcon
              className="size-8 rounded-full"
              onClick={() => openAction("close")}
              data-tooltip
              data-tooltip-content="Close"
            >
              <XMarkIcon className="size-4.5" />
            </Button>

            <Button
              variant="flat"
              isIcon
              className="size-8 rounded-full"
              onClick={() => openAction("reopen")}
              data-tooltip
              data-tooltip-content="Reopen"
            >
              <ArrowUturnLeftIcon className="size-4.5" />
            </Button>
          </div>
        </div>
      );
    },
  },
];
