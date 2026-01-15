// app/admin/nexus/page.tsx
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import NexusTrackerClient from "@/components/admin/nexus/NexusTrackerClient";

export const metadata = {
  title: "Sales Tax Nexus Tracker | Admin",
  description: "Monitor and manage sales tax obligations across US states",
};

export default async function NexusPage() {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-black">
      <AdminSidebar userEmail={session.user.email} role={session.role} />
      <main className="md:ml-64">
        <NexusTrackerClient />
      </main>
    </div>
  );
}
