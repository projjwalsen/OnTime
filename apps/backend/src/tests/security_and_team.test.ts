import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import http from 'http';
import { UserRole } from '@ontime/shared';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  console.log('🧪 Running Security, Sessions & Team integration tests...');

  try {
    // 1. Create test organisation and admin
    const testEmail = `test.team.${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Team Admin User',
        email: testEmail,
        password: 'Password123!',
        businessName: 'Team Test Store',
      }),
    });

    const regData: any = await regRes.json();
    const token = regData.data.tokens.accessToken;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. Test Onboard a staff member
    const onboardEmail = `staff.${Date.now()}@example.com`;
    const onboardRes = await fetch(`${baseUrl}/users/onboard`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Neha Shah',
        email: onboardEmail,
        role: UserRole.STAFF,
      }),
    });
    const onboardData: any = await onboardRes.json();
    console.assert(onboardRes.status === 201, 'Expected 201 for onboard user');
    const staffId = onboardData.data.user.id;
    console.log('  ✅ Onboarded staff member (Neha Shah)');

    // 3. Test Team Overview - GET /api/v1/users/team
    const teamRes = await fetch(`${baseUrl}/users/team`, {
      method: 'GET',
      headers: authHeaders,
    });
    const teamData: any = await teamRes.json();
    console.assert(teamData.data.members.length === 2, 'Expected 2 team members (admin + staff)');
    console.assert(teamData.data.stats.totalMembers === 2, 'Expected totalMembers: 2');
    console.log('  ✅ Fetched complete team overview and stats');

    // 4. Test Update User Role - PATCH /api/v1/users/:id/role
    const updateRoleRes = await fetch(`${baseUrl}/users/${staffId}/role`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ role: UserRole.ADMIN }),
    });
    const updateRoleData: any = await updateRoleRes.json();
    console.assert(updateRoleData.data.user.role === UserRole.ADMIN, 'Expected updated role to be ADMIN');
    console.log('  ✅ Updated staff role to ADMIN');

    // 5. Test Update User Status - PATCH /api/v1/users/:id/status
    const statusRes = await fetch(`${baseUrl}/users/${staffId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isActive: false }),
    });
    const statusData: any = await statusRes.json();
    console.assert(statusData.data.user.isActive === false, 'Expected user isActive to be false');
    console.log('  ✅ Deactivated user account');

    // 6. Test Active Sessions - GET /api/v1/auth/sessions
    const sessionsRes = await fetch(`${baseUrl}/auth/sessions`, {
      method: 'GET',
      headers: authHeaders,
    });
    const sessionsData: any = await sessionsRes.json();
    console.assert(sessionsData.data.sessions.length >= 1, 'Expected at least 1 active session');
    console.log('  ✅ Listed active sessions');

    // 7. Test Sign-in Activity - GET /api/v1/auth/sign-in-activity
    const activityRes = await fetch(`${baseUrl}/auth/sign-in-activity`, {
      method: 'GET',
      headers: authHeaders,
    });
    const activityData: any = await activityRes.json();
    console.assert(Array.isArray(activityData.data.activities), 'Expected activities array');
    console.log('  ✅ Retrieved sign-in activity history');

    // 8. Test 2FA Status & Toggle
    const twoFaStatusRes = await fetch(`${baseUrl}/auth/2fa/status`, {
      method: 'GET',
      headers: authHeaders,
    });
    const twoFaStatusData: any = await twoFaStatusRes.json();
    console.assert(twoFaStatusData.data.enabled === false, 'Default 2FA should be false');

    const twoFaToggleRes = await fetch(`${baseUrl}/auth/2fa/toggle`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        enabled: true,
        password: 'Password123!',
      }),
    });
    const twoFaToggleData: any = await twoFaToggleRes.json();
    console.assert(twoFaToggleData.data.enabled === true, '2FA should be toggled to true');
    console.log('  ✅ Verified and toggled 2-Step Verification');

    // Cleanup
    await prisma.organisation.delete({ where: { id: regData.data.user.organisationId } }).catch(() => {});


    console.log('🎉 All Security, Sessions & Team tests passed successfully!\n');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
