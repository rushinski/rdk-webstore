// app/admin/layout.tsx
import { AdminLayoutShell } from "@/modules/app-shell/presentation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
