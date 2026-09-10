import http from 'http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { UserRole, InvitationStatus } from '@ontime/shared';
import apiRouter from '../routes/index';
import { errorResponse, successResponse } from '../utils/response';
import {
  requireDistributorAdmin,
  requireOrganisationAdmin,
  requireOrganisationUser,
} from '../middleware/rbac.middleware';
import { scopeToOrganisation } from '../middleware/organisation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';

// Construct test Express app with test routes before 404 handler
const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRouter);

// Add test-only RBAC & scoping routes
app.get(
  '/api/test/distributor-only',
  authMiddleware,
  requireDistributorAdmin,
  (_req: Request, res: Response) => {
    successResponse(res, 'Distributor admin access granted', { allowed: true });
  },
);

app.get(
  '/api/test/org-admin-only',
  authMiddleware,
  requireOrganisationAdmin,
  (_req: Request, res: Response) => {
    successResponse(res, 'Organisation admin access granted', { allowed: true });
  },
);

app.get(
  '/api/test/org-user-only',
  authMiddleware,
  requireOrganisationUser,
  scopeToOrganisation,
  (req: Request, res: Response) => {
    successResponse(res, 'Organisation user access granted', {
      scopedOrgId: req.scopedOrganisationId,
    });
  },
);

// 404 handler
app.use((_req: Request, res: Response) => {
  errorResponse(res, 'Route not found', 404);
});

let server: http.Server;
let baseUrl: string;

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address() as { port: number };
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function request(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {},
): Promise<{ status: number; body: any }> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  };

  const res = await fetch(url, fetchOptions);

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Authentication & Authorization Test Suite ---\n');
  await startServer();

  try {
    // Ensure clean state for invitation, password reset & self-registration tests
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'newstaff@apexretailers.com',
            'dynamicorgadmin@apexretailers.com',
            'selfregistered@zenithstore.com',
          ],
        },
      },
    });
    await prisma.organisation.deleteMany({
      where: { email: 'selfregistered@zenithstore.com' },
    });
    await prisma.organisationInvitation.deleteMany({
      where: { email: 'dynamicorgadmin@apexretailers.com' },
    });
    await prisma.organisationInvitation.updateMany({
      where: { token: 'invite-test-token-apex-staff-2026' },
      data: { status: InvitationStatus.PENDING, acceptedAt: null },
    });

    // Reset default seed account passwords to ensure test suite idempotency
    const defaultPasswordHash = await hashPassword('Password123!');
    await prisma.user.updateMany({
      where: {
        email: {
          in: ['admin@ontime.com', 'admin@apexretailers.com', 'staff@apexretailers.com'],
        },
      },
      data: { passwordHash: defaultPasswordHash },
    });

    // ── Test 1: Health Check ───────────────────────────────
    console.log('Test 1: Health check');
    const health = await request('/api/v1/health');
    assert(health.status === 200, `Health status 200, got ${health.status}`);
    assert(health.body.success === true, 'Health body success');
    console.log('  ✔ Health check passed\n');

    // ── Test 2: Distributor Admin Login ────────────────────
    console.log('Test 2: Distributor Admin Login');
    const distLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@ontime.com', password: 'Password123!' },
    });
    assert(distLogin.status === 200, `Login status 200, got ${distLogin.status}`);
    assert(
      distLogin.body.data.user.role === UserRole.DISTRIBUTOR_ADMIN,
      'Role is DISTRIBUTOR_ADMIN',
    );
    assert(distLogin.body.data.user.organisationId === null, 'Distributor organisationId is null');
    assert(!!distLogin.body.data.tokens.accessToken, 'Access token is present');
    assert(!!distLogin.body.data.tokens.refreshToken, 'Refresh token is present');
    const distAccessToken = distLogin.body.data.tokens.accessToken;
    const distRefreshToken = distLogin.body.data.tokens.refreshToken;
    console.log('  ✔ Distributor Admin login passed\n');

    // ── Test 3: Organisation Admin Login ───────────────────
    console.log('Test 3: Organisation Admin Login (Customer Admin)');
    const orgAdminLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@apexretailers.com', password: 'Password123!' },
    });
    assert(orgAdminLogin.status === 200, `Login status 200, got ${orgAdminLogin.status}`);
    assert(
      orgAdminLogin.body.data.user.role === UserRole.ORGANISATION_ADMIN,
      'Role is ORGANISATION_ADMIN',
    );
    assert(
      typeof orgAdminLogin.body.data.user.organisationId === 'string',
      'organisationId is string',
    );
    assert(
      orgAdminLogin.body.data.organisation?.name === 'Apex Retailers Ltd',
      'Organisation populated',
    );
    const orgAdminAccessToken = orgAdminLogin.body.data.tokens.accessToken;
    console.log('  ✔ Organisation Admin login passed\n');

    // ── Test 4: Organisation Staff Login ───────────────────
    console.log('Test 4: Organisation Staff Login (Customer Staff)');
    const orgStaffLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'staff@apexretailers.com', password: 'Password123!' },
    });
    assert(orgStaffLogin.status === 200, `Login status 200, got ${orgStaffLogin.status}`);
    assert(
      orgStaffLogin.body.data.user.role === UserRole.ORGANISATION_STAFF,
      'Role is ORGANISATION_STAFF',
    );
    assert(
      typeof orgStaffLogin.body.data.user.organisationId === 'string',
      'organisationId is string',
    );
    const orgStaffAccessToken = orgStaffLogin.body.data.tokens.accessToken;
    console.log('  ✔ Organisation Staff login passed\n');

    // ── Test 5: GET /auth/me with Bearer Token ──────────────
    console.log('Test 5: GET /api/v1/auth/me Profile verification');
    const meRes = await request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${orgAdminAccessToken}` },
    });
    assert(meRes.status === 200, `Me status 200, got ${meRes.status}`);
    assert(meRes.body.data.user.email === 'admin@apexretailers.com', 'Me email matches');
    assert(meRes.body.data.organisation.name === 'Apex Retailers Ltd', 'Me organisation matches');
    console.log('  ✔ Profile verification passed\n');

    // ── Test 6: Token Refresh Flow ─────────────────────────
    console.log('Test 6: POST /api/v1/auth/refresh Token Refresh Flow');
    const refreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: distRefreshToken },
    });
    assert(refreshRes.status === 200, `Refresh status 200, got ${refreshRes.status}`);
    assert(!!refreshRes.body.data.tokens.accessToken, 'New access token issued');
    assert(!!refreshRes.body.data.tokens.refreshToken, 'New refresh token issued');
    const newDistRefreshToken = refreshRes.body.data.tokens.refreshToken;

    // Verify that the OLD refresh token was revoked (token rotation)
    const oldRefreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: distRefreshToken },
    });
    assert(
      oldRefreshRes.status === 401,
      `Old refresh token should be 401, got ${oldRefreshRes.status}`,
    );
    console.log('  ✔ Token refresh & rotation passed\n');

    // ── Test 7: Logout Flow & Revocation ───────────────────
    console.log('Test 7: POST /api/v1/auth/logout Flow');
    const logoutRes = await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${distAccessToken}` },
      body: { refreshToken: newDistRefreshToken },
    });
    assert(logoutRes.status === 200, `Logout status 200, got ${logoutRes.status}`);

    const revokedRefreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: newDistRefreshToken },
    });
    assert(
      revokedRefreshRes.status === 401,
      `Revoked token should be 401, got ${revokedRefreshRes.status}`,
    );
    console.log('  ✔ Logout & token revocation passed\n');

    // ── Test 8: Invalid Credentials & Unauthorized Handlers ─
    console.log('Test 8: Error handling & validation');
    const wrongPass = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@ontime.com', password: 'WrongPassword!' },
    });
    assert(wrongPass.status === 401, `Wrong password should be 401, got ${wrongPass.status}`);

    const missingAuth = await request('/api/v1/auth/me');
    assert(missingAuth.status === 401, `Missing auth should be 401, got ${missingAuth.status}`);

    const invalidAuth = await request('/api/v1/auth/me', {
      headers: { Authorization: 'Bearer invalid.token.signature' },
    });
    assert(invalidAuth.status === 401, `Invalid token should be 401, got ${invalidAuth.status}`);
    console.log('  ✔ Error handling passed\n');

    // ── Test 9: Role-Based Access Control (RBAC) ────────────
    console.log('Test 9: RBAC Guard Enforcement');
    // Distributor-only route
    const distOnDistRoute = await request('/api/test/distributor-only', {
      headers: { Authorization: `Bearer ${distAccessToken}` },
    });
    assert(distOnDistRoute.status === 200, 'Distributor admin can access distributor-only route');

    const orgAdminOnDistRoute = await request('/api/test/distributor-only', {
      headers: { Authorization: `Bearer ${orgAdminAccessToken}` },
    });
    assert(
      orgAdminOnDistRoute.status === 403,
      'Org Admin is forbidden (403) on distributor-only route',
    );

    const orgStaffOnDistRoute = await request('/api/test/distributor-only', {
      headers: { Authorization: `Bearer ${orgStaffAccessToken}` },
    });
    assert(
      orgStaffOnDistRoute.status === 403,
      'Org Staff is forbidden (403) on distributor-only route',
    );

    // Org-Admin-only route
    const orgAdminOnOrgAdminRoute = await request('/api/test/org-admin-only', {
      headers: { Authorization: `Bearer ${orgAdminAccessToken}` },
    });
    assert(orgAdminOnOrgAdminRoute.status === 200, 'Org Admin can access org-admin route');

    const orgStaffOnOrgAdminRoute = await request('/api/test/org-admin-only', {
      headers: { Authorization: `Bearer ${orgStaffAccessToken}` },
    });
    assert(
      orgStaffOnOrgAdminRoute.status === 403,
      'Org Staff is forbidden (403) on org-admin route',
    );

    console.log('  ✔ RBAC role guards verified across all 3 roles\n');

    // ── Test 10: Multi-Tenant Organisation Scoping ──────────
    console.log('Test 10: Multi-Tenant Organisation Scoping');
    const orgUserScoped = await request('/api/test/org-user-only', {
      headers: { Authorization: `Bearer ${orgStaffAccessToken}` },
    });
    assert(orgUserScoped.status === 200, `Org User scoped status 200, got ${orgUserScoped.status}`);
    assert(
      typeof orgUserScoped.body.data.scopedOrgId === 'string',
      'Scoped organisationId injected correctly',
    );
    console.log('  ✔ Organisation scoping middleware verified\n');

    // ── Test 11: Invitation Verification & Acceptance ───────
    console.log('Test 11: Invitation Verification & Acceptance Flow');
    const inviteVerify = await request(
      '/api/v1/auth/invite/verify?token=invite-test-token-apex-staff-2026',
    );
    assert(inviteVerify.status === 200, `Invite verify status 200, got ${inviteVerify.status}`);
    assert(inviteVerify.body.data.email === 'newstaff@apexretailers.com', 'Invite email verified');
    assert(
      inviteVerify.body.data.organisationName === 'Apex Retailers Ltd',
      'Invite organisation name verified',
    );

    // Accept invitation
    const inviteAccept = await request('/api/v1/auth/invite/accept', {
      method: 'POST',
      body: {
        token: 'invite-test-token-apex-staff-2026',
        name: 'Emma New Staff',
        password: 'Password123!',
        mobile: '+91 9988776655',
      },
    });
    assert(inviteAccept.status === 201, `Invite accept status 201, got ${inviteAccept.status}`);
    assert(
      inviteAccept.body.data.user.email === 'newstaff@apexretailers.com',
      'New user email matches',
    );
    assert(
      inviteAccept.body.data.user.role === UserRole.ORGANISATION_STAFF,
      'New user role is ORGANISATION_STAFF',
    );
    assert(!!inviteAccept.body.data.tokens.accessToken, 'Immediate access token issued');

    // Login with the newly registered user
    const newStaffLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'newstaff@apexretailers.com', password: 'Password123!' },
    });
    assert(newStaffLogin.status === 200, `New staff login status 200, got ${newStaffLogin.status}`);
    console.log('  ✔ Invitation verification & acceptance onboarding passed\n');

    // ── Test 12: Change Password Flow ───────────────────────
    console.log('Test 12: Change Password Flow');
    const changePass = await request('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgStaffAccessToken}` },
      body: {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!',
      },
    });
    assert(changePass.status === 200, `Change password status 200, got ${changePass.status}`);

    // Verify login with new password
    const newPassLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'staff@apexretailers.com', password: 'NewPassword123!' },
    });
    assert(newPassLogin.status === 200, 'Login with new password succeeded');

    // Revert password back
    const revertPass = await request('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPassLogin.body.data.tokens.accessToken}` },
      body: {
        currentPassword: 'NewPassword123!',
        newPassword: 'Password123!',
      },
    });
    assert(revertPass.status === 200, 'Reverted password back to default');
    console.log('  ✔ Change password flow verified\n');

    // ── Test 13: Dynamic Invitation Creation & Onboarding ───
    console.log('Test 13: Dynamic Invitation Creation (POST /api/v1/users/invite)');

    // Staff cannot invite
    const staffInvite = await request('/api/v1/users/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgStaffAccessToken}` },
      body: {
        email: 'stafftryingtoinvite@apexretailers.com',
        role: UserRole.ORGANISATION_STAFF,
      },
    });
    assert(staffInvite.status === 403, 'Staff user should be forbidden (403) from inviting');

    // Distributor admin invites a new Org Admin for an organisation
    const apexOrg = await prisma.organisation.findFirst({ where: { name: 'Apex Retailers Ltd' } });
    assert(!!apexOrg, 'Apex organisation exists in DB');

    const distDynamicInvite = await request('/api/v1/users/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${distAccessToken}` },
      body: {
        email: 'dynamicorgadmin@apexretailers.com',
        role: UserRole.ORGANISATION_ADMIN,
        organisationId: apexOrg!.id,
      },
    });
    assert(distDynamicInvite.status === 201, `Distributor invite status 201, got ${distDynamicInvite.status}`);
    const generatedToken = distDynamicInvite.body.data.invitation.token;
    assert(typeof generatedToken === 'string' && generatedToken.length > 20, 'Generated crypto token exists');
    assert(distDynamicInvite.body.data.invitation.role === UserRole.ORGANISATION_ADMIN, 'Role is ORGANISATION_ADMIN');
    assert(distDynamicInvite.body.data.invitation.organisationId === apexOrg!.id, 'Organisation ID matches');

    // Verify the dynamically created invitation token
    const verifyDynamic = await request(`/api/v1/auth/invite/verify?token=${generatedToken}`);
    assert(verifyDynamic.status === 200, 'Dynamic invite verification succeeded');
    assert(verifyDynamic.body.data.email === 'dynamicorgadmin@apexretailers.com', 'Invite email verified');
    assert(verifyDynamic.body.data.organisationName === 'Apex Retailers Ltd', 'Organisation name matches');

    // Accept the dynamic invitation
    const acceptDynamic = await request('/api/v1/auth/invite/accept', {
      method: 'POST',
      body: {
        token: generatedToken,
        name: 'Dynamic Org Admin',
        password: 'Password123!',
        mobile: '+91 9123456780',
      },
    });
    assert(acceptDynamic.status === 201, `Accept dynamic invite status 201, got ${acceptDynamic.status}`);
    assert(acceptDynamic.body.data.user.email === 'dynamicorgadmin@apexretailers.com', 'Created user email matches');
    assert(acceptDynamic.body.data.user.role === UserRole.ORGANISATION_ADMIN, 'Created user role is ORGANISATION_ADMIN');
    assert(!!acceptDynamic.body.data.tokens.accessToken, 'Access token returned on dynamic onboarding');

    // Login with the newly registered dynamic org admin
    const dynamicAdminLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'dynamicorgadmin@apexretailers.com', password: 'Password123!' },
    });
    assert(dynamicAdminLogin.status === 200, 'Login with dynamic org admin succeeded');

    // ── Test 14: Forgot Password & Reset Password Flow ───────
    console.log('Test 14: Forgot Password & Reset Password Flow');

    // 14a. Request forgot password for existing user
    const forgotRes = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'admin@apexretailers.com' },
    });
    assert(forgotRes.status === 200, `Forgot password status 200, got ${forgotRes.status}`);
    assert(!!forgotRes.body.data.resetToken, 'Development reset token returned');
    const resetToken = forgotRes.body.data.resetToken;

    // 14b. Request forgot password for non-existing user (enumeration prevention - still returns 200)
    const forgotNonExistent = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nonexistent@example.com' },
    });
    assert(forgotNonExistent.status === 200, 'Non-existent email also returns 200 for security');

    // 14c. Reset password using valid token
    const resetRes = await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken,
        newPassword: 'ResetPassword123!',
      },
    });
    assert(resetRes.status === 200, `Reset password status 200, got ${resetRes.status}`);

    // 14d. Attempt to reuse the same reset token (should fail 400)
    const reuseResetRes = await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken,
        newPassword: 'AnotherPassword123!',
      },
    });
    assert(reuseResetRes.status === 400, 'Reused reset token should be rejected (400)');

    // 14e. Log in with the new password
    const resetLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@apexretailers.com', password: 'ResetPassword123!' },
    });
    assert(resetLoginRes.status === 200, 'Login with new reset password succeeded');

    // 14f. Revert password back to original 'Password123!'
    const revertResetPass = await request('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resetLoginRes.body.data.tokens.accessToken}` },
      body: {
        currentPassword: 'ResetPassword123!',
        newPassword: 'Password123!',
      },
    });
    assert(revertResetPass.status === 200, 'Reverted password back to default');

    console.log('  ✔ Forgot password, single-use token validation, reset & login passed\n');

    // ── Test 15: Retailer Self-Registration Flow ─────────────
    console.log('Test 15: Retailer Self-Registration Flow (POST /api/v1/auth/register)');

    // 15a. Register a new retailer with full business & personal details
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'Alex Retailer',
        email: 'selfregistered@zenithstore.com',
        mobile: '+91 9123498765',
        businessName: 'Zenith Retail Stores',
        address: '45 Market Avenue, High Street',
        taxNumber: 'GSTIN27ZENITH1234Z9',
        password: 'SecurePassword123!',
      },
    });
    assert(registerRes.status === 201, `Register status 201, got ${registerRes.status}`);
    assert(
      registerRes.body.data.user.role === UserRole.ORGANISATION_ADMIN,
      'Self-registered role is ORGANISATION_ADMIN',
    );
    assert(
      registerRes.body.data.organisation.name === 'Zenith Retail Stores',
      'Organisation name matches',
    );
    assert(
      registerRes.body.data.organisation.taxNumber === 'GSTIN27ZENITH1234Z9',
      'Tax number matches',
    );
    assert(
      typeof registerRes.body.data.user.organisationId === 'string',
      'Organisation ID assigned',
    );
    assert(!!registerRes.body.data.tokens.accessToken, 'Access token returned on registration');
    assert(!!registerRes.body.data.tokens.refreshToken, 'Refresh token returned on registration');

    // 15b. Attempt duplicate registration with same email (should fail 409)
    const duplicateRegisterRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'Another User',
        email: 'selfregistered@zenithstore.com',
        businessName: 'Duplicate Store',
        password: 'AnotherPassword123!',
      },
    });
    assert(
      duplicateRegisterRes.status === 409,
      `Duplicate registration should return 409, got ${duplicateRegisterRes.status}`,
    );

    // 15c. Log in with the newly self-registered account
    const selfRegLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'selfregistered@zenithstore.com', password: 'SecurePassword123!' },
    });
    assert(selfRegLogin.status === 200, 'Login with self-registered account succeeded');
    assert(
      selfRegLogin.body.data.organisation.name === 'Zenith Retail Stores',
      'Logged-in organisation details match',
    );

    console.log('  ✔ Retailer self-registration, conflict prevention & login passed\n');

    console.log('===========================================================');
    console.log('🎉 ALL 15 AUTHENTICATION & AUTHORIZATION TESTS PASSED! 🎉');
    console.log('===========================================================\n');
  } finally {
    await stopServer();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

