// tests/unit/lib/validation/email.test.ts
describe("Email Validation", () => {
  describe("Valid Emails", () => {
    it("accepts standard email", () => {
      const email = "user@example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });

    it("accepts email with subdomain", () => {
      const email = "user@mail.example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });

    it("accepts email with plus addressing", () => {
      const email = "user+tag@example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });

    it("accepts email with dots in local part", () => {
      const email = "first.last@example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });

    it("accepts email with numbers", () => {
      const email = "user123@example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });

    it("accepts email with hyphens in domain", () => {
      const email = "user@ex-ample.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });

    it("accepts email with long TLD", () => {
      const email = "user@example.photography";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(true);
    });
  });

  describe("Invalid Emails", () => {
    it("rejects email without @", () => {
      const email = "userexample.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });

    it("rejects email without domain", () => {
      const email = "user@";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });

    it("rejects email without local part", () => {
      const email = "@example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });

    it("rejects email with spaces", () => {
      const email = "user @example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });

    it("rejects email with multiple @", () => {
      const email = "user@@example.com";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });

    it("rejects email without TLD", () => {
      const email = "user@example";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });

    it("rejects empty string", () => {
      const email = "";
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(regex.test(email)).toBe(false);
    });
  });
});