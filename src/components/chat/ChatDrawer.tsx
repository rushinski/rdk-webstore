'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, X } from 'lucide-react';
import { logError } from '@/lib/log';

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
  sender_role: 'customer' | 'admin';
  body: string;
  created_at: string;
};

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const pathname = usePathname();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loginUrl = useMemo(() => {
    if (!pathname) return '/auth/login';
    return `/auth/login?next=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const loadMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
      const data = await response.json();
      setMessages(data.messages ?? []);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'chat_load_messages' });
    }
  };

  const loadChat = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      const sessionData = await sessionResponse.json().catch(() => null);
      if (!sessionData?.user) {
        setRequiresAuth(true);
        setChat(null);
        setMessages([]);
        return;
      }

      const response = await fetch('/api/chats/current', { cache: 'no-store' });
      if (!response.ok) {
        setRequiresAuth(true);
        setChat(null);
        return;
      }

      const data = await response.json();
      setRequiresAuth(false);
      setChat(data.chat ?? null);
      if (data.chat?.id) {
        await loadMessages(data.chat.id);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setErrorMessage('Failed to load chat.');
      logError(error, { layer: 'frontend', event: 'chat_load_chat' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadChat();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !chat?.id) return;
    const interval = setInterval(() => loadMessages(chat.id), 5000);
    return () => clearInterval(interval);
  }, [isOpen, chat?.id]);

  const handleStartChat = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data?.error ?? 'Failed to start chat.');
        return;
      }

      setChat(data.chat ?? null);
      if (data.chat?.id) {
        await loadMessages(data.chat.id);
      }
    } catch (error) {
      setErrorMessage('Failed to start chat.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!chat?.id || !messageDraft.trim()) return;
    const body = messageDraft.trim();
    setMessageDraft('');

    try {
      const response = await fetch(`/api/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      });

      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'chat_send_message' });
    }
  };

  const handleCloseChat = async () => {
    if (!chat?.id) return;
    try {
      await fetch(`/api/chats/${chat.id}/close`, { method: 'POST' });
      setChat(null);
      setMessages([]);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'chat_close_chat' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 h-[80vh] max-h-[80vh] w-full bg-black border-t border-zinc-800/70 overflow-hidden rounded-t-2xl md:rounded-none md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-h-none md:max-w-lg md:border-t-0 md:border-l">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Chat with us</h2>
              <p className="text-xs text-zinc-500">Pickup timing, questions, and support.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {requiresAuth ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <p className="text-zinc-400">Sign in to start a secure chat with our admins.</p>
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
                onClick={handleStartChat}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2"
              >
                Start chat
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="text-sm text-zinc-500">No messages yet.</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[80%] px-4 py-3 border border-zinc-800/70 ${
                        message.sender_role === 'customer'
                          ? 'bg-red-900/20 text-white ml-auto'
                          : 'bg-zinc-900 text-zinc-200'
                      }`}
                    >
                      <div className="text-xs text-zinc-500 mb-1">
                        {message.sender_role === 'customer' ? 'You' : 'Admin'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{message.body}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 border-t border-zinc-800/70 pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-zinc-800 text-white px-3 py-2 border border-zinc-700 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCloseChat}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Close chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
