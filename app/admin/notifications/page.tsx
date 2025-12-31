'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/notifications?limit=50', { cache: 'no-store' });
      const data = await response.json();
      setNotifications(data.notifications ?? []);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_notifications_page_load' });
      setMessage('Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAll = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))
      );
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_notifications_page_mark_all' });
      setMessage('Failed to mark notifications as read.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400">Store activity and chat updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMarkAll}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2"
          >
            Mark all as read
          </button>
          <button
            type="button"
            onClick={loadNotifications}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
          >
            Refresh
          </button>
        </div>
      </div>

      {message && <div className="text-sm text-zinc-400">{message}</div>}

      <div className="bg-zinc-900 border border-zinc-800/70">
        {isLoading ? (
          <div className="p-4 text-sm text-zinc-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">No notifications yet.</div>
        ) : (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.chat_id ? `/admin/chats?chatId=${notification.chat_id}` : '/admin/sales'}
              className={`block px-4 py-3 border-b border-zinc-800/70 transition ${
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
  );
}
