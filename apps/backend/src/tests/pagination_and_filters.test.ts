import http from 'http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { UserRole, OrganisationStatus, OrderStatus } from '@ontime/shared';
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
  console.log('🧪 RUNNING COMPREHENSIVE SEARCH, FILTER & PAGINATION TESTS');
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
  const password = 'TestPassword123!';
  const passwordHash = await hashPassword(password);

  // 1. Setup Super Admin
  const superAdminEmail = `superadmin.filter.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: superAdminEmail,
      name: 'Super Admin Filter Tester',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      organisationId: null,
      isActive: true,
    },
  });

  const superLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: superAdminEmail,
    password,
  });
  assert(superLoginRes.status === 200, `Super Admin login failed: ${JSON.stringify(superLoginRes.body)}`);
  const superToken = superLoginRes.body.data.tokens.accessToken;

  // 2. Setup Retailer Organisation A & Admin
  const orgA = await prisma.organisation.create({
    data: {
      name: `Apex Retailers ${timestamp}`,
      email: `apex.${timestamp}@test.com`,
      mobile: '9811111111',
      city: 'Delhi',
      area: 'Connaught Place',
      address: '10 Plaza Block',
      taxNumber: `TAX-APEX-${timestamp}`,
      status: OrganisationStatus.ACTIVE,
    },
  });

  const orgAAdminEmail = `admin.apex.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: orgAAdminEmail,
      name: `Apex Admin ${timestamp}`,
      mobile: '9811111112',
      passwordHash,
      role: UserRole.ADMIN,
      organisationId: orgA.id,
      isActive: true,
    },
  });

  const orgAStaffEmail = `staff.apex.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: orgAStaffEmail,
      name: `Apex Staff Member ${timestamp}`,
      mobile: '9811111113',
      passwordHash,
      role: UserRole.STAFF,
      organisationId: orgA.id,
      isActive: true,
    },
  });

  // Setup Retailer Organisation B (Suspended, Mumbai)
  const orgB = await prisma.organisation.create({
    data: {
      name: `Bayview Supermarket ${timestamp}`,
      email: `bayview.${timestamp}@test.com`,
      mobile: '9822222222',
      city: 'Mumbai',
      area: 'Bandra',
      address: '20 Ocean Drive',
      taxNumber: `TAX-BAY-${timestamp}`,
      status: OrganisationStatus.SUSPENDED,
    },
  });

  // -------------------------------------------------------------
  // TEST 1: Categories Search, Filter & Pagination
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Categories Search & Pagination ---');
  const catPrefix = `FilterCat-${timestamp}`;
  const cat1 = await prisma.category.create({
    data: { name: `${catPrefix} Spices`, description: 'Organic ground spices and herbs' },
  });
  const cat2 = await prisma.category.create({
    data: { name: `${catPrefix} Grains`, description: 'Rice and wheat grains' },
  });
  const cat3 = await prisma.category.create({
    data: { name: `${catPrefix} Beverages`, description: 'Tea and roasted coffee' },
  });

  // 1a. List with search
  const catSearchRes = await makeRequest('GET', `/api/v1/categories?search=${encodeURIComponent('spices')}`, undefined, superToken);
  assert(catSearchRes.status === 200, `Category search failed: ${JSON.stringify(catSearchRes.body)}`);
  assert(Array.isArray(catSearchRes.body.data.categories), 'categories should be an array');
  assert(catSearchRes.body.data.categories.some((c: any) => c.id === cat1.id), 'Category 1 should be found in search');
  assert(!catSearchRes.body.data.categories.some((c: any) => c.id === cat2.id), 'Category 2 should not match "spices"');

  // 1b. List with pagination
  const catPageRes = await makeRequest('GET', `/api/v1/categories?search=${encodeURIComponent(catPrefix)}&page=1&limit=2`, undefined, superToken);
  assert(catPageRes.status === 200, `Category pagination failed: ${JSON.stringify(catPageRes.body)}`);
  assert(catPageRes.body.data.categories.length === 2, `Expected 2 categories, got ${catPageRes.body.data.categories.length}`);
  assert(catPageRes.body.data.pagination.total === 3, `Expected total 3, got ${catPageRes.body.data.pagination.total}`);
  assert(catPageRes.body.data.pagination.page === 1, 'page should be 1');
  assert(catPageRes.body.data.pagination.limit === 2, 'limit should be 2');
  assert(catPageRes.body.data.pagination.totalPages === 2, 'totalPages should be 2');
  console.log('  ✔ Categories search and pagination validated');

  // -------------------------------------------------------------
  // TEST 2: Products Search, Filters & Pagination
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Products Search, Filters & Pagination ---');
  const prodSkuPrefix = `SKU-${timestamp}`;
  const prod1 = await prisma.product.create({
    data: {
      name: `Kashmiri Saffron ${timestamp}`,
      sku: `${prodSkuPrefix}-SAF`,
      description: 'Finest grade natural saffron',
      price: 500.0,
      categoryId: cat1.id,
      isActive: true,
    },
  });
  const prod2 = await prisma.product.create({
    data: {
      name: `Black Pepper Whole ${timestamp}`,
      sku: `${prodSkuPrefix}-PEP`,
      description: 'Malabar black pepper',
      price: 120.0,
      categoryId: cat1.id,
      isActive: false, // Inactive
    },
  });
  const prod3 = await prisma.product.create({
    data: {
      name: `Brown Basmati Rice ${timestamp}`,
      sku: `${prodSkuPrefix}-RIC`,
      description: 'Long grain brown rice',
      price: 80.0,
      categoryId: cat2.id,
      isActive: true,
    },
  });

  // 2a. Search by SKU
  const prodSkuRes = await makeRequest('GET', `/api/v1/products?search=${encodeURIComponent(`${prodSkuPrefix}-SAF`)}`, undefined, superToken);
  assert(prodSkuRes.status === 200, `Product SKU search failed: ${JSON.stringify(prodSkuRes.body)}`);
  assert(prodSkuRes.body.data.products.length === 1, 'Expected 1 product for SKU search');
  assert(prodSkuRes.body.data.products[0].id === prod1.id, 'Product ID mismatch in SKU search');

  // 2b. Filter by categoryId
  const prodCatRes = await makeRequest('GET', `/api/v1/products?categoryId=${cat1.id}`, undefined, superToken);
  assert(prodCatRes.status === 200, `Product category filter failed: ${JSON.stringify(prodCatRes.body)}`);
  assert(prodCatRes.body.data.products.every((p: any) => p.categoryId === cat1.id), 'All products must belong to cat1');

  // 2c. Filter by isActive
  const prodActiveRes = await makeRequest('GET', `/api/v1/products?search=${encodeURIComponent(prodSkuPrefix)}&isActive=true`, undefined, superToken);
  assert(prodActiveRes.status === 200, `Product active filter failed: ${JSON.stringify(prodActiveRes.body)}`);
  assert(prodActiveRes.body.data.products.every((p: any) => p.isActive === true), 'All products must be active');
  assert(prodActiveRes.body.data.products.length === 2, 'Expected 2 active products');

  // 2d. Price range filter (minPrice=100, maxPrice=300)
  const prodPriceRes = await makeRequest('GET', `/api/v1/products?search=${encodeURIComponent(prodSkuPrefix)}&minPrice=100&maxPrice=300`, undefined, superToken);
  assert(prodPriceRes.status === 200, `Product price range filter failed: ${JSON.stringify(prodPriceRes.body)}`);
  assert(prodPriceRes.body.data.products.length === 1, 'Expected exactly 1 product (Black Pepper 120)');
  assert(prodPriceRes.body.data.products[0].id === prod2.id, 'Expected product 2');

  // 2e. Pagination
  const prodPageRes = await makeRequest('GET', `/api/v1/products?search=${encodeURIComponent(prodSkuPrefix)}&page=1&limit=2`, undefined, superToken);
  assert(prodPageRes.status === 200, `Product pagination failed: ${JSON.stringify(prodPageRes.body)}`);
  assert(prodPageRes.body.data.products.length === 2, 'Expected 2 items on page 1');
  assert(prodPageRes.body.data.pagination.total === 3, 'Expected total 3');
  assert(prodPageRes.body.data.pagination.totalPages === 2, 'Expected totalPages 2');
  console.log('  ✔ Products search, filters (category, active, price range) and pagination validated');

  // -------------------------------------------------------------
  // TEST 3: Organisations Search, Filters & Pagination
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Organisations Search, Filters & Pagination ---');
  // 3a. Search by name or email
  const orgSearchRes = await makeRequest('GET', `/api/v1/organisations?search=${encodeURIComponent(`Apex Retailers ${timestamp}`)}`, undefined, superToken);
  assert(orgSearchRes.status === 200, `Org search failed: ${JSON.stringify(orgSearchRes.body)}`);
  assert(orgSearchRes.body.data.organisations.length === 1, 'Expected 1 organisation from search');
  assert(orgSearchRes.body.data.organisations[0].id === orgA.id, 'Org ID mismatch in search');

  // 3b. Filter by status (SUSPENDED)
  const orgStatusRes = await makeRequest('GET', `/api/v1/organisations?search=${encodeURIComponent(timestamp.toString())}&status=SUSPENDED`, undefined, superToken);
  assert(orgStatusRes.status === 200, `Org status filter failed: ${JSON.stringify(orgStatusRes.body)}`);
  assert(orgStatusRes.body.data.organisations.length === 1, 'Expected 1 suspended organisation');
  assert(orgStatusRes.body.data.organisations[0].id === orgB.id, 'Expected orgB (suspended)');

  // 3c. Filter by city (Delhi)
  const orgCityRes = await makeRequest('GET', `/api/v1/organisations?search=${encodeURIComponent(timestamp.toString())}&city=Delhi`, undefined, superToken);
  assert(orgCityRes.status === 200, `Org city filter failed: ${JSON.stringify(orgCityRes.body)}`);
  assert(orgCityRes.body.data.organisations.length === 1, 'Expected 1 organisation in Delhi');
  assert(orgCityRes.body.data.organisations[0].id === orgA.id, 'Expected orgA in Delhi');

  // 3d. Pagination
  const orgPageRes = await makeRequest('GET', `/api/v1/organisations?search=${encodeURIComponent(timestamp.toString())}&page=1&limit=1`, undefined, superToken);
  assert(orgPageRes.status === 200, `Org pagination failed: ${JSON.stringify(orgPageRes.body)}`);
  assert(orgPageRes.body.data.organisations.length === 1, 'Expected 1 org per page');
  assert(orgPageRes.body.data.pagination.total === 2, 'Expected total 2');
  assert(orgPageRes.body.data.pagination.totalPages === 2, 'Expected totalPages 2');
  console.log('  ✔ Organisations search, status filter, city filter, and pagination validated');

  // -------------------------------------------------------------
  // TEST 4: Users Search, Filters & Pagination
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Users Search, Filters & Pagination ---');
  // 4a. Search by name or email
  const userSearchRes = await makeRequest('GET', `/api/v1/users?search=${encodeURIComponent(`Apex Staff Member ${timestamp}`)}`, undefined, superToken);
  assert(userSearchRes.status === 200, `User search failed: ${JSON.stringify(userSearchRes.body)}`);
  assert(userSearchRes.body.data.users.length === 1, 'Expected 1 user from search');
  assert(userSearchRes.body.data.users[0].email === orgAStaffEmail, 'User email mismatch');

  // 4b. Filter by role (STAFF)
  const userRoleRes = await makeRequest('GET', `/api/v1/users?organisationId=${orgA.id}&role=STAFF`, undefined, superToken);
  assert(userRoleRes.status === 200, `User role filter failed: ${JSON.stringify(userRoleRes.body)}`);
  assert(userRoleRes.body.data.users.length === 1, 'Expected 1 staff member');
  assert(userRoleRes.body.data.users[0].role === UserRole.STAFF, 'Role mismatch');

  // 4c. Filter by organisationId
  const userOrgRes = await makeRequest('GET', `/api/v1/users?organisationId=${orgA.id}`, undefined, superToken);
  assert(userOrgRes.status === 200, `User org filter failed: ${JSON.stringify(userOrgRes.body)}`);
  assert(userOrgRes.body.data.users.length === 2, 'Expected 2 users for Org A (Admin and Staff)');

  // 4d. Pagination
  const userPageRes = await makeRequest('GET', `/api/v1/users?organisationId=${orgA.id}&page=1&limit=1`, undefined, superToken);
  assert(userPageRes.status === 200, `User pagination failed: ${JSON.stringify(userPageRes.body)}`);
  assert(userPageRes.body.data.users.length === 1, 'Expected 1 user on page 1');
  assert(userPageRes.body.data.pagination.total === 2, 'Expected total 2');
  assert(userPageRes.body.data.pagination.totalPages === 2, 'Expected totalPages 2');
  console.log('  ✔ Users search, role filter, organisation filter, and pagination validated');

  console.log('\n===========================================================');
  console.log('🎉 ALL SEARCH, FILTER & PAGINATION TESTS PASSED! 🎉');
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
