// tests/unit/proxy/request-id.test.ts
import { describe, it, expect } from "@jest/globals";
import { generateRequestId, getRequestIdFromHeaders } from "@/lib/http/request-id";
import { security } from "@/config/security";

describe("Unit: Request ID Generation", () => {
  describe("generateRequestId", () => {
    it("generates a request ID", () => {
      const id = generateRequestId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("generates UUID format", () => {
      const id = generateRequestId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it("generates unique IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it("generates different IDs in loop", () => {
      const ids = Array.from({ length: 100 }, () => generateRequestId());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });
  });

  describe("getRequestIdFromHeaders", () => {
    it("extracts request ID from headers", () => {
      const requestId = "test-id-123";
      const headers = new Headers();
      headers.set(security.proxy.requestIdHeader, requestId);

      const result = getRequestIdFromHeaders(headers);
      expect(result).toBe(requestId);
    });

    it("generates new ID if header missing", () => {
      const headers = new Headers();
      const result = getRequestIdFromHeaders(headers);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("generates new ID if header empty", () => {
      const headers = new Headers();
      headers.set(security.proxy.requestIdHeader, "");

      const result = getRequestIdFromHeaders(headers);
      expect(result).toBeTruthy();
      expect(result).not.toBe("");
    });

    it("generates new ID if header whitespace", () => {
      const headers = new Headers();
      headers.set(security.proxy.requestIdHeader, "   ");

      const result = getRequestIdFromHeaders(headers);
      expect(result).toBeTruthy();
      expect(result.trim()).not.toBe("");
    });

    it("handles UUID in header", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const headers = new Headers();
      headers.set(security.proxy.requestIdHeader, uuid);

      const result = getRequestIdFromHeaders(headers);
      expect(result).toBe(uuid);
    });

    it("handles custom format ID", () => {
      const customId = "custom-request-id-12345";
      const headers = new Headers();
      headers.set(security.proxy.requestIdHeader, customId);

      const result = getRequestIdFromHeaders(headers);
      expect(result).toBe(customId);
    });
  });
});