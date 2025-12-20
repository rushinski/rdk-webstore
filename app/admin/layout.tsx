
// app/admin/layout.tsx

import { requireAdmin } from '@/services/session-service';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-black">
      <AdminSidebar />
      <div className="flex-1">
        <AdminTopbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}