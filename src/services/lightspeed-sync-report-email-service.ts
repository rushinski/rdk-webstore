import { env } from "@/config/env";
import { sendEmailWithRetry } from "@/lib/email/mailer";
import { ProfileRepository } from "@/repositories/profile-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export class LightspeedSyncReportEmailService {
  private readonly profileRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.profileRepo = new ProfileRepository(supabase);
  }

  async sendFailureReport(input: {
    tenantId: string;
    syncRunId: string;
    failures: Array<{
      itemId: string;
      entityKey: string;
      reason: string;
    }>;
  }) {
    if (input.failures.length === 0) {
      return;
    }

    const admins = await this.profileRepo.listStaffProfiles();
    const recipients = admins
      .filter((admin) => admin.tenant_id === input.tenantId)
      .map((admin) => admin.email)
      .filter((email): email is string => Boolean(email?.trim()));

    if (recipients.length === 0) {
      return;
    }

    const textLines = [
      `Lightspeed sync run ${input.syncRunId} had ${input.failures.length} failure(s).`,
      "",
      ...input.failures.map(
        (failure) => `- ${failure.entityKey} (${failure.itemId}): ${failure.reason}`,
      ),
    ];

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827">
        <h1 style="font-size:18px">Lightspeed Sync Failures</h1>
        <p>Sync run <strong>${input.syncRunId}</strong> had ${input.failures.length} failure(s).</p>
        <ul>
          ${input.failures
            .map(
              (failure) =>
                `<li><strong>${failure.entityKey}</strong> (${failure.itemId}): ${failure.reason}</li>`,
            )
            .join("")}
        </ul>
      </div>
    `.trim();

    await Promise.all(
      recipients.map((to) =>
        sendEmailWithRetry(
          {
            to,
            subject: `Lightspeed sync failures (${input.failures.length})`,
            html,
            text: textLines.join("\n"),
            replyTo: env.SUPPORT_INBOX_EMAIL,
          },
          { maxAttempts: 3, baseDelayMs: 750, timeoutMs: 5000 },
        ),
      ),
    );
  }
}
