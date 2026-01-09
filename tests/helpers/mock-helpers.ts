// tests/helpers/mock-helpers.ts
export function mockSuccessfulOAuthFlow() {
  return {
    user: {
      id: "oauth-user-123",
      email: "oauth@test.com",
      email_confirmed_at: new Date().toISOString(),
    },
    session: {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    },
  };
}

export function mockFailedOAuthFlow(error: string) {
  return {
    error: {
      message: error,
      status: 400,
    },
  };
}

export function mockTOTPSecret() {
  return {
    secret: "JBSWY3DPEHPK3PXP",
    qr_code: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIvPg==",
    uri: "otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP",
  };
}

export function mockEmailService() {
  const sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
  }> = [];
  
  return {
    sendEmail: async (to: string, subject: string, body: string) => {
      sentEmails.push({ to, subject, body });
      return true;
    },
    getSentEmails: () => sentEmails,
    clear: () => sentEmails.length = 0,
  };
}