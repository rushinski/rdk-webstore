// app/admin/nexus/page.tsx
import NexusTrackerClient from "@/components/admin/nexus/NexusTrackerClient";

export const metadata = {
  title: "Sales Tax Nexus Tracker | Admin",
  description: "Monitor and manage sales tax obligations across US states",
};

export default async function NexusPage() {
  return <NexusTrackerClient />;
}
