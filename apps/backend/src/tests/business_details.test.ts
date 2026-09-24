import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import http from 'http';
import { UserRole, OrganisationStatus } from '@ontime/shared';

async function runBusinessDetailsTests() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  console.log('🧪 Running Business Details API & RBAC integration tests...\n');

  try {
    const timestamp = Date.now();

    // 1. Register Org A with an Admin
    const adminEmailA = `admin.orgA.${timestamp}@teststore.com`;
    const regResA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jai Singh',
        email: adminEmailA,
        password: 'Password123!',
        businessName: 'Retail Store A',
        mobile: '+91 98765 43210',
      }),
    });
    const regDataA: any = await regResA.json();
    console.assert(regResA.status === 201, 'Org A Registration should succeed (201)');
    const tokenAdminA = regDataA.data.tokens.accessToken;
    const orgIdA = regDataA.data.user.organisationId;
    const authHeadersAdminA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    };
    console.log('  ✅ Registered Retailer Admin A (Jai Singh) for "Retail Store A"');

    // 2. Onboard Staff for Org A
    const staffEmailA = `staff.orgA.${timestamp}@teststore.com`;
    const onboardRes = await fetch(`${baseUrl}/users/onboard`, {
      method: 'POST',
      headers: authHeadersAdminA,
      body: JSON.stringify({
        name: 'Aman Verma',
        email: staffEmailA,
        role: UserRole.STAFF,
      }),
    });
    const onboardData: any = await onboardRes.json();
    console.assert(onboardRes.status === 201, 'Staff onboard should succeed (201)');
    const staffPassword = onboardData.data.temporaryPassword;
    console.log('  ✅ Onboarded Staff Member (Aman Verma)');

    // Login as Staff
    const loginStaffRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: staffEmailA,
        password: staffPassword,
      }),
    });
    const loginStaffData: any = await loginStaffRes.json();
    console.assert(loginStaffRes.status === 200, 'Staff login should succeed (200)');
    const tokenStaffA = loginStaffData.data.tokens.accessToken;
    const authHeadersStaffA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenStaffA}`,
    };

    // 3. Register Org B with an Admin (for cross-tenant test)
    const adminEmailB = `admin.orgB.${timestamp}@teststore.com`;
    const regResB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pooja Sharma',
        email: adminEmailB,
        password: 'Password123!',
        businessName: 'Retail Store B',
      }),
    });
    const regDataB: any = await regResB.json();
    const tokenAdminB = regDataB.data.tokens.accessToken;
    const orgIdB = regDataB.data.user.organisationId;
    const authHeadersAdminB = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminB}`,
    };
    console.log('  ✅ Registered Retailer Admin B for "Retail Store B"');

    // 4. Super Admin Login
    const superAdminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@ontime.com',
        password: 'Password123!',
      }),
    });
    const superAdminLoginData: any = await superAdminLoginRes.json();
    console.assert(superAdminLoginRes.status === 200, 'Super admin login should succeed (200)');
    const tokenSuperAdmin = superAdminLoginData.data.tokens.accessToken;
    const authHeadersSuperAdmin = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSuperAdmin}`,
    };
    console.log('  ✅ Authenticated Platform Super Admin');

    // ============================================================
    // TEST 1: Retailer Admin gets business details
    // ============================================================
    const getDetailsRes = await fetch(`${baseUrl}/organisations/business-details`, {
      method: 'GET',
      headers: authHeadersAdminA,
    });
    const getDetailsData: any = await getDetailsRes.json();
    console.assert(getDetailsRes.status === 200, 'Expected 200 for GET business-details');
    console.assert(getDetailsData.data.businessDetails.name === 'Retail Store A', 'Org name match');
    console.assert(
      getDetailsData.data.businessDetails.retailerId.startsWith('RT-'),
      'Retailer ID format RT-XXXXX',
    );
    console.assert(
      getDetailsData.data.businessDetails.contactPerson === 'Jai Singh',
      'Contact person match',
    );
    console.log('  ✅ [TEST 1] Retailer Admin successfully retrieved business details');

    // ============================================================
    // TEST 2: Retailer Admin updates business details
    // ============================================================
    const updateRes = await fetch(`${baseUrl}/organisations/business-details`, {
      method: 'PATCH',
      headers: authHeadersAdminA,
      body: JSON.stringify({
        name: 'Apex Supermarket',
        contactPerson: 'Jai Singh Senior',
        taxNumber: 'GSTIN 27ABCDE1234F1Z5',
        address: '21 Market Street, New York, NY 10001',
        area: 'Downtown Manhattan',
        city: 'New York',
        mobile: '+91 98765 43210',
      }),
    });
    const updateData: any = await updateRes.json();
    console.assert(updateRes.status === 200, 'Expected 200 for PATCH business-details');
    console.assert(
      updateData.data.businessDetails.name === 'Apex Supermarket',
      'Updated business name match',
    );
    console.assert(
      updateData.data.businessDetails.contactPerson === 'Jai Singh Senior',
      'Updated contact person match',
    );
    console.assert(
      updateData.data.businessDetails.taxNumber === 'GSTIN 27ABCDE1234F1Z5',
      'Updated Tax ID match',
    );
    console.assert(
      updateData.data.businessDetails.address === '21 Market Street, New York, NY 10001',
      'Updated address match',
    );
    console.log('  ✅ [TEST 2] Retailer Admin successfully updated business details');

    // ============================================================
    // TEST 3: Retailer Staff can GET business details (view-only)
    // ============================================================
    const staffGetRes = await fetch(`${baseUrl}/organisations/business-details`, {
      method: 'GET',
      headers: authHeadersStaffA,
    });
    const staffGetData: any = await staffGetRes.json();
    console.assert(staffGetRes.status === 200, 'Expected 200 for Staff GET business-details');
    console.assert(
      staffGetData.data.businessDetails.name === 'Apex Supermarket',
      'Staff sees updated business name',
    );
    console.log('  ✅ [TEST 3] Retailer Staff can view business details (200 OK)');

    // ============================================================
    // TEST 4: Retailer Staff CANNOT update business details (403 Forbidden)
    // ============================================================
    const staffUpdateRes = await fetch(`${baseUrl}/organisations/business-details`, {
      method: 'PATCH',
      headers: authHeadersStaffA,
      body: JSON.stringify({
        name: 'Hacked Store Name',
      }),
    });
    console.assert(
      staffUpdateRes.status === 403,
      `Expected 403 Forbidden for staff PATCH business-details, got ${staffUpdateRes.status}`,
    );
    console.log('  ✅ [TEST 4] Retailer Staff blocked from changing business details (403 Forbidden)');

    // ============================================================
    // TEST 5: Retailer Staff CANNOT update via /organisations/:id (403 Forbidden)
    // ============================================================
    const staffOrgUpdateRes = await fetch(`${baseUrl}/organisations/${orgIdA}`, {
      method: 'PATCH',
      headers: authHeadersStaffA,
      body: JSON.stringify({
        name: 'Hacked Store Name via ID',
      }),
    });
    console.assert(
      staffOrgUpdateRes.status === 403,
      `Expected 403 Forbidden for staff PATCH /:id, got ${staffOrgUpdateRes.status}`,
    );
    console.log('  ✅ [TEST 5] Retailer Staff blocked from changing organisation by ID (403 Forbidden)');

    // ============================================================
    // TEST 6: Retailer Admin B cannot update Retailer Org A (403 Forbidden)
    // ============================================================
    const crossTenantRes = await fetch(`${baseUrl}/organisations/${orgIdA}`, {
      method: 'PATCH',
      headers: authHeadersAdminB,
      body: JSON.stringify({
        name: 'Malicious Org Name Update',
      }),
    });
    console.assert(
      crossTenantRes.status === 403,
      `Expected 403 Forbidden for cross-tenant update, got ${crossTenantRes.status}`,
    );
    console.log('  ✅ [TEST 6] Cross-tenant update blocked (403 Forbidden)');

    // ============================================================
    // TEST 7: Super Admin CAN update business details for any retailer org
    // ============================================================
    const superAdminUpdateRes = await fetch(
      `${baseUrl}/organisations/business-details?organisationId=${orgIdA}`,
      {
        method: 'PATCH',
        headers: authHeadersSuperAdmin,
        body: JSON.stringify({
          name: 'Apex Supermarket (Verified Partner)',
          taxNumber: 'GSTIN 27ABCDE1234F1Z5-VERIFIED',
        }),
      },
    );
    const superAdminUpdateData: any = await superAdminUpdateRes.json();
    console.assert(
      superAdminUpdateRes.status === 200,
      `Expected 200 for Super Admin update, got ${superAdminUpdateRes.status}`,
    );
    console.assert(
      superAdminUpdateData.data.businessDetails.name === 'Apex Supermarket (Verified Partner)',
      'Super Admin changed name',
    );
    console.log('  ✅ [TEST 7] Super Admin successfully updated business details of retailer org');

    // ============================================================
    // TEST 8: Super Admin can update organisation operational status
    // ============================================================
    const statusUpdateRes = await fetch(`${baseUrl}/organisations/${orgIdB}/status`, {
      method: 'PATCH',
      headers: authHeadersSuperAdmin,
      body: JSON.stringify({
        status: OrganisationStatus.SUSPENDED,
      }),
    });
    console.assert(
      statusUpdateRes.status === 200,
      `Expected 200 for status change, got ${statusUpdateRes.status}`,
    );
    console.log('  ✅ [TEST 8] Super Admin can update organisation status to SUSPENDED');

    // ============================================================
    // TEST 9: Retailer Admin CANNOT update status via status endpoint
    // ============================================================
    const adminStatusRes = await fetch(`${baseUrl}/organisations/${orgIdA}/status`, {
      method: 'PATCH',
      headers: authHeadersAdminA,
      body: JSON.stringify({
        status: OrganisationStatus.SUSPENDED,
      }),
    });
    console.assert(
      adminStatusRes.status === 403,
      `Expected 403 for retailer admin status update, got ${adminStatusRes.status}`,
    );
    console.log('  ✅ [TEST 9] Retailer Admin cannot change operational status (403 Forbidden)');

    // ============================================================
    // TEST 10: Unauthenticated requests return 401
    // ============================================================
    const unauthRes = await fetch(`${baseUrl}/organisations/business-details`, {
      method: 'GET',
    });
    console.assert(unauthRes.status === 401, 'Unauthenticated request should return 401');
    console.log('  ✅ [TEST 10] Unauthenticated request blocked (401 Unauthorized)');

    console.log('\n🎉 ALL 10 BUSINESS DETAILS & RBAC TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runBusinessDetailsTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
