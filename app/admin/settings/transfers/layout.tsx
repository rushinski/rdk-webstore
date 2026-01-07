import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";

export default async function TransfersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  if (!canViewBank(session.role)) {
    redirect("/admin/settings");
  }

  return children;
}
