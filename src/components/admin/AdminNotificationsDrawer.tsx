'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { X, Trash2 } from 'lucide-react';
import { logError } from '@/lib/log';

type AdminNotification = {
  id: string;
  type: 'order_placed' | 'chat_created' | 'chat_message';
  message: string;
  created_at: string;
  read_at: string | null;
  order_id?: string | null;
  chat_id?: string | null;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const getNotificationHref = (n: AdminNotification) => {
  if (n.type === 'order_placed' && n.order_id) return '/admin/sales';
  if (n.chat_id) return `/admin/chats?chatId=${n.chat_id}`;
  return '/admin/dashboard';
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type ListResponse = {
  notifications: AdminNotification[];
  nextCursor: string | null;
  unreadCount?: number; // optional if you return it
};

export function AdminNotificationsDrawer({ isOpen, onClose }: Props) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Fix: don’t show “0” before first load
  const [unreadCountServer, setUnreadCountServer] = useState<number | null>(null);

  const loadedOnceRef = useRef(false);

  const unreadCountLocal = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const loadNotifications = async (mode: 'reset' | 'more' = 'reset') => {
    try {
      if (mode === 'reset') setIsLoading(true);
      else setIsLoadingMore(true);

      const limit = 20;
      const cursorParam = mode === 'more' && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : '';
      const res = await fetch(`/api/admin/notifications?limit=${limit}${cursorParam}`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = (await res.json()) as ListResponse;
      const incoming = data.notifications ?? [];

      setNextCursor(data.nextCursor ?? null);

      if (typeof data.unreadCount === 'number') setUnreadCountServer(data.unreadCount);

      if (mode === 'reset') {
        setNotifications(incoming);
        loadedOnceRef.current = true;
      } else {
        setNotifications((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          const merged = [...prev];
          for (const n of incoming) if (!seen.has(n.id)) merged.push(n);
          return merged;
        });
      }
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_load_notifications_drawer' });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await fetch('/api/admin/notifications/unread-count', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.unreadCount === 'number') setUnreadCountServer(data.unreadCount);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_load_notifications_unread_count' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Fetch unread count immediately, list after (prevents the “0” flash)
      loadUnreadCount();
      if (!loadedOnceRef.current) loadNotifications('reset');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const markRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      // keep server count consistent (best-effort)
      setUnreadCountServer((v) => (typeof v === 'number' ? Math.max(0, v - 1) : v));
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_mark_notification_read_drawer' });
    }
  };

  const markAll = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      setUnreadCountServer(0);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_mark_all_notifications_drawer' });
    }
  };

  const deleteOne = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      // unread count best-effort: recompute from local after delete
      setUnreadCountServer(null);
      loadUnreadCount();
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_delete_notification' });
    }
  };

  if (!isOpen) return null;

  const showUnread = unreadCountServer !== null && !isLoading;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute inset-x-0 bottom-0 h-[80vh] max-h-[80vh] w-full bg-black border-t border-zinc-800/70 overflow-y-auto rounded-t-2xl
                      md:rounded-none md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-h-none md:max-w-md md:border-t-0 md:border-l">
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Notifications</h2>

              {/* Fix: don’t show “Unread: 0” while loading */}
              <p className="text-xs text-zinc-500 mt-1">
                {showUnread ? `Unread: ${unreadCountServer}` : isLoading ? 'Loading…' : `Unread: ${unreadCountLocal}`}
              </p>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3 mb-4">
            <button
              type="button"
              onClick={() => {
                setUnreadCountServer(null);
                setNextCursor(null);
                loadUnreadCount();
                loadNotifications('reset');
              }}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Refresh
            </button>
            <button type="button" onClick={markAll} className="text-xs text-zinc-400 hover:text-white">
              Mark all as read
            </button>
          </div>

          {isLoading ? (
            <div className="text-sm text-zinc-500 py-8 text-center">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="text-sm text-zinc-500 py-10 text-center">No notifications yet.</div>
          ) : (
            <>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="relative">
                    <Link
                      href={getNotificationHref(n)}
                      onClick={() => {
                        onClose();
                        if (!n.read_at) markRead(n.id);
                      }}
                      className={`block border border-zinc-800/70 bg-zinc-950 hover:bg-zinc-900 transition px-4 py-3 rounded-sm pr-12 ${
                        n.read_at ? 'text-zinc-400' : 'text-white'
                      }`}
                    >
                      <div className="text-sm font-medium">{n.message}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatTime(n.created_at)}</div>
                    </Link>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteOne(n.id);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-3 text-zinc-500 hover:text-white"
                      aria-label="Delete notification"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Load more */}
              <div className="pt-4">
                {nextCursor ? (
                  <button
                    type="button"
                    onClick={() => loadNotifications('more')}
                    disabled={isLoadingMore}
                    className="w-full border border-zinc-800/70 bg-zinc-950 hover:bg-zinc-900 transition rounded-sm py-2 text-xs text-zinc-200 disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                ) : (
                  <div className="text-center text-xs text-zinc-600 py-2">End of list</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
