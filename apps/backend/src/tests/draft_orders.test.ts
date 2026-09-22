import http from 'http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { UserRole, OrderStatus } from '@ontime/shared';
import apiRouter from '../routes/index';
import { errorResponse } from '../utils/response';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';

// Construct test Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use((_req: Request, res: Response) => {
  errorResponse(res, 'Route not found', 404);
});

let server: http.Server;
let port: number;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      `${baseUrl}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(rawData);
          } catch {
            parsedBody = rawData;
          }
          resolve({ status: res.statusCode || 500, body: parsedBody });
        });
      },
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING DRAFT ORDERS MODULE TEST SUITE');
  console.log('===========================================================');

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        port = address.port;
        baseUrl = `http://localhost:${port}`;
      }
      resolve();
    });
  });

  const timestamp = Date.now();
  const defaultPassword = 'Password123!';
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // 1. Setup Super Admin
  const superAdminEmail = `superadmin.drafts.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: superAdminEmail,
      name: 'Super Admin Drafts Tester',
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
      organisationId: null,
      isActive: true,
    },
  });

  const superLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: superAdminEmail,
    password: defaultPassword,
  });
  assert(
    superLoginRes.status === 200,
    `Super Admin login failed: ${JSON.stringify(superLoginRes.body)}`,
  );
  const superToken = superLoginRes.body.data.tokens.accessToken;

  // 2. Setup Organisation A (Retailer A)
  const orgA = await prisma.organisation.create({
    data: {
      name: `Retail Mart Draft A ${timestamp}`,
      email: `retailer.draft.a.${timestamp}@test.com`,
      mobile: '9876543210',
      address: '100 Market Street, City A',
      city: 'City A',
      area: 'Market District',
      taxNumber: `TAX-DA-${timestamp}`,
      status: 'ACTIVE',
    },
  });

  const orgAAdminEmail = `admin.draft.orga.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: orgAAdminEmail,
      name: 'Retailer A Admin',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      organisationId: orgA.id,
      isActive: true,
    },
  });

  const orgAStaffEmail = `staff.draft.orga.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: orgAStaffEmail,
      name: 'Retailer A Staff',
      passwordHash: defaultPasswordHash,
      role: UserRole.STAFF,
      organisationId: orgA.id,
      isActive: true,
    },
  });

  const loginARes = await makeRequest('POST', '/api/v1/auth/login', {
    email: orgAAdminEmail,
    password: defaultPassword,
  });
  assert(
    loginARes.status === 200,
    `Retailer A Admin login failed: ${JSON.stringify(loginARes.body)}`,
  );
  const tokenA = loginARes.body.data.tokens.accessToken;

  const loginAStaffRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: orgAStaffEmail,
    password: defaultPassword,
  });
  assert(
    loginAStaffRes.status === 200,
    `Retailer A Staff login failed: ${JSON.stringify(loginAStaffRes.body)}`,
  );
  const tokenAStaff = loginAStaffRes.body.data.tokens.accessToken;

  // 3. Setup Organisation B (Retailer B)
  const orgB = await prisma.organisation.create({
    data: {
      name: `Retail Mart Draft B ${timestamp}`,
      email: `retailer.draft.b.${timestamp}@test.com`,
      mobile: '9876543211',
      address: '200 Commercial Rd, City B',
      city: 'City B',
      area: 'Commercial Zone',
      taxNumber: `TAX-DB-${timestamp}`,
      status: 'ACTIVE',
    },
  });

  const orgBAdminEmail = `admin.draft.orgb.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: orgBAdminEmail,
      name: 'Retailer B Admin',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      organisationId: orgB.id,
      isActive: true,
    },
  });

  const loginBRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: orgBAdminEmail,
    password: defaultPassword,
  });
  assert(
    loginBRes.status === 200,
    `Retailer B Admin login failed: ${JSON.stringify(loginBRes.body)}`,
  );
  const tokenB = loginBRes.body.data.tokens.accessToken;

  // 4. Setup Products & Variants
  const category = await prisma.category.create({
    data: {
      name: `Draft Category ${timestamp}`,
      description: 'Category for testing draft orders',
    },
  });

  const product1 = await prisma.product.create({
    data: {
      name: 'Premium Basmati Rice',
      sku: `RICE-DRAFT-${timestamp}`,
      price: 100.0,
      categoryId: category.id,
      unit: 'kg',
      isActive: true,
      variants: {
        create: [
          { weight: '1kg', price: 110.0, description: '1kg retail pack' },
          { weight: '5kg', price: 500.0, description: '5kg bulk pack' },
        ],
      },
    },
    include: { variants: true },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Organic Olive Oil',
      sku: `OIL-DRAFT-${timestamp}`,
      price: 250.0,
      categoryId: category.id,
      unit: 'bottle',
      isActive: true,
    },
  });

  const inactiveProduct = await prisma.product.create({
    data: {
      name: 'Discontinued Spice Mix',
      sku: `SPICE-INACT-${timestamp}`,
      price: 50.0,
      categoryId: category.id,
      unit: 'pack',
      isActive: false,
    },
  });

  console.log('Setup completed successfully.\n');

  // ============================================================
  // TEST 1: Super Admin is strictly blocked (403 Forbidden)
  // ============================================================
  console.log('▶ TEST 1: Super Admin blocked from draft orders...');
  const superCreateRes = await makeRequest(
    'POST',
    '/api/v1/draft-orders',
    { title: 'Super Admin Draft' },
    superToken,
  );
  assert(
    superCreateRes.status === 403,
    `Expected 403 for Super Admin create, got ${superCreateRes.status}`,
  );

  const superListRes = await makeRequest('GET', '/api/v1/draft-orders', undefined, superToken);
  assert(
    superListRes.status === 403,
    `Expected 403 for Super Admin list, got ${superListRes.status}`,
  );
  console.log('✔ TEST 1 PASSED: Super Admin correctly received 403 Forbidden.\n');

  // ============================================================
  // TEST 2: Retailer Admin creates empty draft order
  // ============================================================
  console.log('▶ TEST 2: Retailer A Admin creates an empty draft order...');
  const createEmptyRes = await makeRequest(
    'POST',
    '/api/v1/draft-orders',
    {
      title: 'Weekly Restock Batch #1',
      notes: 'Please pack in sturdy boxes',
      deliveryAddress: '100 Market Street, Loading Dock 2',
    },
    tokenA,
  );
  assert(
    createEmptyRes.status === 201,
    `Create empty draft failed: ${JSON.stringify(createEmptyRes.body)}`,
  );
  const draft1 = createEmptyRes.body.data.draftOrder;
  assert(draft1.id, 'Draft order must have an id');
  assert(draft1.title === 'Weekly Restock Batch #1', 'Draft title mismatch');
  assert(draft1.subtotal === 0, 'Subtotal should be 0 for empty draft');
  assert(draft1.items.length === 0, 'Items should be empty');
  console.log(`✔ TEST 2 PASSED: Draft order created (ID: ${draft1.id}).\n`);

  // ============================================================
  // TEST 3: Retailer A Staff can view and list draft orders
  // ============================================================
  console.log('▶ TEST 3: Retailer A Staff views and lists draft orders...');
  const staffGetRes = await makeRequest(
    'GET',
    `/api/v1/draft-orders/${draft1.id}`,
    undefined,
    tokenAStaff,
  );
  assert(staffGetRes.status === 200, `Staff get draft failed: ${JSON.stringify(staffGetRes.body)}`);
  assert(staffGetRes.body.data.draftOrder.id === draft1.id, 'Draft ID mismatch');

  const staffListRes = await makeRequest('GET', '/api/v1/draft-orders', undefined, tokenAStaff);
  assert(
    staffListRes.status === 200,
    `Staff list drafts failed: ${JSON.stringify(staffListRes.body)}`,
  );
  assert(staffListRes.body.data.draftOrders.length >= 1, 'Expected at least 1 draft in list');
  console.log('✔ TEST 3 PASSED: Retailer A Staff successfully retrieved draft orders.\n');

  // ============================================================
  // TEST 4: Add items to draft order & test quantity merging
  // ============================================================
  console.log('▶ TEST 4: Adding items to draft order & quantity increment...');
  const variant5kg = product1.variants.find((v) => v.weight === '5kg')!;

  // Add 2 units of 5kg Rice ($500 each = $1000)
  const addItemRes1 = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/items`,
    {
      productId: product1.id,
      variantId: variant5kg.id,
      quantity: 2,
    },
    tokenA,
  );
  assert(addItemRes1.status === 200, `Add item 1 failed: ${JSON.stringify(addItemRes1.body)}`);
  let updatedDraft = addItemRes1.body.data.draftOrder;
  assert(updatedDraft.items.length === 1, 'Draft should have 1 item');
  assert(updatedDraft.items[0].unitPrice === 500, 'Unit price should be 500');
  assert(updatedDraft.items[0].totalPrice === 1000, 'Item total should be 1000');
  assert(updatedDraft.subtotal === 1000, 'Draft subtotal should be 1000');

  // Add 3 MORE units of the same 5kg Rice -> should increment quantity to 5 ($2500 total)
  const addItemRes2 = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/items`,
    {
      productId: product1.id,
      variantId: variant5kg.id,
      quantity: 3,
    },
    tokenA,
  );
  assert(addItemRes2.status === 200, `Add item 2 failed: ${JSON.stringify(addItemRes2.body)}`);
  updatedDraft = addItemRes2.body.data.draftOrder;
  assert(updatedDraft.items.length === 1, 'Draft should still have 1 line item (merged)');
  assert(
    updatedDraft.items[0].quantity === 5,
    `Expected quantity 5, got ${updatedDraft.items[0].quantity}`,
  );
  assert(
    updatedDraft.items[0].totalPrice === 2500,
    `Expected total 2500, got ${updatedDraft.items[0].totalPrice}`,
  );
  assert(updatedDraft.subtotal === 2500, 'Draft subtotal should be 2500');

  // Add 4 bottles of Olive Oil ($250 each = $1000)
  const addItemRes3 = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/items`,
    {
      productId: product2.id,
      quantity: 4,
    },
    tokenAStaff,
  );
  assert(addItemRes3.status === 200, `Add item 3 failed: ${JSON.stringify(addItemRes3.body)}`);
  updatedDraft = addItemRes3.body.data.draftOrder;
  assert(updatedDraft.items.length === 2, 'Draft should now have 2 line items');
  assert(updatedDraft.subtotal === 3500, `Expected subtotal 3500, got ${updatedDraft.subtotal}`);
  console.log('✔ TEST 4 PASSED: Items added and duplicate variants merged correctly.\n');

  // ============================================================
  // TEST 5: Update draft item quantity & variant
  // ============================================================
  console.log('▶ TEST 5: Update draft item quantity and variant...');
  const oliveOilItem = updatedDraft.items.find((i: any) => i.productId === product2.id)!;
  const updateItemRes = await makeRequest(
    'PATCH',
    `/api/v1/draft-orders/${draft1.id}/items/${oliveOilItem.id}`,
    {
      quantity: 2, // reduce olive oil from 4 to 2 (2 * 250 = 500) -> total subtotal = 2500 + 500 = 3000
    },
    tokenA,
  );
  assert(
    updateItemRes.status === 200,
    `Update item quantity failed: ${JSON.stringify(updateItemRes.body)}`,
  );
  updatedDraft = updateItemRes.body.data.draftOrder;
  assert(updatedDraft.subtotal === 3000, `Expected subtotal 3000, got ${updatedDraft.subtotal}`);
  console.log('✔ TEST 5 PASSED: Line item updated and subtotal recalculated.\n');

  // ============================================================
  // TEST 6: Remove an item line from draft
  // ============================================================
  console.log('▶ TEST 6: Remove item line from draft order...');
  const removeItemRes = await makeRequest(
    'DELETE',
    `/api/v1/draft-orders/${draft1.id}/items/${oliveOilItem.id}`,
    undefined,
    tokenAStaff,
  );
  assert(removeItemRes.status === 200, `Remove item failed: ${JSON.stringify(removeItemRes.body)}`);
  updatedDraft = removeItemRes.body.data.draftOrder;
  assert(updatedDraft.items.length === 1, 'Draft should now have 1 line item');
  assert(updatedDraft.subtotal === 2500, `Expected subtotal 2500, got ${updatedDraft.subtotal}`);
  console.log('✔ TEST 6 PASSED: Line item removed and subtotal updated.\n');

  // ============================================================
  // TEST 6b: Bulk remove items from draft order
  // ============================================================
  console.log('▶ TEST 6b: Bulk remove items from draft order...');
  // Add olive oil back
  const addOilRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/items`,
    { productId: product2.id, quantity: 2 },
    tokenA,
  );
  assert(addOilRes.status === 200, `Add oil failed: ${JSON.stringify(addOilRes.body)}`);
  const oilItem = addOilRes.body.data.draftOrder.items.find((i: any) => i.productId === product2.id)!;

  // Bulk remove olive oil item using POST /items/bulk-remove
  const bulkRemoveRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/items/bulk-remove`,
    { itemIds: [oilItem.id] },
    tokenA,
  );
  assert(
    bulkRemoveRes.status === 200,
    `Bulk remove failed: ${JSON.stringify(bulkRemoveRes.body)}`,
  );
  updatedDraft = bulkRemoveRes.body.data.draftOrder;
  assert(updatedDraft.items.length === 1, 'Draft should now have 1 line item after bulk remove');
  assert(updatedDraft.subtotal === 2500, `Expected subtotal 2500, got ${updatedDraft.subtotal}`);
  console.log('✔ TEST 6b PASSED: Bulk remove items succeeded and subtotal updated.\n');


  // ============================================================
  // TEST 7: Update draft metadata (title, notes, deliveryAddress)
  // ============================================================
  console.log('▶ TEST 7: Update draft metadata...');
  const patchDraftRes = await makeRequest(
    'PATCH',
    `/api/v1/draft-orders/${draft1.id}`,
    {
      title: 'Updated Restock Title',
      notes: 'Urgent weekend delivery needed',
      deliveryAddress: 'New Address 456',
    },
    tokenA,
  );
  assert(patchDraftRes.status === 200, `Patch draft failed: ${JSON.stringify(patchDraftRes.body)}`);
  updatedDraft = patchDraftRes.body.data.draftOrder;
  assert(updatedDraft.title === 'Updated Restock Title', 'Title should be updated');
  assert(updatedDraft.notes === 'Urgent weekend delivery needed', 'Notes should be updated');
  assert(updatedDraft.deliveryAddress === 'New Address 456', 'Delivery address should be updated');
  console.log('✔ TEST 7 PASSED: Draft metadata updated successfully.\n');

  // ============================================================
  // TEST 7b: Update draft items via PATCH /draft-orders/:id
  // ============================================================
  console.log('▶ TEST 7b: Update draft order items replacement...');
  const patchItemsRes = await makeRequest(
    'PATCH',
    `/api/v1/draft-orders/${draft1.id}`,
    {
      items: [
        { productId: product1.id, variantId: variant5kg.id, quantity: 5 },
      ],
      notes: 'Updated notes with items replacement',
    },
    tokenA,
  );
  assert(patchItemsRes.status === 200, `Patch items failed: ${JSON.stringify(patchItemsRes.body)}`);
  updatedDraft = patchItemsRes.body.data.draftOrder;
  assert(updatedDraft.items.length === 1, `Expected 1 item, got ${updatedDraft.items.length}`);
  assert(updatedDraft.subtotal === 2500, `Expected subtotal 2500, got ${updatedDraft.subtotal}`);
  console.log('✔ TEST 7b PASSED: Draft items replaced successfully.\n');

  // ============================================================
  // TEST 8: Multi-tenant isolation (Retailer B cannot access Retailer A draft)
  // ============================================================
  console.log('▶ TEST 8: Multi-tenant isolation enforcement...');
  const bGetRes = await makeRequest('GET', `/api/v1/draft-orders/${draft1.id}`, undefined, tokenB);
  assert(
    bGetRes.status === 403,
    `Expected 403 for Retailer B accessing Retailer A draft, got ${bGetRes.status}`,
  );

  const bAddRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/items`,
    { productId: product2.id, quantity: 1 },
    tokenB,
  );
  assert(
    bAddRes.status === 403,
    `Expected 403 for Retailer B adding to Retailer A draft, got ${bAddRes.status}`,
  );

  const bDeleteRes = await makeRequest(
    'DELETE',
    `/api/v1/draft-orders/${draft1.id}`,
    undefined,
    tokenB,
  );
  assert(
    bDeleteRes.status === 403,
    `Expected 403 for Retailer B deleting Retailer A draft, got ${bDeleteRes.status}`,
  );

  const bConvertRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/convert`,
    {},
    tokenB,
  );
  assert(
    bConvertRes.status === 403,
    `Expected 403 for Retailer B converting Retailer A draft, got ${bConvertRes.status}`,
  );

  const bListRes = await makeRequest('GET', '/api/v1/draft-orders', undefined, tokenB);
  assert(bListRes.status === 200, `Retailer B list failed: ${JSON.stringify(bListRes.body)}`);
  assert(bListRes.body.data.draftOrders.length === 0, 'Retailer B should see 0 drafts');
  console.log('✔ TEST 8 PASSED: Multi-tenant boundaries strictly enforced.\n');

  // ============================================================
  // TEST 9: Convert draft order to official wholesale Order
  // ============================================================
  console.log('▶ TEST 9: Convert draft order into official Order...');
  const convertRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${draft1.id}/convert`,
    {
      notes: 'Final confirmed order notes',
    },
    tokenAStaff,
  );
  assert(convertRes.status === 201, `Convert draft failed: ${JSON.stringify(convertRes.body)}`);
  const liveOrder = convertRes.body.data.order;
  assert(liveOrder.id, 'Live order must have an id');
  assert(liveOrder.orderNumber.startsWith('ORD-'), `Invalid orderNumber: ${liveOrder.orderNumber}`);
  assert(
    liveOrder.status === OrderStatus.PENDING,
    `Expected status PENDING, got ${liveOrder.status}`,
  );
  assert(liveOrder.subtotal === 2500, `Expected subtotal 2500, got ${liveOrder.subtotal}`);
  assert(liveOrder.items.length === 1, 'Order must have 1 line item');
  assert(liveOrder.notes === 'Final confirmed order notes', 'Order notes mismatch');

  // Verify draft order is deleted
  const getOldDraftRes = await makeRequest(
    'GET',
    `/api/v1/draft-orders/${draft1.id}`,
    undefined,
    tokenA,
  );
  assert(
    getOldDraftRes.status === 404,
    `Old draft order should be deleted, got ${getOldDraftRes.status}`,
  );

  // Verify live order is present in wholesale orders API
  const getOrderRes = await makeRequest('GET', `/api/v1/orders/${liveOrder.id}`, undefined, tokenA);
  assert(getOrderRes.status === 200, `Get live order failed: ${JSON.stringify(getOrderRes.body)}`);
  console.log(`✔ TEST 9 PASSED: Converted to Order #${liveOrder.orderNumber} and draft removed.\n`);

  // ============================================================
  // TEST 10: Error handling (empty draft conversion, inactive product)
  // ============================================================
  console.log('▶ TEST 10: Error handling validation...');
  // Create another empty draft
  const emptyDraftRes = await makeRequest(
    'POST',
    '/api/v1/draft-orders',
    { title: 'Empty Draft Test' },
    tokenA,
  );
  const emptyDraft = emptyDraftRes.body.data.draftOrder;

  // Attempting to convert empty draft must fail (400)
  const convertEmptyRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${emptyDraft.id}/convert`,
    {},
    tokenA,
  );
  assert(
    convertEmptyRes.status === 400,
    `Expected 400 for converting empty draft, got ${convertEmptyRes.status}`,
  );

  // Attempting to add inactive product must fail (400)
  const addInactiveRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${emptyDraft.id}/items`,
    { productId: inactiveProduct.id, quantity: 1 },
    tokenA,
  );
  assert(
    addInactiveRes.status === 400,
    `Expected 400 for inactive product, got ${addInactiveRes.status}`,
  );

  // Attempting to add non-existent product must fail (404)
  const addNonExistentRes = await makeRequest(
    'POST',
    `/api/v1/draft-orders/${emptyDraft.id}/items`,
    { productId: '00000000-0000-0000-0000-000000000000', quantity: 1 },
    tokenA,
  );
  assert(
    addNonExistentRes.status === 404,
    `Expected 404 for non-existent product, got ${addNonExistentRes.status}`,
  );

  // Discard / Delete the empty draft
  const deleteDraftRes = await makeRequest(
    'DELETE',
    `/api/v1/draft-orders/${emptyDraft.id}`,
    undefined,
    tokenA,
  );
  assert(
    deleteDraftRes.status === 200,
    `Delete draft failed: ${JSON.stringify(deleteDraftRes.body)}`,
  );

  const verifyDeletedRes = await makeRequest(
    'GET',
    `/api/v1/draft-orders/${emptyDraft.id}`,
    undefined,
    tokenA,
  );
  assert(
    verifyDeletedRes.status === 404,
    `Expected 404 for deleted draft, got ${verifyDeletedRes.status}`,
  );
  console.log('✔ TEST 10 PASSED: Error cases and discard handled correctly.\n');

  console.log('===========================================================');
  console.log('🎉 ALL DRAFT ORDERS TESTS PASSED SUCCESSFULLY!');
  console.log('===========================================================');

  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

void runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  if (server) server.close();
  void prisma.$disconnect().finally(() => process.exit(1));
});
