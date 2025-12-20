// src/components/account/AccountProfile.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ShippingProfile } from '@/types/views/shipping'; 
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function AccountProfile({ userEmail }: { userEmail: string }) {
  const [profile, setProfile] = useState<Partial<ShippingProfile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/account/shipping');
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Load profile error:', error);
    }
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/account/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setMessage('Shipping info saved successfully!');
      } else {
        setMessage('Failed to save shipping info');
      }
    } catch (error) {
      setMessage('Error saving shipping info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage('Failed to change password: ' + error.message);
      } else {
        setMessage('Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setMessage('Error changing password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

      {message && (
        <div className={`mb-6 p-4 rounded ${
          message.includes('success') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {/* Email (Read-only) */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Email</h2>
        <p className="text-gray-400">{userEmail}</p>
        <p className="text-gray-500 text-sm mt-2">Email changes are not currently supported</p>
      </div>

      {/* Shipping Info */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Shipping Information</h2>
        <form onSubmit={handleSaveShipping} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Full Name</label>
            <input
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Address Line 1</label>
            <input
              type="text"
              value={profile.address_line1 || ''}
              onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Address Line 2</label>
            <input
              type="text"
              value={profile.address_line2 || ''}
              onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">City</label>
              <input
                type="text"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">State</label>
              <input
                type="text"
                value={profile.state || ''}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Postal Code</label>
              <input
                type="text"
                value={profile.postal_code || ''}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Country</label>
              <input
                type="text"
                value={profile.country || ''}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isLoading ? 'Saving...' : 'Save Shipping Info'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded border border-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}