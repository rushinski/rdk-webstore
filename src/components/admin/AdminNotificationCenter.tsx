'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
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
  return date.toLocaleString();
};

const getNotificationHref = (notification: AdminNotification) => {
  if (notification.type === 'order_placed' && notification.order_id) {
    return '/admin/sales';
  }

  if (notification.chat_id) {
    return `/admin/chats?chatId=${notification.chat_id}`;
  }

  return '/admin/dashboard';
};

export function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/notifications?limit=12', {
        cache: 'no-store',
      });
      if (!response.ok) {
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      setNotifications(data.notifications ?? []);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_load_notifications' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const markRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
      );
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_mark_notification_read' });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-10 h-10 border border-zinc-800/70 bg-zinc-950 hover:bg-zinc-900 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-zinc-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-zinc-950 border border-zinc-800/70 shadow-xl z-50">
          <div className="p-4 border-b border-zinc-800/70">
            <div className="text-white font-semibold">Notifications</div>
            <div className="text-xs text-zinc-500">Latest activity for your store.</div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-zinc-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationHref(notification)}
                  onClick={() => {
                    setIsOpen(false);
                    if (!notification.read_at) {
                      markRead(notification.id);
                    }
                  }}
                  className={`block px-4 py-3 border-b border-zinc-900/70 hover:bg-zinc-900 transition ${
                    notification.read_at ? 'text-zinc-400' : 'text-white'
                  }`}
                >
                  <div className="text-sm font-medium">{notification.message}</div>
                  <div className="text-xs text-zinc-500 mt-1">{formatTime(notification.created_at)}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
