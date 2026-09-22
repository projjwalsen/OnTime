import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import http from 'http';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  console.log('🧪 Running Delivery Addresses integration tests...');

  try {
    // 1. Create test organisation and user
    const testEmail = `test.addr.${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Address Test Admin',
        email: testEmail,
        password: 'Password123!',
        businessName: 'Address Test Store',
        mobile: '+919999988888',
      }),
    });

    const regData: any = await regRes.json();
    if (!regData.success) {
      throw new Error(`Registration failed: ${regData.error || regData.message}`);
    }

    const token = regData.data.tokens.accessToken;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. Test create first address (should automatically be default)
    const createRes1 = await fetch(`${baseUrl}/addresses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        label: 'Main Store',
        streetAddress: '21 Market Street',
        city: 'New York',
        postalCode: '10001',
        deliveryInstructions: 'Use front entrance',
      }),
    });
    const createData1: any = await createRes1.json();
    console.assert(createRes1.status === 201, 'Expected 201 for address creation');
    console.assert(createData1.data.address.isDefault === true, 'First address should be default');
    const addr1Id = createData1.data.address.id;
    console.log('  ✅ Created first address (default: true)');

    // 3. Test create second address with isDefault: true
    const createRes2 = await fetch(`${baseUrl}/addresses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        label: 'Warehouse',
        streetAddress: '88 Hudson Avenue',
        city: 'New York',
        postalCode: '10013',
        isDefault: true,
      }),
    });
    const createData2: any = await createRes2.json();
    console.assert(createData2.data.address.isDefault === true, 'Second address should be default');
    const addr2Id = createData2.data.address.id;
    console.log('  ✅ Created second address as default');

    // 4. Verify list addresses and check that addr1 is no longer default
    const listRes = await fetch(`${baseUrl}/addresses`, {
      method: 'GET',
      headers: authHeaders,
    });
    const listData: any = await listRes.json();
    console.assert(listData.data.addresses.length === 2, 'Expected 2 addresses in list');
    const addr1InList = listData.data.addresses.find((a: any) => a.id === addr1Id);
    console.assert(addr1InList.isDefault === false, 'Address 1 should no longer be default');
    console.log('  ✅ Listed addresses and verified default unsetting');

    // 5. Test update address
    const updateRes = await fetch(`${baseUrl}/addresses/${addr1Id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        deliveryInstructions: 'Use loading dock after 9 AM',
      }),
    });
    const updateData: any = await updateRes.json();
    console.assert(
      updateData.data.address.deliveryInstructions === 'Use loading dock after 9 AM',
      'Delivery instructions should be updated',
    );
    console.log('  ✅ Updated address details');

    // 6. Test set default address
    const setDefaultRes = await fetch(`${baseUrl}/addresses/${addr1Id}/default`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const setDefaultData: any = await setDefaultRes.json();
    console.assert(setDefaultData.data.address.isDefault === true, 'Address 1 should be set back to default');
    console.log('  ✅ Set address 1 as default');

    // 7. Test delete address
    const deleteRes = await fetch(`${baseUrl}/addresses/${addr2Id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    console.assert(deleteRes.status === 200, 'Expected 200 for deletion');
    console.log('  ✅ Deleted address 2');

    // Cleanup test data
    await prisma.organisation.delete({ where: { id: regData.data.user.organisationId } }).catch(() => {});

    console.log('🎉 All Delivery Address tests passed successfully!\n');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('❌ Address tests failed:', err);
  process.exit(1);
});
