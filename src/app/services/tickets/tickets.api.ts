// src/app/services/tickets/tickets.api.ts
import { authedHttp } from "@/app/services/authedHttp";
import type {
  CreateTicketMessagePayload,
  CreateTicketPayload,
  LinkTicketDocPayload,
  Ticket,
  TicketMessagesListQuery,
  TicketMessagesListResponse,
  TicketsListQuery,
  TicketsListResponse,
  UUID,
} from "./tickets.types";

function toQueryParams(query?: Record<string, any>) {
  if (!query) return undefined;

  const params: Record<string, string> = {};
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params[k] = String(v);
  });

  return params;
}

export const ticketsApi = {
  create: (payload: CreateTicketPayload) =>
    authedHttp.post<Ticket>("/api/v1/tickets", payload),

  list: (query?: TicketsListQuery) =>
    authedHttp.get<TicketsListResponse>("/api/v1/tickets", {
      params: toQueryParams(query as any),
    }),

  getById: (id: UUID) => authedHttp.get<Ticket>(`/api/v1/tickets/${id}`),

  // status actions
  resolve: (id: UUID) => authedHttp.patch<Ticket>(`/api/v1/tickets/${id}/resolve`),
  close: (id: UUID) => authedHttp.patch<Ticket>(`/api/v1/tickets/${id}/close`),
  reopen: (id: UUID) => authedHttp.patch<Ticket>(`/api/v1/tickets/${id}/reopen`),

  // messages
  createMessage: (id: UUID, payload: CreateTicketMessagePayload) =>
    authedHttp.post(`/api/v1/tickets/${id}/messages`, payload),

  listMessages: (id: UUID, query?: TicketMessagesListQuery) =>
    authedHttp.get<TicketMessagesListResponse>(`/api/v1/tickets/${id}/messages`, {
      params: toQueryParams(query as any),
    }),

  // docs link
  linkDoc: (id: UUID, payload: LinkTicketDocPayload) =>
    authedHttp.post(`/api/v1/tickets/${id}/docs/link`, payload),
};
