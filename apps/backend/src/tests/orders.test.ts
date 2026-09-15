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
  console.log('🧪 RUNNING ORDERS & FULFILLMENT MODULE TEST SUITE');
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
  const superAdminEmail = `superadmin.orders.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: superAdminEmail,
      name: 'Super Admin Orders Tester',
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
  assert(superLoginRes.status === 200, `Super Admin login failed: ${JSON.stringify(superLoginRes.body)}`);
  const superToken = superLoginRes.body.data.tokens.accessToken;

  // 2. Setup Organisation A (Retailer A)
  const orgA = await prisma.organisation.create({
    data: {
      name: `Retail Mart A ${timestamp}`,
      email: `retailer.a.${timestamp}@test.com`,
      mobile: '9876543210',
      address: '100 Market Street, City A',
      city: 'City A',
      area: 'Market District',
      taxNumber: `TAX-A-${timestamp}`,
      status: 'ACTIVE',
    },
  });

  const orgAAdminEmail = `admin.orga.${timestamp}@ontime.com`;
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

  const orgAStaffEmail = `staff.orga.${timestamp}@ontime.com`;
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
  assert(loginARes.status === 200, `Retailer A Admin login failed: ${JSON.stringify(loginARes.body)}`);
  const tokenA = loginARes.body.data.tokens.accessToken;

  const loginAStaffRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: orgAStaffEmail,
    password: defaultPassword,
  });
  assert(loginAStaffRes.status === 200, `Retailer A Staff login failed: ${JSON.stringify(loginAStaffRes.body)}`);
  const tokenAStaff = loginAStaffRes.body.data.tokens.accessToken;

  // 3. Setup Organisation B (Retailer B)
  const orgB = await prisma.organisation.create({
    data: {
      name: `Retail Mart B ${timestamp}`,
      email: `retailer.b.${timestamp}@test.com`,
      mobile: '9876543211',
      address: '200 Commercial Rd, City B',
      city: 'City B',
      area: 'Commercial Zone',
      taxNumber: `TAX-B-${timestamp}`,
      status: 'ACTIVE',
    },
  });

  const orgBAdminEmail = `admin.orgb.${timestamp}@ontime.com`;
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
  assert(loginBRes.status === 200, `Retailer B Admin login failed: ${JSON.stringify(loginBRes.body)}`);
  const tokenB = loginBRes.body.data.tokens.accessToken;

  // 4. Setup Products and Variants
  const cat = await prisma.category.create({
    data: {
      name: `Order Test Category ${timestamp}`,
      description: `Category for order tests ${timestamp}`,
    },
  });

  const prod1 = await prisma.product.create({
    data: {
      name: 'Premium Basmati Rice',
      sku: `RICE-${timestamp}`,
      description: 'Long grain aromatic basmati rice',
      price: 150.0,
      categoryId: cat.id,
      variants: {
        create: [
          {
            weight: '1kg',
            description: '1kg pouch pack',
            price: 160.0,
          },
          {
            weight: '5kg',
            description: '5kg family pack bag',
            price: 750.0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Refined Sunflower Oil',
      sku: `OIL-${timestamp}`,
      description: 'Pure cooking sunflower oil',
      price: 130.0,
      categoryId: cat.id,
    },
  });

  const variant5kg = prod1.variants.find((v) => v.weight === '5kg')!;

  // -------------------------------------------------------------
  // TEST 1: Place Order with Variant and Base Product (Snapshotting)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Place Order with Variant + Base Product Snapshotting ---');
  const createOrderPayload = {
    deliveryAddress: '100 Market Street, Dock 4, City A',
    notes: 'Please deliver between 9 AM and 1 PM',
    items: [
      {
        productId: prod1.id,
        variantId: variant5kg.id,
        quantity: 2, // 2 * 750 = 1500
      },
      {
        productId: prod2.id,
        quantity: 3, // 3 * 130 = 390
      },
    ],
  };

  const createOrderRes = await makeRequest('POST', '/api/v1/orders', createOrderPayload, tokenA);
  assert(createOrderRes.status === 201, `Create order failed: ${JSON.stringify(createOrderRes.body)}`);
  const orderA1 = createOrderRes.body.data.order;

  assert(orderA1.orderNumber.startsWith('ORD-'), `Invalid orderNumber format: ${orderA1.orderNumber}`);
  assert(orderA1.status === OrderStatus.PENDING, `Expected status PENDING, got ${orderA1.status}`);
  assert(orderA1.organisationId === orgA.id, 'Organisation ID mismatch');
  assert(orderA1.subtotal === 1890, `Expected subtotal 1890, got ${orderA1.subtotal}`);
  assert(orderA1.totalAmount === 1890, `Expected totalAmount 1890, got ${orderA1.totalAmount}`);
  assert(orderA1.items.length === 2, `Expected 2 items, got ${orderA1.items.length}`);

  const item1 = orderA1.items.find((i: any) => i.productId === prod1.id);
  assert(item1.variantId === variant5kg.id, 'Variant ID mismatch on snapshot item');
  assert(item1.variantWeight === '5kg', `Expected variantWeight 5kg, got ${item1.variantWeight}`);
  assert(item1.unitPrice === 750, `Expected unitPrice 750, got ${item1.unitPrice}`);
  assert(item1.totalPrice === 1500, `Expected totalPrice 1500, got ${item1.totalPrice}`);

  const item2 = orderA1.items.find((i: any) => i.productId === prod2.id);
  assert(item2.variantId === null, 'Variant ID should be null for base product');
  assert(item2.variantWeight === null, 'Variant weight should be null');
  assert(item2.unitPrice === 130, `Expected unitPrice 130, got ${item2.unitPrice}`);
  assert(item2.totalPrice === 390, `Expected totalPrice 390, got ${item2.totalPrice}`);
  console.log(`  ✔ Order created (${orderA1.orderNumber}) with total ${orderA1.totalAmount} and snapshotted fields`);

  // -------------------------------------------------------------
  // TEST 2: Retailer Staff can place orders for their organisation
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Retailer Staff Order Placement ---');
  const staffOrderRes = await makeRequest(
    'POST',
    '/api/v1/orders',
    {
      deliveryAddress: 'Branch Store 2, City A',
      items: [{ productId: prod2.id, quantity: 10 }],
    },
    tokenAStaff,
  );
  assert(staffOrderRes.status === 201, `Staff order placement failed: ${JSON.stringify(staffOrderRes.body)}`);
  const orderA2 = staffOrderRes.body.data.order;
  assert(orderA2.organisationId === orgA.id, 'Staff order must belong to Organisation A');
  assert(orderA2.totalAmount === 1300, `Expected 1300, got ${orderA2.totalAmount}`);
  console.log('  ✔ Retailer Staff successfully placed order within Organisation A');

  // -------------------------------------------------------------
  // TEST 3: Multi-tenant boundary checks & Listing
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Multi-Tenant Boundary Checks & Listing ---');
  // Retailer B placing an order
  const orderBRes = await makeRequest(
    'POST',
    '/api/v1/orders',
    {
      deliveryAddress: 'Retail B Warehouse, City B',
      items: [{ productId: prod1.id, variantId: variant5kg.id, quantity: 1 }],
    },
    tokenB,
  );
  assert(orderBRes.status === 201, `Retailer B order creation failed: ${JSON.stringify(orderBRes.body)}`);
  const orderB1 = orderBRes.body.data.order;

  // Retailer A lists orders: should only see Org A's orders (2 orders: orderA1, orderA2)
  const listARes = await makeRequest('GET', '/api/v1/orders', undefined, tokenA);
  assert(listARes.status === 200, `List orders A failed: ${JSON.stringify(listARes.body)}`);
  assert(listARes.body.data.orders.length === 2, `Org A should see 2 orders, saw ${listARes.body.data.orders.length}`);
  const hasOtherOrgOrder = listARes.body.data.orders.some((o: any) => o.organisationId !== orgA.id);
  assert(!hasOtherOrgOrder, 'Isolation breach: Org A saw orders belonging to another tenant');
  console.log('  ✔ Tenant A listing correctly isolated to tenant A');

  // Retailer B attempts to access Org A's order by ID -> 403 Forbidden
  const crossTenantGet = await makeRequest('GET', `/api/v1/orders/${orderA1.id}`, undefined, tokenB);
  assert(crossTenantGet.status === 403, `Expected 403 Forbidden for cross-tenant access, got ${crossTenantGet.status}`);
  console.log('  ✔ Cross-tenant order inspection correctly rejected with 403 Forbidden');

  // Super Admin lists orders -> sees all orders across tenants
  const superListRes = await makeRequest('GET', '/api/v1/orders', undefined, superToken);
  assert(superListRes.status === 200, `Super Admin list failed: ${JSON.stringify(superListRes.body)}`);
  const foundA = superListRes.body.data.orders.some((o: any) => o.id === orderA1.id);
  const foundB = superListRes.body.data.orders.some((o: any) => o.id === orderB1.id);
  assert(foundA && foundB, 'Super Admin should see orders from both Organisation A and B');

  // Super Admin filters by organisationId
  const superFilterRes = await makeRequest('GET', `/api/v1/orders?organisationId=${orgB.id}`, undefined, superToken);
  assert(superFilterRes.status === 200, `Super Admin filter failed: ${JSON.stringify(superFilterRes.body)}`);
  assert(superFilterRes.body.data.orders.length === 1, 'Filtered query should return exactly 1 order for Org B');
  assert(superFilterRes.body.data.orders[0].id === orderB1.id, 'Filtered query order ID mismatch');
  console.log('  ✔ Super Admin multi-tenant listing and filtering verified');

  // -------------------------------------------------------------
  // TEST 4: Retailer Order Cancellation
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Retailer Order Cancellation in PENDING status ---');
  const cancelRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA2.id}/cancel`,
    { cancellationReason: 'Ordered incorrect quantity by mistake' },
    tokenA,
  );
  assert(cancelRes.status === 200, `Retailer cancel order failed: ${JSON.stringify(cancelRes.body)}`);
  assert(cancelRes.body.data.order.status === OrderStatus.CANCELLED, 'Status should be CANCELLED');
  assert(
    cancelRes.body.data.order.cancellationReason === 'Ordered incorrect quantity by mistake',
    'Cancellation reason mismatch',
  );
  assert(!!cancelRes.body.data.order.cancelledAt, 'cancelledAt timestamp missing');

  // Re-cancellation attempt should fail
  const reCancelRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA2.id}/cancel`,
    { cancellationReason: 'Trying to cancel again' },
    tokenA,
  );
  assert(reCancelRes.status === 400, `Expected 400 when cancelling already cancelled order, got ${reCancelRes.status}`);
  console.log('  ✔ Retailer order cancellation and idempotency guard validated');

  // -------------------------------------------------------------
  // TEST 5: Status Transition Lifecycle (Super Admin)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Full Order Status Transition Lifecycle ---');
  // 1. PENDING -> CONFIRMED
  const confirmRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA1.id}/status`,
    { status: OrderStatus.CONFIRMED },
    superToken,
  );
  assert(confirmRes.status === 200, `PENDING -> CONFIRMED failed: ${JSON.stringify(confirmRes.body)}`);
  assert(confirmRes.body.data.order.status === OrderStatus.CONFIRMED, 'Status should be CONFIRMED');

  // 2. CONFIRMED -> PROCESSING
  const procRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA1.id}/status`,
    { status: OrderStatus.PROCESSING },
    superToken,
  );
  assert(procRes.status === 200, `CONFIRMED -> PROCESSING failed: ${JSON.stringify(procRes.body)}`);
  assert(procRes.body.data.order.status === OrderStatus.PROCESSING, 'Status should be PROCESSING');

  // 3. PROCESSING -> DISPATCHED
  const dispRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA1.id}/status`,
    { status: OrderStatus.DISPATCHED },
    superToken,
  );
  assert(dispRes.status === 200, `PROCESSING -> DISPATCHED failed: ${JSON.stringify(dispRes.body)}`);
  assert(dispRes.body.data.order.status === OrderStatus.DISPATCHED, 'Status should be DISPATCHED');

  // 4. DISPATCHED -> DELIVERED
  const delivRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA1.id}/status`,
    { status: OrderStatus.DELIVERED },
    superToken,
  );
  assert(delivRes.status === 200, `DISPATCHED -> DELIVERED failed: ${JSON.stringify(delivRes.body)}`);
  assert(delivRes.body.data.order.status === OrderStatus.DELIVERED, 'Status should be DELIVERED');
  assert(!!delivRes.body.data.order.deliveredAt, 'deliveredAt timestamp must be set on DELIVERED');

  // 5. Invalid transition attempt (DELIVERED -> CONFIRMED)
  const invalidTransitionRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA1.id}/status`,
    { status: OrderStatus.CONFIRMED },
    superToken,
  );
  assert(
    invalidTransitionRes.status === 400,
    `Expected 400 for invalid transition DELIVERED -> CONFIRMED, got ${invalidTransitionRes.status}`,
  );
  console.log('  ✔ Valid status progressions succeeded and invalid transition was blocked');

  // -------------------------------------------------------------
  // TEST 6: Retailer Cannot Cancel Order once beyond PENDING
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Retailer Cannot Cancel Confirmed/Delivered Order ---');
  const lateCancelRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderA1.id}/cancel`,
    { cancellationReason: 'Cancel delivered goods' },
    tokenA,
  );
  assert(lateCancelRes.status === 400, `Expected 400 for retailer cancelling non-pending order, got ${lateCancelRes.status}`);
  console.log('  ✔ Retailer cancellation blocked when order is past PENDING state');

  // -------------------------------------------------------------
  // TEST 7: Super Admin Order Cancellation mid-lifecycle
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Super Admin Order Cancellation in PROCESSING State ---');
  const orderCRes = await makeRequest(
    'POST',
    '/api/v1/orders',
    {
      deliveryAddress: 'Special Order Address',
      items: [{ productId: prod2.id, quantity: 5 }],
    },
    tokenA,
  );
  const orderC = orderCRes.body.data.order;

  // Progress to PROCESSING
  await makeRequest('PATCH', `/api/v1/orders/${orderC.id}/status`, { status: OrderStatus.CONFIRMED }, superToken);
  await makeRequest('PATCH', `/api/v1/orders/${orderC.id}/status`, { status: OrderStatus.PROCESSING }, superToken);

  // Super admin cancels
  const superCancelRes = await makeRequest(
    'PATCH',
    `/api/v1/orders/${orderC.id}/cancel`,
    { cancellationReason: 'Stock shortage at regional distributor warehouse' },
    superToken,
  );
  assert(superCancelRes.status === 200, `Super Admin cancel failed: ${JSON.stringify(superCancelRes.body)}`);
  assert(superCancelRes.body.data.order.status === OrderStatus.CANCELLED, 'Status should be CANCELLED');
  console.log('  ✔ Super Admin successfully cancelled order during PROCESSING');

  // -------------------------------------------------------------
  // TEST 8: Order Summary Statistics
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Order Summary Statistics Aggregation ---');
  const superStatsRes = await makeRequest('GET', '/api/v1/orders/stats/summary', undefined, superToken);
  assert(superStatsRes.status === 200, `Super stats failed: ${JSON.stringify(superStatsRes.body)}`);
  const superStats = superStatsRes.body.data.stats;
  assert(superStats.totalOrders >= 4, `Expected at least 4 total orders, got ${superStats.totalOrders}`);
  assert(superStats.deliveredOrders >= 1, `Expected at least 1 delivered order, got ${superStats.deliveredOrders}`);
  assert(superStats.cancelledOrders >= 2, `Expected at least 2 cancelled orders, got ${superStats.cancelledOrders}`);
  assert(superStats.totalRevenue >= 1890, `Expected revenue >= 1890, got ${superStats.totalRevenue}`);

  const retailerAStatsRes = await makeRequest('GET', '/api/v1/orders/stats/summary', undefined, tokenA);
  assert(retailerAStatsRes.status === 200, `Retailer A stats failed: ${JSON.stringify(retailerAStatsRes.body)}`);
  const retailerAStats = retailerAStatsRes.body.data.stats;
  assert(retailerAStats.totalOrders === 3, `Expected Org A to have 3 orders, got ${retailerAStats.totalOrders}`);
  assert(retailerAStats.deliveredOrders === 1, `Expected Org A to have 1 delivered order, got ${retailerAStats.deliveredOrders}`);
  assert(retailerAStats.cancelledOrders === 2, `Expected Org A to have 2 cancelled orders, got ${retailerAStats.cancelledOrders}`);
  assert(retailerAStats.totalRevenue >= 1890, `Expected Org A total revenue to be at least 1890, got ${retailerAStats.totalRevenue}`);
  console.log('  ✔ Order summary statistics correctly aggregated and tenant-scoped');

  console.log('\n===========================================================');
  console.log('🎉 ALL ORDER & FULFILLMENT TESTS PASSED! 🎉');
  console.log('===========================================================');
}

runTests()
  .then(() => {
    if (server) server.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    if (server) server.close();
    process.exit(1);
  });
