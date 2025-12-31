'use client';

import { useEffect, useState } from 'react';
import { logError } from '@/lib/log';

type AdminProfile = {
  id: string;
  email: string | null;
  role: string | null;
  chat_notifications_enabled: boolean;
  admin_order_notifications_enabled: boolean;
  admin_chat_created_notifications_enabled: boolean;
  is_primary_admin: boolean;
};

type PayoutSettings = {
  id: string;
  primary_admin_id: string;
  provider: string | null;
  account_label: string | null;
  account_last4: string | null;
};

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [message, setMessage] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin'>('admin');
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/admin/profile', { cache: 'no-store' });
        const data = await response.json();
        setProfile(data.profile ?? null);
        const nextPayout =
          data.payoutSettings ??
          (data.profile
            ? {
                id: 'new',
                primary_admin_id: data.profile.id,
                provider: '',
                account_label: '',
                account_last4: '',
              }
            : null);
        setPayoutSettings(nextPayout);
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_profile' });
      }
    };

    loadProfile();
  }, []);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'dev';
  const canInviteSuper = profile?.role === 'dev';
  const canManagePayout = isSuperAdmin || profile?.is_primary_admin;

  useEffect(() => {
    if (!canInviteSuper) setInviteRole('admin');
  }, [canInviteSuper]);

  const handleSavePreferences = async () => {
    if (!profile) return;
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_notifications_enabled: profile.chat_notifications_enabled,
          admin_order_notifications_enabled: profile.admin_order_notifications_enabled,
          admin_chat_created_notifications_enabled: profile.admin_chat_created_notifications_enabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setMessage(data?.error ?? 'Failed to update preferences.');
        return;
      }

      setMessage('Preferences updated.');
    } catch (error) {
      setMessage('Failed to update preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteUrl('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: inviteRole }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error ?? 'Failed to create invite.');
        return;
      }

      setInviteUrl(data.inviteUrl ?? '');
    } catch (error) {
      setMessage('Failed to create invite.');
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage('Invite link copied.');
    } catch (error) {
      setMessage('Failed to copy invite link.');
    }
  };

  const handleSavePayout = async () => {
    if (!payoutSettings) return;
    setIsSavingPayout(true);
    setMessage('');

    try {
      const provider = payoutSettings.provider?.trim() || null;
      const accountLabel = payoutSettings.account_label?.trim() || null;
      const accountLast4 = payoutSettings.account_last4?.trim() || null;

      const response = await fetch('/api/admin/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          account_label: accountLabel,
          account_last4: accountLast4,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error ?? 'Failed to update payout settings.');
        return;
      }

      setPayoutSettings(data.payoutSettings ?? payoutSettings);
      setMessage('Payout settings updated.');
    } catch (error) {
      setMessage('Failed to update payout settings.');
    } finally {
      setIsSavingPayout(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Settings</h1>
        <p className="text-gray-400">Personal preferences for this admin account.</p>
      </div>

      {message && (
        <div className="bg-zinc-900 border border-zinc-800/70 text-sm text-zinc-300 px-4 py-3">
          {message}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800/70 p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
          <p className="text-gray-400 text-sm">Control how you receive admin updates.</p>
        </div>

        <label className="flex items-center justify-between gap-4 text-sm text-zinc-300">
          <span>Chat message notifications</span>
          <input
            type="checkbox"
            checked={profile?.chat_notifications_enabled ?? true}
            onChange={(e) =>
              setProfile((prev) =>
                prev ? { ...prev, chat_notifications_enabled: e.target.checked } : prev
              )
            }
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-600"
          />
        </label>

        <label className="flex items-center justify-between gap-4 text-sm text-zinc-300">
          <span>Order placed notifications</span>
          <input
            type="checkbox"
            checked={profile?.admin_order_notifications_enabled ?? true}
            onChange={(e) =>
              setProfile((prev) =>
                prev ? { ...prev, admin_order_notifications_enabled: e.target.checked } : prev
              )
            }
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-600"
          />
        </label>

        <label className="flex items-center justify-between gap-4 text-sm text-zinc-300">
          <span>Chat created notifications</span>
          <input
            type="checkbox"
            checked={profile?.admin_chat_created_notifications_enabled ?? true}
            onChange={(e) =>
              setProfile((prev) =>
                prev
                  ? { ...prev, admin_chat_created_notifications_enabled: e.target.checked }
                  : prev
              )
            }
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-600"
          />
        </label>

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {isSuperAdmin && (
        <div className="bg-zinc-900 border border-zinc-800/70 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Invite Admins</h2>
            <p className="text-gray-400 text-sm">Generate an invite link for a new admin.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'super_admin')}
              className="bg-zinc-800 text-white px-3 py-2 border border-zinc-700 text-sm"
            >
              <option value="admin">Admin</option>
              {canInviteSuper && <option value="super_admin">Super Admin</option>}
            </select>

            <button
              type="button"
              onClick={handleGenerateInvite}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 text-sm"
            >
              Generate Link
            </button>
          </div>

          {inviteUrl && (
            <div className="flex flex-col gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="w-full bg-zinc-800 text-white px-3 py-2 border border-zinc-700 text-sm"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="text-xs text-zinc-400 hover:text-white transition-colors self-start"
              >
                Copy link
              </button>
            </div>
          )}
        </div>
      )}

      {canManagePayout && (
        <div className="bg-zinc-900 border border-zinc-800/70 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Payout Settings</h2>
            <p className="text-gray-400 text-sm">Only the primary admin and super admins can update payouts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Provider</label>
              <input
                type="text"
                value={payoutSettings?.provider ?? ''}
                onChange={(e) =>
                  setPayoutSettings((prev) =>
                    prev ? { ...prev, provider: e.target.value } : prev
                  )
                }
                className="w-full bg-zinc-800 text-white px-4 py-2 border border-zinc-800/70"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Account Label</label>
              <input
                type="text"
                value={payoutSettings?.account_label ?? ''}
                onChange={(e) =>
                  setPayoutSettings((prev) =>
                    prev ? { ...prev, account_label: e.target.value } : prev
                  )
                }
                className="w-full bg-zinc-800 text-white px-4 py-2 border border-zinc-800/70"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Account Last 4</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={payoutSettings?.account_last4 ?? ''}
                onChange={(e) =>
                  setPayoutSettings((prev) =>
                    prev ? { ...prev, account_last4: e.target.value } : prev
                  )
                }
                className="w-full bg-zinc-800 text-white px-4 py-2 border border-zinc-800/70"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePayout}
            disabled={isSavingPayout}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isSavingPayout ? 'Saving...' : 'Save Payout Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
