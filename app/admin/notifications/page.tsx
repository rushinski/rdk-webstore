'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical, Trash2, X } from 'lucide-react';
import { logError } from '@/lib/log';

type AdminNotification = {
  id: string;
  type: 'order_placed' | 'chat_message';
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

const cap9 = (n: number) => (n > 9 ? '9+' : String(n));

function emitUnreadCountUpdated(count: number) {
  window.dispatchEvent(new CustomEvent('adminNotificationsUpdated', { detail: { unreadCount: count } }));
}

type ListResponse = {
  notifications: AdminNotification[];
  hasMore: boolean;
  unreadCount: number;
  page: number;
  limit: number;
};

export default function AdminNotificationsPage() {
  const limit = 20;

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // per-row 3-dot menu
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // bulk delete mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // header delete hover menu (now click-to-open)
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);

  // confirm modal
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const selectedCount = selectedIds.size;

  // click-outside refs
  const headerDeleteRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  const load = async (nextPage = page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?limit=${limit}&page=${nextPage}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;

      const json = (await res.json()) as ListResponse;
      setData(json);
      setPage(json.page);

      emitUnreadCountUpdated(json.unreadCount);
    } catch (e) {
      logError(e, { layer: 'frontend', event: 'admin_notifications_center_load' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close popups on outside click + Esc
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (deleteMenuOpen && headerDeleteRef.current && !headerDeleteRef.current.contains(target)) {
        setDeleteMenuOpen(false);
      }

      if (menuOpenFor && rowMenuRef.current && !rowMenuRef.current.contains(target)) {
        setMenuOpenFor(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteMenuOpen(false);
        setMenuOpenFor(null);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [deleteMenuOpen, menuOpenFor]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterSelectMode = (initialSelected?: string[]) => {
    setSelectMode(true);
    setMenuOpenFor(null);
    setDeleteMenuOpen(false);
    setSelectedIds(new Set(initialSelected ?? []));
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setMenuOpenFor(null);
    setDeleteMenuOpen(false);
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) return;

      if (typeof json?.deletedCount === 'number' && json.deletedCount === 0) {
        // No-op: nothing deleted (already gone / none matched). This is NOT an error.
        cancelSelectMode();
        await load(page);
        const afterCount = data?.notifications?.length ?? 0;
        if (afterCount === 0 && page > 1) await load(page - 1);
        return;
      }

      cancelSelectMode();

      await load(page);
      const afterCount = data?.notifications?.length ?? 0;
      if (afterCount === 0 && page > 1) await load(page - 1);
    } catch (e) {
      logError(e, { layer: 'frontend', event: 'admin_notifications_center_delete' });
    }
  };

  const confirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_all: true }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) return;

      if (typeof json?.deletedCount === 'number' && json.deletedCount === 0) {
        // No-op: nothing to delete. Not an error.
        setConfirmDeleteAllOpen(false);
        cancelSelectMode();
        await load(1);
        return;
      }

      setConfirmDeleteAllOpen(false);
      cancelSelectMode();
      await load(1);
    } catch (e) {
      logError(e, { layer: 'frontend', event: 'admin_notifications_center_delete_all' });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: Math.max(0, prev.unreadCount - 1),
              notifications: prev.notifications.map((n) =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
              ),
            }
          : prev
      );

      emitUnreadCountUpdated(Math.max(0, unreadCount - 1));
    } catch (e) {
      logError(e, { layer: 'frontend', event: 'admin_notifications_center_mark_read' });
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: 0,
              notifications: prev.notifications.map((n) => ({
                ...n,
                read_at: n.read_at ?? new Date().toISOString(),
              })),
            }
          : prev
      );
      emitUnreadCountUpdated(0);
    } catch (e) {
      logError(e, { layer: 'frontend', event: 'admin_notifications_center_mark_all' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Delete All Confirmation Modal */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              if (!isDeletingAll) setConfirmDeleteAllOpen(false);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800/70 shadow-2xl rounded-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">Delete all notifications?</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    This will permanently delete your entire notification history.
                  </p>
                </div>
                <button
                  className="text-zinc-400 hover:text-white"
                  onClick={() => {
                    if (!isDeletingAll) setConfirmDeleteAllOpen(false);
                  }}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  className="text-xs text-zinc-400 hover:text-white"
                  onClick={() => setConfirmDeleteAllOpen(false)}
                  disabled={isDeletingAll}
                >
                  Cancel
                </button>
                <button
                  className="text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-sm px-4 py-2 disabled:opacity-60"
                  onClick={confirmDeleteAll}
                  disabled={isDeletingAll}
                >
                  {isDeletingAll ? 'Deleting...' : 'Delete all'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notification Center</h1>
          <p className="text-xs text-zinc-500 mt-1">Unread: {unreadCount > 0 ? cap9(unreadCount) : '0'}</p>
        </div>

        {selectMode ? (
          <button onClick={cancelSelectMode} className="text-zinc-400 hover:text-white flex items-center gap-2">
            <X className="w-4 h-4" />
            Cancel
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => load(page)} className="text-xs text-zinc-400 hover:text-white">
              Refresh
            </button>

            <button onClick={markAllRead} className="text-xs text-zinc-400 hover:text-white">
              Mark all as read
            </button>

            {/* Header Delete (click-to-open + click-outside-to-close) */}
            <div ref={headerDeleteRef} className="relative">
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-2"
                aria-label="Delete menu"
                onClick={() => {
                  setMenuOpenFor(null);
                  setDeleteMenuOpen((v) => !v);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>

              {deleteMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-950 border border-zinc-800/70 shadow-xl rounded-sm overflow-hidden z-50">
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900 text-white"
                    onClick={() => {
                      setDeleteMenuOpen(false);
                      enterSelectMode([]);
                    }}
                  >
                    Select delete
                  </button>

                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-900 text-red-400"
                    onClick={() => {
                      setDeleteMenuOpen(false);
                      setConfirmDeleteAllOpen(true);
                    }}
                  >
                    Delete all
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected banner */}
      {selectMode && (
        <div className="mb-4 flex items-center justify-between border border-zinc-800/70 bg-zinc-950 px-4 py-3 rounded-sm">
          <div className="text-sm text-white">
            Selected: <span className="font-semibold">{selectedCount}</span>
          </div>

          <button
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete selected
          </button>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="text-sm text-zinc-500 py-10 text-center">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-sm text-zinc-500 py-10 text-center">No notifications yet.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isSelected = selectedIds.has(n.id);

            return (
              <div key={n.id} className="relative border border-zinc-800/70 bg-zinc-950 rounded-sm">
                {/* group hover makes entire row change bg (including 3-dot area) */}
                <div className="group flex items-stretch">
                  {selectMode && (
                    <div className="flex items-center px-3 transition group-hover:bg-zinc-900">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(n.id)}
                        className="rdk-checkbox"
                        aria-label="Select notification"
                      />
                    </div>
                  )}

                  {/* Row click behavior:
                      - normal mode: navigate + mark read
                      - select mode: toggle selection (no navigation)
                   */}
                  <Link
                    href={getNotificationHref(n)}
                    onClick={(e) => {
                      if (selectMode) {
                        e.preventDefault();
                        toggleSelected(n.id);
                        return;
                      }
                      if (!n.read_at) markRead(n.id);
                    }}
                    className={`block flex-1 min-w-0 px-4 py-3 transition group-hover:bg-zinc-900 ${
                      n.read_at ? 'text-zinc-400' : 'text-white'
                    }`}
                  >
                    <div className="text-sm font-medium break-words whitespace-pre-wrap">{n.message}</div>
                    <div className="text-xs text-zinc-500 mt-1">{formatTime(n.created_at)}</div>
                  </Link>

                  {/* 3-dot menu (click-to-open + click-outside-to-close) */}
                  <div
                    ref={menuOpenFor === n.id ? rowMenuRef : null}
                    className="relative flex items-center pr-2 transition group-hover:bg-zinc-900"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectMode) return;
                        setDeleteMenuOpen(false);
                        setMenuOpenFor((prev) => (prev === n.id ? null : n.id));
                      }}
                      className="text-zinc-500 hover:text-white px-2"
                      aria-label="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpenFor === n.id && !selectMode && (
                      <div className="absolute right-2 top-10 z-50 w-40 bg-zinc-950 border border-zinc-800/70 shadow-xl rounded-sm overflow-hidden">
                        <button
                          className="w-full text-left text-sm px-3 py-2 hover:bg-zinc-900 text-red-400"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpenFor(null);
                            enterSelectMode([n.id]); // auto-select clicked
                          }}
                        >
                          Delete...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => load(page - 1)}
          disabled={page <= 1 || isLoading}
          className="text-xs text-zinc-400 hover:text-white disabled:opacity-50"
        >
          Prev
        </button>

        <div className="text-xs text-zinc-600">Page {page}</div>

        <button
          type="button"
          onClick={() => load(page + 1)}
          disabled={!data?.hasMore || isLoading}
          className="text-xs text-zinc-400 hover:text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
