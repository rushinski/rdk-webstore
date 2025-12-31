'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, XCircle } from 'lucide-react';
import { logError } from '@/lib/log';

type ChatSummary = {
  id: string;
  user_id: string;
  order_id: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  messages?: Array<{
    id: string;
    body: string;
    sender_role: 'customer' | 'admin';
    created_at: string;
  }>;
};

type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'customer' | 'admin';
  body: string;
  created_at: string;
};

export default function AdminChatsPage() {
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    const loadChats = async () => {
      setIsLoadingChats(true);
      try {
        const response = await fetch('/api/chats?status=open', { cache: 'no-store' });
        const data = await response.json();
        const nextChats = data.chats ?? [];
        setChats(nextChats);
        if (!activeChatId && nextChats.length > 0) {
          setActiveChatId(nextChats[0].id);
        }
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_chats' });
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadChats();
  }, [activeChatId]);

  useEffect(() => {
    const chatIdParam = searchParams.get('chatId');
    if (chatIdParam) {
      setActiveChatId(chatIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeChatId) return;

    let isActive = true;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(`/api/chats/${activeChatId}/messages`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!isActive) return;
        setMessages(data.messages ?? []);
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_chat_messages' });
      } finally {
        if (isActive) setIsLoadingMessages(false);
      }
    };

    loadMessages();

    const interval = setInterval(loadMessages, 5000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [activeChatId]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  const handleSend = async () => {
    if (!activeChatId || !messageDraft.trim()) return;

    const body = messageDraft.trim();
    setMessageDraft('');

    try {
      const response = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      });

      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_send_chat_message' });
    }
  };

  const handleCloseChat = async () => {
    if (!activeChatId) return;
    try {
      await fetch(`/api/chats/${activeChatId}/close`, { method: 'POST' });
      setChats((prev) => prev.filter((chat) => chat.id !== activeChatId));
      setActiveChatId(null);
      setMessages([]);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_close_chat' });
    }
  };

  return (
    <div className="bg-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Chats</h1>
        <p className="text-gray-400">Respond to pickup questions and customer messages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-zinc-900 border border-zinc-800/70">
          <div className="p-4 border-b border-zinc-800/70 text-sm text-zinc-400">
            Active chats
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {isLoadingChats ? (
              <div className="p-4 text-sm text-zinc-500">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">No active chats.</div>
            ) : (
              chats.map((chat) => {
                const preview = chat.messages?.[0]?.body ?? 'No messages yet.';
                const orderLabel = chat.order_id ? `Order #${chat.order_id.slice(0, 8)}` : 'General chat';
                const isActive = chat.id === activeChatId;

                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/70 transition ${
                      isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">{orderLabel}</div>
                    <div className="text-xs text-zinc-500 mt-1">{preview}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 flex flex-col">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-zinc-800/70">
            <div>
              <div className="text-white font-semibold">{activeChat?.order_id ? `Order #${activeChat.order_id.slice(0, 8)}` : 'Chat'}</div>
              <div className="text-xs text-zinc-500">Customer conversation</div>
            </div>
            {activeChat && (
              <button
                type="button"
                onClick={handleCloseChat}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Close chat
              </button>
            )}
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {isLoadingMessages ? (
              <div className="text-sm text-zinc-500">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-zinc-500">No messages yet.</div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] px-4 py-3 border border-zinc-800/70 ${
                    message.sender_role === 'admin'
                      ? 'bg-zinc-950 text-white ml-auto'
                      : 'bg-zinc-800 text-zinc-100'
                  }`}
                >
                  <div className="text-xs text-zinc-500 mb-1">
                    {message.sender_role === 'admin' ? 'Admin' : 'Customer'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.body}</div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-800/70 p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder={activeChat ? 'Type a reply...' : 'Select a chat to reply'}
                disabled={!activeChat}
                className="flex-1 bg-zinc-800 text-white px-3 py-2 border border-zinc-700 text-sm disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!activeChat}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
