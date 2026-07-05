// app/admin/nexus/page.tsx
import { NexusTrackerClient } from "@/modules/nexus";

export const metadata = {
  title: "Sales Tax Nexus Tracker | Admin",
  description: "Monitor and manage sales tax obligations across US states",
};

export default function NexusPage() {
  return <NexusTrackerClient />;
}
