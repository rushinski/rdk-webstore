import { AdminSidebar } from "@/components/admin/shell/AdminSidebar";
import { AdminTopbar } from "@/components/admin/shell/AdminTopbar";
import { requireAdmin } from "@/lib/auth/session";

export async function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const userEmail = session.user.email ?? session.profile?.email ?? null;

  return (
    <div className="min-h-screen bg-brand-page">
      <AdminSidebar userEmail={userEmail} role={session.role} />

      <div className="flex-1 flex flex-col md:ml-64">
        <AdminTopbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
