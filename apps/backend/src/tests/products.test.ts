import http from 'http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { UserRole } from '@ontime/shared';
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
  console.log('🧪 RUNNING PRODUCTS & PRODUCT VARIANTS TEST SUITE');
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

  const superAdminEmail = `superadmin.prodtest.${Date.now()}@ontime.com`;
  const password = 'SuperPassword123!';
  const passwordHash = await hashPassword(password);

  // Setup super admin user
  await prisma.user.create({
    data: {
      email: superAdminEmail,
      name: 'Super Admin Prod Tester',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      organisationId: null,
      isActive: true,
    },
  });

  // Login super admin to obtain bearer token
  const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: superAdminEmail,
    password,
  });
  assert(loginRes.status === 200, `Login failed: ${JSON.stringify(loginRes.body)}`);
  const token = loginRes.body.data.tokens.accessToken;

  // Create Category
  const catRes = await makeRequest(
    'POST',
    '/api/v1/categories',
    {
      name: `Edible Oils ${Date.now()}`,
      description: 'Cold pressed and refined edible oils',
    },
    token,
  );
  assert(catRes.status === 201, `Create category failed: ${JSON.stringify(catRes.body)}`);
  const categoryId = catRes.body.data.category.id;

  // Test 1: Create Product with multiple variants (weight, description, image, price) + images + packagingNote
  console.log(
    '\n--- TEST 1: Create product with multiple variants, images list, and packaging note ---',
  );
  const prodSku = `OIL-${Date.now()}`;
  const createRes = await makeRequest(
    'POST',
    '/api/v1/products',
    {
      name: 'Cold Pressed Virgin Coconut Oil',
      sku: prodSku,
      description: 'Pure 100% natural virgin coconut oil',
      price: 200.0,
      categoryId,
      unit: 'bottle',
      images: [
        'https://cdn.example.com/products/cno-front.jpg',
        'https://cdn.example.com/products/cno-back.jpg',
        'https://cdn.example.com/products/cno-box.jpg',
      ],
      packagingNote: 'Packed in corrugated 5-ply cartons with bubble wrap protection.',
      variants: [
        {
          weight: '250ml',
          description: 'Compact travel glass bottle',
          image: 'https://cdn.example.com/cno-250ml.jpg',
          price: 120.0,
        },
        {
          weight: '500ml',
          description: 'Standard kitchen bottle',
          image: 'https://cdn.example.com/cno-500ml.jpg',
          price: 220.0,
        },
        {
          weight: '1 Litre',
          description: 'Value family tin pack',
          image: 'https://cdn.example.com/cno-1l.jpg',
          price: 400.0,
        },
      ],
    },
    token,
  );

  assert(createRes.status === 201, `Create product failed: ${JSON.stringify(createRes.body)}`);
  const createdProd = createRes.body.data.product;
  assert(createdProd.name === 'Cold Pressed Virgin Coconut Oil', 'Product name mismatch');
  assert(Array.isArray(createdProd.images), 'images should be an array');
  assert(
    createdProd.images.length === 3,
    `Expected 3 product images, got ${createdProd.images.length}`,
  );
  assert(
    createdProd.images[0] === 'https://cdn.example.com/products/cno-front.jpg',
    'Image 0 mismatch',
  );
  assert(
    createdProd.packagingNote === 'Packed in corrugated 5-ply cartons with bubble wrap protection.',
    'packagingNote mismatch',
  );
  assert(Array.isArray(createdProd.variants), 'variants should be an array');
  assert(
    createdProd.variants.length === 3,
    `Expected 3 variants, got ${createdProd.variants.length}`,
  );
  assert(createdProd.variants[0].weight === '250ml', 'Variant 0 weight mismatch');
  assert(createdProd.variants[0].price === 120.0, 'Variant 0 price mismatch');
  assert(
    createdProd.variants[0].image === 'https://cdn.example.com/cno-250ml.jpg',
    'Variant 0 image mismatch',
  );
  assert(createdProd.variants[1].weight === '500ml', 'Variant 1 weight mismatch');
  assert(createdProd.variants[2].weight === '1 Litre', 'Variant 2 weight mismatch');
  console.log('  ✔ Product created with 3 images, packaging note, and 3 variants successfully');

  // Test 2: Get Product by ID
  console.log('\n--- TEST 2: Fetch product by ID with images, packaging note, and variants ---');
  const getRes = await makeRequest('GET', `/api/v1/products/${createdProd.id}`, undefined, token);
  assert(getRes.status === 200, `Get product failed: ${JSON.stringify(getRes.body)}`);
  assert(getRes.body.data.product.images.length === 3, 'Fetched product images count mismatch');
  assert(
    getRes.body.data.product.packagingNote ===
      'Packed in corrugated 5-ply cartons with bubble wrap protection.',
    'Fetched packagingNote mismatch',
  );
  assert(getRes.body.data.product.variants.length === 3, 'Fetched product variants count mismatch');
  console.log('  ✔ Fetched product by ID includes images list, packaging note, and all 3 variants');

  // Test 3: List Products
  console.log(
    '\n--- TEST 3: List products includes images, packaging note, and search by packaging note ---',
  );
  const listRes = await makeRequest('GET', '/api/v1/products?search=corrugated', undefined, token);
  assert(listRes.status === 200, `List products failed: ${JSON.stringify(listRes.body)}`);
  const foundProd = listRes.body.data.products.find((p: any) => p.id === createdProd.id);
  assert(!!foundProd, 'Product not found in search by packaging note');
  assert(foundProd.images.length === 3, 'Listed product images count mismatch');
  assert(foundProd.packagingNote !== null, 'Listed product packagingNote should not be null');
  assert(foundProd.variants.length === 3, 'Listed product variants count mismatch');
  console.log('  ✔ Product listing and search by packagingNote verified');

  // Test 4: Update Product Images and Packaging Note
  console.log('\n--- TEST 4: Update product images and packaging note ---');
  const updateRes = await makeRequest(
    'PATCH',
    `/api/v1/products/${createdProd.id}`,
    {
      price: 210.0,
      images: [
        'https://cdn.example.com/products/cno-front-v2.jpg',
        'https://cdn.example.com/products/cno-detail-v2.jpg',
      ],
      packagingNote: 'Fragile: Shipped in reinforced insulated boxes.',
      variants: [
        {
          weight: '500ml',
          description: 'Updated 500ml bottle',
          image: 'https://cdn.example.com/cno-500ml-v2.jpg',
          price: 230.0,
        },
        {
          weight: '5 Litre Can',
          description: 'Bulk commercial can',
          image: 'https://cdn.example.com/cno-5l.jpg',
          price: 1800.0,
        },
      ],
    },
    token,
  );
  assert(updateRes.status === 200, `Update product failed: ${JSON.stringify(updateRes.body)}`);
  const updatedProd = updateRes.body.data.product;
  assert(
    updatedProd.images.length === 2,
    `Expected 2 images after update, got ${updatedProd.images.length}`,
  );
  assert(
    updatedProd.images[0] === 'https://cdn.example.com/products/cno-front-v2.jpg',
    'Updated image 0 mismatch',
  );
  assert(
    updatedProd.packagingNote === 'Fragile: Shipped in reinforced insulated boxes.',
    'Updated packagingNote mismatch',
  );
  assert(
    updatedProd.variants.length === 2,
    `Expected 2 variants after update, got ${updatedProd.variants.length}`,
  );
  assert(updatedProd.variants[0].weight === '500ml', 'Updated variant 0 weight mismatch');
  assert(updatedProd.variants[0].price === 230.0, 'Updated variant 0 price mismatch');
  assert(updatedProd.variants[1].weight === '5 Litre Can', 'Updated variant 1 weight mismatch');
  assert(updatedProd.variants[1].price === 1800.0, 'Updated variant 1 price mismatch');
  console.log('  ✔ Product images, packaging note, and variants updated successfully');

  // Test 5: Single `variant` payload backward compatibility
  console.log('\n--- TEST 5: Create product with single variant object ---');
  const singleVariantSku = `SINGLE-${Date.now()}`;
  const singleVariantRes = await makeRequest(
    'POST',
    '/api/v1/products',
    {
      name: 'Organic Sesame Oil',
      sku: singleVariantSku,
      price: 150.0,
      categoryId,
      variant: {
        weight: '500ml',
        description: 'Glass bottle',
        image: 'https://cdn.example.com/sesame-500ml.jpg',
        price: 150.0,
      },
    },
    token,
  );
  assert(
    singleVariantRes.status === 201,
    `Single variant create failed: ${JSON.stringify(singleVariantRes.body)}`,
  );
  assert(singleVariantRes.body.data.product.variants.length === 1, 'Expected 1 normalized variant');
  assert(
    singleVariantRes.body.data.product.variants[0].weight === '500ml',
    'Normalized variant weight mismatch',
  );
  console.log('  ✔ Single variant object normalized and persisted');

  // Test 6: Cascade Delete Product removes associated variants
  console.log('\n--- TEST 6: Cascade delete product removes variants from DB ---');
  const deleteProdId = singleVariantRes.body.data.product.id;
  await prisma.product.delete({
    where: { id: deleteProdId },
  });
  const remainingVariants = await prisma.productVariant.findMany({
    where: { productId: deleteProdId },
  });
  assert(remainingVariants.length === 0, 'Variants should have been deleted on cascade');
  console.log('  ✔ Foreign key cascade deletion verified for product_variants');

  // Test 7: Global Search across Category Name, Name, SKU, ID, Description, Unit, Packaging Note, and Price
  console.log('\n--- TEST 7: Global search across all catalog fields (GET /api/v1/products?search=...) ---');
  
  // Create a unique category and product to test search capabilities
  const spiceCatName = `Organic Spices & Herbs ${Date.now()}`;
  const spiceCatRes = await makeRequest(
    'POST',
    '/api/v1/categories',
    {
      name: spiceCatName,
      description: 'Aromatic farm-fresh organic spices',
    },
    token,
  );
  assert(spiceCatRes.status === 201, 'Create spice category failed');
  const spiceCatId = spiceCatRes.body.data.category.id;

  const spiceSku = `CARDAMOM-${Date.now()}`;
  const spiceProdRes = await makeRequest(
    'POST',
    '/api/v1/products',
    {
      name: 'Premium Green Cardamom Pods',
      sku: spiceSku,
      description: 'Handpicked whole 8mm bold green cardamom pods from Idukki',
      price: 350.0,
      categoryId: spiceCatId,
      unit: 'pouch',
      packagingNote: 'Vacuum sealed in multi-layer foil pouch for aroma preservation',
      variants: [
        {
          weight: '100g',
          description: 'Zip pouch 100g',
          price: 350.0,
        },
        {
          weight: '500g',
          description: 'Aroma lock tin 500g',
          price: 1600.0,
        },
      ],
    },
    token,
  );
  assert(spiceProdRes.status === 201, 'Create spice product failed');
  const spiceProd = spiceProdRes.body.data.product;

  // 7a: Search by Category Name
  const searchCatRes = await makeRequest(
    'GET',
    `/api/v1/products?search=${encodeURIComponent('Organic Spices')}`,
    undefined,
    token,
  );
  assert(searchCatRes.status === 200, 'Search by category name failed');
  assert(
    searchCatRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by category name',
  );
  console.log('  ✔ Global search by Category Name matched successfully');

  // 7b: Search by Unit
  const searchUnitRes = await makeRequest(
    'GET',
    `/api/v1/products?search=pouch`,
    undefined,
    token,
  );
  assert(searchUnitRes.status === 200, 'Search by unit failed');
  assert(
    searchUnitRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by unit',
  );
  console.log('  ✔ Global search by Unit matched successfully');

  // 7c: Search by Packaging Note
  const searchPackRes = await makeRequest(
    'GET',
    `/api/v1/products?search=foil%20pouch`,
    undefined,
    token,
  );
  assert(searchPackRes.status === 200, 'Search by packaging note failed');
  assert(
    searchPackRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by packaging note',
  );
  console.log('  ✔ Global search by Packaging Note matched successfully');

  // 7d: Search by SKU
  const searchSkuRes = await makeRequest(
    'GET',
    `/api/v1/products?search=${spiceSku}`,
    undefined,
    token,
  );
  assert(searchSkuRes.status === 200, 'Search by SKU failed');
  assert(
    searchSkuRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by SKU',
  );
  console.log('  ✔ Global search by SKU matched successfully');

  // 7e: Search by ID
  const searchIdRes = await makeRequest(
    'GET',
    `/api/v1/products?search=${spiceProd.id}`,
    undefined,
    token,
  );
  assert(searchIdRes.status === 200, 'Search by ID failed');
  assert(
    searchIdRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by ID',
  );
  console.log('  ✔ Global search by ID matched successfully');

  // 7f: Search by Price number
  const searchPriceRes = await makeRequest(
    'GET',
    `/api/v1/products?search=350`,
    undefined,
    token,
  );
  assert(searchPriceRes.status === 200, 'Search by price failed');
  assert(
    searchPriceRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by price number',
  );
  console.log('  ✔ Global search by numeric Price matched successfully');

  // 7g: Search by Variant Weight
  const searchVariantRes = await makeRequest(
    'GET',
    `/api/v1/products?search=100g`,
    undefined,
    token,
  );
  assert(searchVariantRes.status === 200, 'Search by variant weight failed');
  assert(
    searchVariantRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Product not found when searching by variant weight',
  );
  console.log('  ✔ Global search by Variant Weight matched successfully');

  // Test 8: Specific field-level filter parameters
  console.log('\n--- TEST 8: Specific field filters (categoryName, unit, packagingNote, sku, price range) ---');
  const fieldFilterRes = await makeRequest(
    'GET',
    `/api/v1/products?categoryName=${encodeURIComponent('Spices')}&unit=pouch&sku=${spiceSku}&minPrice=300&maxPrice=400`,
    undefined,
    token,
  );
  assert(fieldFilterRes.status === 200, 'Specific field filtering failed');
  assert(
    fieldFilterRes.body.data.products.length >= 1 &&
      fieldFilterRes.body.data.products.some((p: any) => p.id === spiceProd.id),
    'Expected product to match compound specific filters',
  );
  console.log('  ✔ Specific field filters (categoryName, unit, sku, minPrice, maxPrice) verified');

  console.log('\n===========================================================');
  console.log('🎉 ALL PRODUCT & VARIANT TESTS PASSED! 🎉');
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
