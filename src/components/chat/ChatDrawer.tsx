// src/components/chat/ChatDrawer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";

import { logError } from "@/lib/utils/log";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSession } from "@/contexts/SessionContext";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Chat = {
  id: string;
  status: string;
  order_id: string | null;
  source: string;
  created_at: string;
};

type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: "customer" | "admin";
  body: string;
  created_at: string;
};

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const pathname = usePathname();
  const { user } = useSession();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [guestAccess, setGuestAccess] = useState<{
    orderId: string;
    token: string;
  } | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const hasLoadedMessages = useRef(false);
  const lastMessageId = useRef<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  const loginUrl = useMemo(() => {
    if (!pathname) {
      return "/auth/login";
    }
    return `/auth/login?next=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const loadMessages = async (chatId: string, isInitial = false) => {
    if (isInitial) {
      setIsMessagesLoading(true);
    }
    try {
      const guestQuery = guestAccess
        ? `?orderId=${encodeURIComponent(guestAccess.orderId)}&token=${encodeURIComponent(
            guestAccess.token,
          )}`
        : "";
      const endpoint = guestAccess
        ? `/api/chats/guest/${chatId}/messages${guestQuery}`
        : `/api/chats/${chatId}/messages`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();
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
      logError(error, { layer: "frontend", event: "chat_load_messages" });
    } finally {
      if (isInitial) {
        setIsMessagesLoading(false);
        hasLoadedMessages.current = true;
      }
    }
  };

  const loadChat = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // OPTIMIZATION: Use session from context instead of fetching
      if (!user) {
        let storedAccess: { orderId: string; token: string } | null = null;
        try {
          const orderId = sessionStorage.getItem("rdk_guest_order_id");
          const token = sessionStorage.getItem("rdk_guest_order_token");
          if (orderId && token) {
            storedAccess = { orderId, token };
          }
        } catch {
          storedAccess = null;
        }

        setGuestAccess(storedAccess);
        if (!storedAccess) {
          setRequiresAuth(true);
          setChat(null);
          setMessages([]);
          setIsGuestMode(false);
          return;
        }

        setRequiresAuth(false);
        setIsGuestMode(true);

        const response = await fetch(
          `/api/chats/guest?orderId=${encodeURIComponent(storedAccess.orderId)}&token=${encodeURIComponent(
            storedAccess.token,
          )}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        setChat(data.chat ?? null);
        if (data.chat?.id) {
          await loadMessages(data.chat.id, true);
        } else {
          setMessages([]);
        }
        return;
      }

      const response = await fetch("/api/chats/current", { cache: "no-store" });
      if (!response.ok) {
        setRequiresAuth(true);
        setChat(null);
        setIsGuestMode(false);
        return;
      }

      const data = await response.json();
      setRequiresAuth(false);
      setIsGuestMode(false);
      setGuestAccess(null);
      setChat(data.chat ?? null);
      if (data.chat?.id) {
        await loadMessages(data.chat.id, true);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setErrorMessage("Failed to load chat.");
      logError(error, { layer: "frontend", event: "chat_load_chat" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const el = draftRef.current;
    if (!el) {
      return;
    }
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 128); // cap height
    el.style.height = `${next}px`;
  }, [messageDraft]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    loadChat();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !chat?.id) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat-messages-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          const nextMessage = payload.new as ChatMessage;
          lastMessageId.current = nextMessage.id;
          setMessages((prev) =>
            prev.some((message) => message.id === nextMessage.id)
              ? prev
              : [...prev, nextMessage],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, chat?.id]);

  useEffect(() => {
    hasLoadedMessages.current = false;
    lastMessageId.current = null;
  }, [chat?.id]);

  const handleStartChat = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const endpoint = isGuestMode && guestAccess ? "/api/chats/guest" : "/api/chats";
      const payload =
        isGuestMode && guestAccess
          ? { orderId: guestAccess.orderId, token: guestAccess.token }
          : {};

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data?.error ?? "Failed to start chat.");
        return;
      }

      setChat(data.chat ?? null);
      if (data.chat?.id) {
        await loadMessages(data.chat.id);
      }
    } catch {
      setErrorMessage("Failed to start chat.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!chat?.id || !messageDraft.trim()) {
      return;
    }
    const body = messageDraft.trim();
    setMessageDraft("");

    try {
      const endpoint =
        isGuestMode && guestAccess
          ? `/api/chats/guest/${chat.id}/messages`
          : `/api/chats/${chat.id}/messages`;
      const payload =
        isGuestMode && guestAccess
          ? { orderId: guestAccess.orderId, token: guestAccess.token, message: body }
          : { message: body };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (error) {
      logError(error, { layer: "frontend", event: "chat_send_message" });
    }
  };

  const handleCloseChat = async () => {
    if (!chat?.id) {
      return;
    }
    setConfirmClose(false);
    try {
      const endpoint =
        isGuestMode && guestAccess
          ? `/api/chats/guest/${chat.id}/close`
          : `/api/chats/${chat.id}/close`;
      const payload =
        isGuestMode && guestAccess
          ? { orderId: guestAccess.orderId, token: guestAccess.token }
          : null;

      await fetch(endpoint, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      setChat(null);
      setMessages([]);
    } catch (error) {
      logError(error, { layer: "frontend", event: "chat_close_chat" });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 h-[80vh] max-h-[80vh] w-full bg-black border-t border-zinc-800/70 overflow-hidden rounded-t-2xl md:rounded-none md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-h-none md:max-w-lg md:border-t-0 md:border-l">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Chat with us</h2>
              <p className="text-xs text-zinc-500">
                Pickup timing, questions, and support.
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {requiresAuth ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <p className="text-zinc-400">
                Sign in to start a secure chat with our admins.
              </p>
              <Link
                href={loginUrl}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2"
              >
                Sign in to chat
              </Link>
            </div>
          ) : errorMessage ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              {errorMessage}
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              Loading chat...
            </div>
          ) : !chat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <p className="text-zinc-400">Start a chat to reach our admin team.</p>
              <button
                type="button"
                onClick={() => {
                  void handleStartChat();
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2"
              >
                Start chat
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {isMessagesLoading && !hasLoadedMessages.current ? (
                  <div className="text-sm text-zinc-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-zinc-500">No messages yet.</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[80%] w-fit rounded-2xl px-4 py-3 border border-zinc-800/70 ${
                        message.sender_role === "customer"
                          ? "bg-red-900/20 text-white ml-auto"
                          : "bg-zinc-900 text-zinc-200 mr-auto"
                      }`}
                    >
                      <div className="text-xs text-zinc-500 mb-1">
                        {message.sender_role === "customer" ? "You" : "Admin"}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.body}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 border-t border-zinc-800/70 pt-4 space-y-3">
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
                    placeholder="Type your message..."
                    className="flex-1 bg-zinc-800 text-white px-3 py-2 border border-zinc-700 text-sm rounded
                              resize-none overflow-y-auto max-h-32 whitespace-pre-wrap focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleSend();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmClose(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Close chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmClose && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setConfirmClose(false)}
          />
          <div className="relative bg-zinc-950 border border-zinc-800/70 p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Close this chat?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Closing will end the conversation. You can't send new messages unless you
              sign in again.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCloseChat();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 text-sm"
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
