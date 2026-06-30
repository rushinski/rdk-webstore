"use client";

import { useEffect, useState } from "react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { logError } from "@/lib/utils/log";
import { RdkSelect } from "@/components/ui/Select";
import {
  canInviteAdmins,
  isDevRole,
  isProfileRole,
  type ProfileRole,
} from "@/config/constants/roles";

type AdminProfile = {
  id: string;
  email: string | null;
  role: ProfileRole | null;
  is_primary_admin: boolean;
};

const alertStyles =
  "border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-text";

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [message, setMessage] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/admin/profile", { cache: "no-store" });
        const data = await response.json();
        setProfile(data.profile ?? null);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_profile" });
      }
    };

    loadProfile();
  }, []);

  const role = isProfileRole(profile?.role) ? profile.role : "customer";
  const canInvite = canInviteAdmins(role);
  const canInviteSuper = isDevRole(role);

  useEffect(() => {
    if (!canInviteSuper) {
      setInviteRole("admin");
    }
  }, [canInviteSuper]);

  const handleGenerateInvite = async () => {
    setInviteUrl("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error ?? "Failed to create invite.");
        return;
      }

      setInviteUrl(data.inviteUrl ?? "");
    } catch {
      setMessage("Failed to create invite.");
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invite link copied.");
    } catch {
      setMessage("Failed to copy invite link.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Your Admin Settings"
        description="Personal preferences for this admin account."
      />

      {message && <div className={alertStyles}>{message}</div>}

      {canInvite && (
        <AdminSectionCard>
          <div className="space-y-4 border border-brand-border bg-brand-surface p-5">
            <div>
              <h2 className="text-lg font-semibold text-brand-text">Invite Admins</h2>
              <p className="text-sm text-brand-muted">
                Generate an invite link for a new admin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <RdkSelect
                value={inviteRole}
                onChange={(value) => setInviteRole(value as "admin" | "super_admin")}
                options={[
                  { value: "admin", label: "Admin" },
                  ...(canInviteSuper
                    ? [{ value: "super_admin", label: "Super Admin" }]
                    : []),
                ]}
                className="min-w-[160px]"
                buttonClassName="px-3 py-2 text-sm"
                menuClassName="text-sm"
              />

              <button
                type="button"
                onClick={() => {
                  void handleGenerateInvite();
                }}
                className={adminButtonStyles.primary}
              >
                Generate Link
              </button>
            </div>

            {inviteUrl && (
              <div className="flex flex-col gap-2">
                <input readOnly value={inviteUrl} className={adminFormStyles.input} />
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyInvite();
                  }}
                  className="self-start text-xs text-brand-muted transition-colors hover:text-brand-text"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        </AdminSectionCard>
      )}
    </div>
  );
}
