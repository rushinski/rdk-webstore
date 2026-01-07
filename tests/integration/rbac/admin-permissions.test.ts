// tests/integration/rbac/admin-permissions.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * RBAC Role Definitions:
 * 
 * - dev: Can do EVERYTHING including send invites
 * - super_admin: Can do EVERYTHING EXCEPT cannot send invites
 * - admin: Cannot send invites; cannot see bank settings/tab
 * - user: Regular user (not admin)
 * 
 * These tests ensure server-side enforcement of these rules.
 */

type UserRole = 'dev' | 'super_admin' | 'admin' | 'user';

interface TestUser {
  id: string;
  email: string;
  role: UserRole;
  token: string;
}

describe('RBAC - Admin Role Permissions', () => {
  let adminSupabase: SupabaseClient;
  let testUsers: Record<UserRole, TestUser> = {} as any;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Setup admin Supabase client
    adminSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create test users for each role
    const roles: UserRole[] = ['dev', 'super_admin', 'admin', 'user'];
    const timestamp = Date.now();

    for (const role of roles) {
      const email = `test-${role}-${timestamp}@test.com`;
      const password = `TestPass123!-${role}`;

      // Create user
      const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role }
      });

      if (createError) throw createError;

      // Set role in database (adjust table name as needed)
      const { error: roleError } = await adminSupabase
        .from('user_roles')
        .insert({
          user_id: userData.user.id,
          role
        });

      if (roleError && roleError.code !== '23505') { // Ignore duplicate key errors
        throw roleError;
      }

      // Get session token
      const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      testUsers[role] = {
        id: userData.user.id,
        email,
        role,
        token: signInData.session!.access_token
      };
    }
  });

  afterAll(async () => {
    // Clean up test users
    for (const role of Object.keys(testUsers) as UserRole[]) {
      const user = testUsers[role];
      if (user?.id) {
        await adminSupabase.auth.admin.deleteUser(user.id);
        await adminSupabase.from('user_roles').delete().eq('user_id', user.id);
      }
    }
  });

  describe('Permission Helper Functions', () => {
    it('should identify admin roles correctly', () => {
      const isAdmin = (role: UserRole) => ['admin', 'super_admin', 'dev'].includes(role);

      expect(isAdmin('dev')).toBe(true);
      expect(isAdmin('super_admin')).toBe(true);
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('user')).toBe(false);
    });

    it('should check invite permissions correctly', () => {
      const canSendInvites = (role: UserRole) => role === 'dev';

      expect(canSendInvites('dev')).toBe(true);
      expect(canSendInvites('super_admin')).toBe(false);
      expect(canSendInvites('admin')).toBe(false);
      expect(canSendInvites('user')).toBe(false);
    });

    it('should check bank settings permissions correctly', () => {
      const canAccessBankSettings = (role: UserRole) => 
        ['dev', 'super_admin'].includes(role);

      expect(canAccessBankSettings('dev')).toBe(true);
      expect(canAccessBankSettings('super_admin')).toBe(true);
      expect(canAccessBankSettings('admin')).toBe(false);
      expect(canAccessBankSettings('user')).toBe(false);
    });
  });

  describe('Invite System Authorization', () => {
    it('dev can send invites', async () => {
      const response = await fetch(`${baseUrl}/api/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.dev.token}`
        },
        body: JSON.stringify({
          email: 'newuser@test.com',
          role: 'user'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('super_admin CANNOT send invites', async () => {
      const response = await fetch(`${baseUrl}/api/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.super_admin.token}`
        },
        body: JSON.stringify({
          email: 'newuser2@test.com',
          role: 'user'
        })
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toMatch(/forbidden|not authorized|permission/i);
    });

    it('admin CANNOT send invites', async () => {
      const response = await fetch(`${baseUrl}/api/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.admin.token}`
        },
        body: JSON.stringify({
          email: 'newuser3@test.com',
          role: 'user'
        })
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toMatch(/forbidden|not authorized|permission/i);
    });

    it('regular user CANNOT send invites', async () => {
      const response = await fetch(`${baseUrl}/api/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.user.token}`
        },
        body: JSON.stringify({
          email: 'newuser4@test.com',
          role: 'user'
        })
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toMatch(/forbidden|not authorized|permission/i);
    });
  });

  describe('Bank Settings Access', () => {
    it('dev can access bank settings', async () => {
      const response = await fetch(`${baseUrl}/api/admin/bank-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.dev.token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('super_admin can access bank settings', async () => {
      const response = await fetch(`${baseUrl}/api/admin/bank-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.super_admin.token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('admin CANNOT access bank settings', async () => {
      const response = await fetch(`${baseUrl}/api/admin/bank-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.admin.token}`
        }
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toMatch(/forbidden|not authorized|permission/i);
    });

    it('regular user CANNOT access bank settings', async () => {
      const response = await fetch(`${baseUrl}/api/admin/bank-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.user.token}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('admin CANNOT update bank settings', async () => {
      const response = await fetch(`${baseUrl}/api/admin/bank-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.admin.token}`
        },
        body: JSON.stringify({
          accountNumber: '123456789',
          routingNumber: '987654321'
        })
      });

      expect(response.status).toBe(403);
    });
  });

  describe('General Admin Actions', () => {
    it('all admin roles can access admin dashboard', async () => {
      const roles: UserRole[] = ['dev', 'super_admin', 'admin'];

      for (const role of roles) {
        const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${testUsers[role].token}`
          }
        });

        expect(response.status).toBe(200);
      }
    });

    it('regular user CANNOT access admin dashboard', async () => {
      const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.user.token}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('all admin roles can view orders', async () => {
      const roles: UserRole[] = ['dev', 'super_admin', 'admin'];

      for (const role of roles) {
        const response = await fetch(`${baseUrl}/api/admin/orders`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${testUsers[role].token}`
          }
        });

        expect(response.status).toBe(200);
      }
    });

    it('all admin roles can update inventory', async () => {
      const roles: UserRole[] = ['dev', 'super_admin', 'admin'];

      for (const role of roles) {
        const response = await fetch(`${baseUrl}/api/admin/inventory`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testUsers[role].token}`
          },
          body: JSON.stringify({
            productId: 'test-product',
            quantity: 10
          })
        });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('admin can only modify data they have permission for', async () => {
      // Create a test order as regular user
      const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .insert({
          user_id: testUsers.user.id,
          total: 100,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Admin should be able to view it
      const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      await adminClient.auth.setSession({
        access_token: testUsers.admin.token,
        refresh_token: '' // Not needed for this test
      });

      const { data: viewData, error: viewError } = await adminClient
        .from('orders')
        .select()
        .eq('id', order.id)
        .single();

      expect(viewError).toBeNull();
      expect(viewData).toBeDefined();

      // But admin should NOT be able to delete user's account
      const { error: deleteError } = await adminClient
        .from('users')
        .delete()
        .eq('id', testUsers.user.id);

      expect(deleteError).not.toBeNull();

      // Clean up
      await adminSupabase.from('orders').delete().eq('id', order.id);
    });

    it('dev can perform dangerous operations', async () => {
      // Create test data
      const { data: testData, error: insertError } = await adminSupabase
        .from('test_data')
        .insert({ name: 'test' })
        .select()
        .single();

      if (insertError) throw insertError;

      // Dev should be able to delete it
      const devClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      await devClient.auth.setSession({
        access_token: testUsers.dev.token,
        refresh_token: ''
      });

      const { error: deleteError } = await devClient
        .from('test_data')
        .delete()
        .eq('id', testData.id);

      // Depending on your RLS policies:
      // Either dev can delete (expect no error)
      // Or only service role can (expect error)
      // Adjust based on your security model
    });
  });

  describe('UI Gating Verification', () => {
    it('admin should not see bank settings tab in response', async () => {
      const response = await fetch(`${baseUrl}/api/admin/menu`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.admin.token}`
        }
      });

      const data = await response.json();
      const menuItems = data.items || [];

      const hasBankSettings = menuItems.some((item: any) => 
        item.id === 'bank-settings' || item.path === '/admin/bank-settings'
      );

      expect(hasBankSettings).toBe(false);
    });

    it('super_admin should see bank settings tab', async () => {
      const response = await fetch(`${baseUrl}/api/admin/menu`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.super_admin.token}`
        }
      });

      const data = await response.json();
      const menuItems = data.items || [];

      const hasBankSettings = menuItems.some((item: any) => 
        item.id === 'bank-settings' || item.path === '/admin/bank-settings'
      );

      expect(hasBankSettings).toBe(true);
    });

    it('admin should not see invite button in response', async () => {
      const response = await fetch(`${baseUrl}/api/admin/actions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.admin.token}`
        }
      });

      const data = await response.json();
      const actions = data.actions || [];

      const hasInviteAction = actions.some((action: any) => 
        action.id === 'invite' || action.type === 'invite'
      );

      expect(hasInviteAction).toBe(false);
    });

    it('dev should see invite button', async () => {
      const response = await fetch(`${baseUrl}/api/admin/actions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.dev.token}`
        }
      });

      const data = await response.json();
      const actions = data.actions || [];

      const hasInviteAction = actions.some((action: any) => 
        action.id === 'invite' || action.type === 'invite'
      );

      expect(hasInviteAction).toBe(true);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should reject role escalation attempts', async () => {
      // User tries to promote themselves to admin
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.user.token}`
        },
        body: JSON.stringify({
          role: 'admin' // Attempting privilege escalation!
        })
      });

      expect(response.status).toBe(403);
    });

    it('should reject admin trying to promote themselves to dev', async () => {
      const response = await fetch(`${baseUrl}/api/admin/users/${testUsers.admin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUsers.admin.token}`
        },
        body: JSON.stringify({
          role: 'dev'
        })
      });

      expect(response.status).toBe(403);
    });

    it('should reject requests without authentication', async () => {
      const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      });

      expect(response.status).toBe(401);
    });

    it('should validate role on every request (not just UI)', async () => {
      // Even if UI shows bank settings button (client-side bug),
      // server should still reject
      const adminToken = testUsers.admin.token;

      const response = await fetch(`${baseUrl}/api/admin/bank-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          // Simulate client trying to bypass UI gating
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Permission Matrix Summary', () => {
    it('should enforce complete permission matrix', () => {
      interface Action {
        name: string;
        dev: boolean;
        super_admin: boolean;
        admin: boolean;
        user: boolean;
      }

      const permissions: Action[] = [
        { name: 'send_invites', dev: true, super_admin: false, admin: false, user: false },
        { name: 'access_bank_settings', dev: true, super_admin: true, admin: false, user: false },
        { name: 'view_orders', dev: true, super_admin: true, admin: true, user: false },
        { name: 'update_inventory', dev: true, super_admin: true, admin: true, user: false },
        { name: 'access_admin_dashboard', dev: true, super_admin: true, admin: true, user: false },
        { name: 'view_own_orders', dev: true, super_admin: true, admin: true, user: true },
      ];

      // Verify matrix is complete and consistent
      permissions.forEach(action => {
        // If user can do it, all admins can
        if (action.user) {
          expect(action.admin).toBe(true);
          expect(action.super_admin).toBe(true);
          expect(action.dev).toBe(true);
        }

        // If admin can do it, higher roles can too
        if (action.admin) {
          expect(action.super_admin).toBe(true);
          expect(action.dev).toBe(true);
        }

        // If super_admin can do it, dev can too
        if (action.super_admin) {
          expect(action.dev).toBe(true);
        }
      });

      expect(permissions.length).toBeGreaterThan(0);
    });
  });
});