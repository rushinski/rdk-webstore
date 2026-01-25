// app/admin/chats/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, XCircle } from "lucide-react";

import { logError } from "@/lib/utils/log";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ChatSummary = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  guest_email?: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  customer?: { email?: string | null } | null;
  messages?: Array<{
    id: string;
    body: string;
    sender_role: "customer" | "admin";
    created_at: string;
  }>;
};

type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: "customer" | "admin";
  body: string;
  created_at: string;
};

export default function AdminChatsPage() {
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const hasLoadedMessages = useRef(false);
  const lastMessageId = useRef<string | null>(null);
  const hasLoadedChats = useRef(false);
  const activeChatIdRef = useRef<string | null>(null);

  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = draftRef.current;
    if (!el) {
      return;
    }
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 128); // cap growth (~8rem)
    el.style.height = `${next}px`;
  }, [messageDraft]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    const loadChats = async (isInitial = false) => {
      if (isInitial) {
        setIsLoadingChats(true);
      }
      try {
        const response = await fetch("/api/chats?status=open", { cache: "no-store" });
        const data = await response.json();
        const nextChats = data.chats ?? [];
        setChats(nextChats);
        if (nextChats.length > 0) {
          setActiveChatId((current) => current ?? nextChats[0].id);
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_chats" });
      } finally {
        if (isInitial) {
          setIsLoadingChats(false);
          hasLoadedChats.current = true;
        }
      }
    };

    loadChats(true);
  }, []);

  useEffect(() => {
    const chatIdParam = searchParams.get("chatId");
    if (chatIdParam) {
      setActiveChatId(chatIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    let isActive = true;
    const loadMessages = async (isInitial = false) => {
      if (isInitial) {
        setIsLoadingMessages(true);
      }
      try {
        const response = await fetch(`/api/chats/${activeChatId}/messages`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!isActive) {
          return;
        }
        const nextMessages = data.messages ?? [];
        const nextLast =
          nextMessages.length > 0 ? nextMessages[nextMessages.length - 1].id : null;
        if (nextLast && nextLast !== lastMessageId.current) {
          lastMessageId.current = nextLast;
          setMessages(nextMessages);
        } else if (!nextLast) {
          lastMessageId.current = null;
          setMessages([]);
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_chat_messages" });
      } finally {
        if (isInitial && isActive) {
          setIsLoadingMessages(false);
          hasLoadedMessages.current = true;
        }
      }
    };

    loadMessages(true);

    return () => {
      isActive = false;
    };
  }, [activeChatId]);

  useEffect(() => {
    hasLoadedMessages.current = false;
    lastMessageId.current = null;
  }, [activeChatId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const chatsChannel = supabase
      .channel("admin-chats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        (payload) => {
          const nextChat = payload.new as ChatSummary;
          if (nextChat.status !== "open") {
            return;
          }
          setChats((prev) =>
            prev.some((chat) => chat.id === nextChat.id) ? prev : [nextChat, ...prev],
          );
          if (!activeChatIdRef.current) {
            setActiveChatId(nextChat.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats" },
        (payload) => {
          const updatedChat = payload.new as ChatSummary;
          setChats((prev) => {
            const index = prev.findIndex((chat) => chat.id === updatedChat.id);
            if (updatedChat.status !== "open") {
              return prev.filter((chat) => chat.id !== updatedChat.id);
            }
            if (index === -1) {
              return [updatedChat, ...prev];
            }
            const next = [...prev];
            next[index] = { ...next[index], ...updatedChat };
            return next;
          });

          if (
            updatedChat.status !== "open" &&
            activeChatIdRef.current === updatedChat.id
          ) {
            setActiveChatId(null);
            setMessages([]);
          }
        },
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("admin-chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const nextMessage = payload.new as ChatMessage;

          setChats((prev) => {
            const index = prev.findIndex((chat) => chat.id === nextMessage.chat_id);
            if (index === -1) {
              return prev;
            }
            const next = [...prev];
            const updatedChat = {
              ...next[index],
              messages: [
                {
                  id: nextMessage.id,
                  body: nextMessage.body,
                  sender_role: nextMessage.sender_role,
                  created_at: nextMessage.created_at,
                },
              ],
            };
            next.splice(index, 1);
            return [updatedChat, ...next];
          });

          if (nextMessage.chat_id === activeChatIdRef.current) {
            lastMessageId.current = nextMessage.id;
            setMessages((prev) =>
              prev.some((message) => message.id === nextMessage.id)
                ? prev
                : [...prev, nextMessage],
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const customerLabel = (chat: ChatSummary) => {
    const email = chat.customer?.email ?? chat.guest_email ?? null;
    if (!email) {
      return "Customer";
    }
    const [prefix] = email.split("@");
    return prefix || "Customer";
  };

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [chats, activeChatId],
  );

  const handleSend = async () => {
    if (!activeChatId || !messageDraft.trim()) {
      return;
    }

    const body = messageDraft.trim();
    setMessageDraft("");

    try {
      const response = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });

      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_send_chat_message" });
    }
  };

  const handleCloseChat = async () => {
    if (!activeChatId) {
      return;
    }
    setConfirmClose(false);
    try {
      await fetch(`/api/chats/${activeChatId}/close`, { method: "POST" });
      setChats((prev) => prev.filter((chat) => chat.id !== activeChatId));
      setActiveChatId(null);
      setMessages([]);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_close_chat" });
    }
  };

  return (
    <div className="bg-black">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Chats</h1>
        <p className="text-sm sm:text-base text-gray-400">
          Respond to pickup questions and customer messages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 sm:gap-6">
        <div className="bg-zinc-900 border border-zinc-800/70">
          <div className="p-3 sm:p-4 border-b border-zinc-800/70 text-[12px] sm:text-sm text-zinc-400">
            Active chats
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {isLoadingChats ? (
              <div className="p-3 sm:p-4 text-[12px] sm:text-sm text-zinc-500">
                Loading chats...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-3 sm:p-4 text-[12px] sm:text-sm text-zinc-500">
                No active chats.
              </div>
            ) : (
              chats.map((chat) => {
                const preview = chat.messages?.[0]?.body ?? "No messages yet.";
                const label = customerLabel(chat);
                const orderLabel = chat.order_id
                  ? `${label} - Order #${chat.order_id.slice(0, 8)}`
                  : label;
                const isActive = chat.id === activeChatId;

                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-800/70 transition min-w-0 ${
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="text-[12px] sm:text-sm font-semibold text-white truncate">
                      {orderLabel}
                    </div>
                    <div className="text-[11px] sm:text-xs text-zinc-500 mt-1 truncate">
                      {preview}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 flex flex-col">
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-zinc-800/70">
            <div>
              <div className="text-[12px] sm:text-sm text-white font-semibold">
                {activeChat
                  ? activeChat.order_id
                    ? `${customerLabel(activeChat)} - Order #${activeChat.order_id.slice(0, 8)}`
                    : customerLabel(activeChat)
                  : "Chat"}
              </div>
              <div className="text-[11px] sm:text-xs text-zinc-500">
                Customer conversation
              </div>
            </div>
            {activeChat && (
              <button
                type="button"
                onClick={() => setConfirmClose(true)}
                className="text-[11px] sm:text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Close chat
              </button>
            )}
          </div>

          <div className="flex-1 p-3 sm:p-4 space-y-3 overflow-y-auto">
            {isLoadingMessages && !hasLoadedMessages.current ? (
              <div className="text-[12px] sm:text-sm text-zinc-500">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-[12px] sm:text-sm text-zinc-500">No messages yet.</div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] w-fit rounded-2xl px-4 py-3 border border-zinc-800/70 ${
                    message.sender_role === "admin"
                      ? "bg-zinc-950 text-white ml-auto"
                      : "bg-zinc-800 text-zinc-100 mr-auto"
                  }`}
                  data-testid="chat-message"
                >
                  <div className="text-[11px] sm:text-xs text-zinc-500 mb-1">
                    {message.sender_role === "admin"
                      ? "Admin"
                      : activeChat
                        ? customerLabel(activeChat)
                        : "Customer"}
                  </div>
                  <div className="text-[12px] sm:text-sm whitespace-pre-wrap break-words">
                    {message.body}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-800/70 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <textarea
                ref={draftRef}
                rows={1}
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={activeChat ? "Type a reply..." : "Select a chat to reply"}
                disabled={!activeChat}
                className="flex-1 bg-zinc-800 text-white px-3 py-2 border border-zinc-700 text-[12px] sm:text-sm rounded
                          disabled:opacity-60 resize-none overflow-y-auto no-scrollbar max-h-24 sm:max-h-32 whitespace-pre-wrap focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                data-testid="chat-message-input"
              />
              <button
                type="button"
                onClick={() => {
                  void handleSend();
                }}
                disabled={!activeChat}
                className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 text-[12px] sm:text-sm flex items-center gap-2"
                data-testid="chat-send-button"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmClose && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setConfirmClose(false)}
          />
          <div className="relative bg-zinc-950 border border-zinc-800/70 p-6 max-w-sm w-full mx-4">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
              Close this chat?
            </h3>
            <p className="text-[12px] sm:text-sm text-zinc-400 mb-4">
              Closing will end the conversation for the customer.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 text-[12px] sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCloseChat();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 text-[12px] sm:text-sm"
              >
                Close chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
