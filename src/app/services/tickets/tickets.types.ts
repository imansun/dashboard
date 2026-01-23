// src/app/services/tickets/tickets.types.ts
export type UUID = string;

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface Ticket {
  id: UUID;
  company_id: UUID;
  branch_id: UUID;
  category_id: UUID;

  subject: string;
  description: string;

  status: TicketStatus;

  requester_id?: UUID | null;
  responder_id?: UUID | null;

  first_response_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface TicketsListQuery {
  offset?: number;
  limit?: number;

  company_id?: UUID;
  branch_id?: UUID;

  status?: TicketStatus;
  requester_id?: UUID;
  responder_id?: UUID;
}

export interface TicketsListResponse {
  items: Ticket[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateTicketPayload {
  company_id?: UUID;
  branch_id?: UUID;
  category_id: UUID;

  subject: string;
  description: string;
}

/** Messages */
export interface TicketMessage {
  id: UUID;
  ticket_id: UUID;
  sender_id?: UUID | null;
  body: string;
  created_at?: string;
}

export interface TicketMessagesListQuery {
  offset?: number;
  limit?: number;
}

export interface TicketMessagesListResponse {
  items: TicketMessage[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateTicketMessagePayload {
  body: string;
}

/** Docs link */
export interface LinkTicketDocPayload {
  company_id: UUID;
  branch_id: UUID;
  document_id: UUID;
  version_id?: UUID;
}
