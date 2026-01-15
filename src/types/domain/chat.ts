export type ChatStatus = "open" | "closed";
export type ChatSource = "manual" | "order";
export type ChatSenderRole = "customer" | "admin";

export interface ChatSummary {
  id: string;
  userId: string | null;
  orderId: string | null;
  guestEmail?: string | null;
  status: ChatStatus;
  source: ChatSource;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    body: string;
    senderRole: ChatSenderRole;
    createdAt: string;
  } | null;
}

export interface ChatMessageView {
  id: string;
  chatId: string;
  senderId: string | null;
  senderRole: ChatSenderRole;
  body: string;
  createdAt: string;
}
