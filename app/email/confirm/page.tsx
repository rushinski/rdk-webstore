import { EmailConfirmPageContent } from "@/modules/marketing/presentation/public";

export default async function EmailConfirmPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string | string[] }>;
}) {
  return <EmailConfirmPageContent searchParams={searchParams} />;
}
