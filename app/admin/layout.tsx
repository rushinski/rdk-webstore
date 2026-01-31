// app/admin/layout.tsx
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const userEmail = session.user.email ?? session.profile?.email ?? null;

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile: Hidden sidebar by default, toggle with hamburger */}
      <AdminSidebar userEmail={userEmail} role={session.role} />

      <div className="flex-1 flex flex-col md:ml-64">
        <AdminTopbar />

        {/* CHANGED: Reduce mobile padding */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
