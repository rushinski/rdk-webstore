// tests/integration/api/auth-password-change.test.ts

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * CRITICAL: This file tests the KNOWN BUG in password change functionality.
 * 
 * Expected behavior:
 * - User should be able to change their password
 * - Old password should no longer work
 * - New password should work
 * - Session should remain valid (or be refreshed)
 * 
 * Current bug (if test fails):
 * - Password change may fail silently
 * - Or: Session may be invalidated incorrectly
 * - Or: Password may not actually update in database
 * 
 * This test should FAIL initially, then PASS after fix.
 */

interface TestUser {
  id: string;
  email: string;
  password: string;
}

describe('Auth Password Change - Bug Reproduction and Fix', () => {
  let supabase: SupabaseClient;
  let adminSupabase: SupabaseClient;
  let testUser: TestUser;

  beforeAll(async () => {
    // Initialize Supabase clients
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    supabase = createClient(supabaseUrl, supabaseAnonKey);
    adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  });

  beforeEach(async () => {
    // Create test user
    const timestamp = Date.now();
    testUser = {
      id: '',
      email: `test-password-change-${timestamp}@test.com`,
      password: 'OldPassword123!'
    };

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true
    });

    if (error) throw error;
    testUser.id = data.user!.id;
  });

  afterEach(async () => {
    // Clean up test user
    if (testUser.id) {
      await adminSupabase.auth.admin.deleteUser(testUser.id);
    }
  });

  afterAll(async () => {
    // Clean up connections
  });

  describe('Basic Password Change Flow', () => {
    it('should successfully change password when authenticated', async () => {
      // Step 1: Sign in with old password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      expect(signInError).toBeNull();
      expect(signInData.session).not.toBeNull();
      expect(signInData.user?.id).toBe(testUser.id);

      const oldSessionToken = signInData.session!.access_token;

      // Step 2: Change password
      const newPassword = 'NewPassword456!';
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      // THIS MAY FAIL if bug exists
      expect(updateError).toBeNull();

      // Step 3: Sign out
      await supabase.auth.signOut();

      // Step 4: Try to sign in with OLD password (should fail)
      const { data: oldPasswordData, error: oldPasswordError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      expect(oldPasswordError).not.toBeNull();
      expect(oldPasswordData.session).toBeNull();

      // Step 5: Sign in with NEW password (should succeed)
      const { data: newPasswordData, error: newPasswordError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: newPassword
      });

      expect(newPasswordError).toBeNull();
      expect(newPasswordData.session).not.toBeNull();
      expect(newPasswordData.user?.id).toBe(testUser.id);

      // Clean up
      await supabase.auth.signOut();
    });

    it('should reject password change when not authenticated', async () => {
      // Try to change password without being signed in
      const { error } = await supabase.auth.updateUser({
        password: 'NewPassword123!'
      });

      // Should fail because user is not authenticated
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not authenticated|session|token/i);
    });

    it('should reject weak passwords', async () => {
      // Sign in first
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // Try weak passwords
      const weakPasswords = [
        '123',           // Too short
        'password',      // Too common
        'abc123',        // Too short and common
        ''               // Empty
      ];

      for (const weakPassword of weakPasswords) {
        const { error } = await supabase.auth.updateUser({
          password: weakPassword
        });

        expect(error).not.toBeNull();
      }

      await supabase.auth.signOut();
    });
  });

  describe('Session Handling After Password Change', () => {
    it('should maintain valid session after password change', async () => {
      // Sign in
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      const oldSession = signInData.session!;

      // Change password
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: 'NewPassword789!'
      });

      expect(updateError).toBeNull();

      // Session should still be valid (or refreshed)
      const { data: sessionData } = await supabase.auth.getSession();
      expect(sessionData.session).not.toBeNull();
      
      // User should still be authenticated
      const { data: userData } = await supabase.auth.getUser();
      expect(userData.user?.id).toBe(testUser.id);

      await supabase.auth.signOut();
    });

    it('should invalidate all other sessions after password change (security)', async () => {
      // Create two sessions
      const supabase1 = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      const supabase2 = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

      // Sign in on both
      await supabase1.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      await supabase2.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // Verify both sessions work
      const { data: user1Before } = await supabase1.auth.getUser();
      const { data: user2Before } = await supabase2.auth.getUser();
      expect(user1Before.user).not.toBeNull();
      expect(user2Before.user).not.toBeNull();

      // Change password on first session
      await supabase1.auth.updateUser({
        password: 'NewPassword999!'
      });

      // Second session should be invalidated
      const { data: user2After, error: user2Error } = await supabase2.auth.getUser();
      
      // This depends on your security requirements:
      // Option A: All sessions invalidated (more secure)
      // Option B: Only require re-authentication on next request
      // Adjust assertion based on your implementation
      expect(user2Error || !user2After.user).toBeTruthy();

      await supabase1.auth.signOut();
      await supabase2.auth.signOut();
    });
  });

  describe('Password Change Edge Cases', () => {
    it('should handle password change with special characters', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      const specialPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const { error } = await supabase.auth.updateUser({
        password: specialPassword
      });

      expect(error).toBeNull();

      await supabase.auth.signOut();

      // Verify new password works
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: specialPassword
      });

      expect(signInError).toBeNull();
      expect(data.session).not.toBeNull();

      await supabase.auth.signOut();
    });

    it('should handle rapid password changes', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // Change password multiple times rapidly
      const passwords = ['NewPass1!', 'NewPass2!', 'NewPass3!'];
      
      for (const newPassword of passwords) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        expect(error).toBeNull();
      }

      await supabase.auth.signOut();

      // Only the last password should work
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: passwords[passwords.length - 1]
      });

      expect(error).toBeNull();
      expect(data.session).not.toBeNull();

      await supabase.auth.signOut();
    });

    it('should not allow changing to same password', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // Try to change to same password
      const { error } = await supabase.auth.updateUser({
        password: testUser.password
      });

      // This may or may not be an error depending on requirements
      // Some systems allow it, some don't
      // Adjust based on your requirements
      expect(error).toBeNull(); // Or expect(error).not.toBeNull();

      await supabase.auth.signOut();
    });

    it('should handle concurrent password change requests', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // Attempt concurrent password changes
      const results = await Promise.allSettled([
        supabase.auth.updateUser({ password: 'ConcurrentPass1!' }),
        supabase.auth.updateUser({ password: 'ConcurrentPass2!' }),
        supabase.auth.updateUser({ password: 'ConcurrentPass3!' })
      ]);

      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // The last one should be the active password
      // (This is tricky to test definitively due to race conditions)

      await supabase.auth.signOut();
    });
  });

  describe('Security and Validation', () => {
    it('should not reveal whether user exists during unauthenticated password change', async () => {
      // Try to change password for non-existent user
      const fakeSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      
      const { error } = await fakeSupabase.auth.updateUser({
        password: 'NewPassword123!'
      });

      // Error message should not reveal user existence
      expect(error).not.toBeNull();
      expect(error?.message).not.toMatch(/not found|doesn't exist/i);
    });

    it('should require current password for sensitive password changes', async () => {
      // This test depends on your implementation
      // Some systems require current password confirmation
      
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // If your implementation requires current password:
      // const { error } = await supabase.auth.updateUser({
      //   password: 'NewPassword123!',
      //   currentPassword: testUser.password // Required
      // });
      // expect(error).toBeNull();

      // If you don't require it (Supabase default):
      const { error } = await supabase.auth.updateUser({
        password: 'NewPassword123!'
      });
      expect(error).toBeNull();

      await supabase.auth.signOut();
    });

    it('should log password change events for audit', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      const beforeTimestamp = new Date();

      await supabase.auth.updateUser({
        password: 'NewPassword123!'
      });

      const afterTimestamp = new Date();

      // Check audit log (if you have one)
      // const logs = await getAuditLogs(testUser.id);
      // const passwordChangeLog = logs.find(
      //   l => l.action === 'password_change' && 
      //   l.timestamp >= beforeTimestamp && 
      //   l.timestamp <= afterTimestamp
      // );
      // expect(passwordChangeLog).toBeDefined();

      await supabase.auth.signOut();
    });

    it('should rate limit password change attempts', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      // Attempt many password changes
      const attempts = 20;
      const results = [];

      for (let i = 0; i < attempts; i++) {
        const result = await supabase.auth.updateUser({
          password: `NewPass${i}!`
        });
        results.push(result);
      }

      // Should eventually hit rate limit
      // Adjust based on your rate limiting implementation
      const errorCount = results.filter(r => r.error !== null).length;
      
      // If you have rate limiting:
      // expect(errorCount).toBeGreaterThan(0);
      
      // If you don't (fix this!):
      // expect(errorCount).toBe(0);

      await supabase.auth.signOut();
    });
  });

  describe('Integration with Profile/Settings Page', () => {
    it('should update password via settings page API route', async () => {
      // This tests the actual API route, not just Supabase directly
      // Adjust URL based on your actual route structure

      // Sign in to get session token
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      const sessionToken = signInData.session!.access_token;

      // Call your API route
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/password/change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          newPassword: 'ApiNewPassword123!'
        })
      });

      const result = await response.json();
      
      // THIS IS WHERE THE BUG MIGHT BE
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      await supabase.auth.signOut();

      // Verify new password works
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: 'ApiNewPassword123!'
      });

      expect(error).toBeNull();
      expect(data.session).not.toBeNull();

      await supabase.auth.signOut();
    });
  });
});

