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

function makeMultipartUploadRequest(
  path: string,
  files: Array<{ fieldname: string; filename: string; contentType: string; content: Buffer }>,
  token?: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const crlf = '\r\n';

    const chunks: Buffer[] = [];

    for (const file of files) {
      chunks.push(
        Buffer.from(
          `--${boundary}${crlf}` +
            `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"${crlf}` +
            `Content-Type: ${file.contentType}${crlf}${crlf}`,
        ),
      );
      chunks.push(file.content);
      chunks.push(Buffer.from(crlf));
    }

    chunks.push(Buffer.from(`--${boundary}--${crlf}`));
    const payload = Buffer.concat(chunks);

    const req = http.request(
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length,
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
    req.write(payload);
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
  console.log('🧪 RUNNING SUPER ADMIN MEDIA UPLOAD TEST SUITE');
  console.log('===========================================================');

  // Start ephemeral server
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address() as any;
      port = address.port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[TestServer] Media test listening on ${baseUrl}`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const defaultPassword = 'Password123!';
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // Setup Super Admin user
  const superAdminEmail = `super.media.${timestamp}@ontime.com`;
  await prisma.user.create({
    data: {
      email: superAdminEmail,
      name: 'Super Media Admin',
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const superLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: superAdminEmail,
    password: defaultPassword,
  });
  assert(superLoginRes.status === 200, 'Super Admin login failed');
  const superToken = superLoginRes.body.data.tokens.accessToken;

  // Setup Retailer Org & Admin
  const org = await prisma.organisation.create({
    data: {
      name: `Media Test Org ${timestamp}`,
      email: `org.media.${timestamp}@test.com`,
      status: 'ACTIVE',
    },
  });

  const retailerAdminEmail = `retailer.media.${timestamp}@test.com`;
  await prisma.user.create({
    data: {
      email: retailerAdminEmail,
      name: 'Retailer Admin',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      organisationId: org.id,
      isActive: true,
    },
  });

  const retailerLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: retailerAdminEmail,
    password: defaultPassword,
  });
  assert(retailerLoginRes.status === 200, 'Retailer Admin login failed');
  const retailerToken = retailerLoginRes.body.data.tokens.accessToken;

  // 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  // -------------------------------------------------------------
  // TEST 1: Super Admin uploads a single product image
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Super Admin Uploads Single Image ---');
  const uploadRes1 = await makeMultipartUploadRequest(
    '/api/v1/media/upload',
    [
      {
        fieldname: 'files',
        filename: 'basmati-front.png',
        contentType: 'image/png',
        content: samplePngBuffer,
      },
    ],
    superToken,
  );

  console.log(
    'Upload 1 response status:',
    uploadRes1.status,
    'body:',
    JSON.stringify(uploadRes1.body),
  );
  assert(uploadRes1.status === 201, `Upload single failed: ${JSON.stringify(uploadRes1.body)}`);
  assert(uploadRes1.body.success === true, 'Response success should be true');
  assert(uploadRes1.body.data.files.length === 1, 'Expected 1 uploaded file item');
  assert(
    typeof uploadRes1.body.data.url === 'string' &&
      uploadRes1.body.data.url.includes('supabase.co'),
    'Expected Supabase public URL',
  );
  assert(
    uploadRes1.body.data.files[0].originalName === 'basmati-front.png',
    'Original filename should be preserved',
  );
  console.log(`  ✔ Super Admin uploaded single image successfully: ${uploadRes1.body.data.url}`);

  const uploadedUrl1 = uploadRes1.body.data.url;

  // -------------------------------------------------------------
  // TEST 2: Super Admin uploads multiple product images
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Super Admin Uploads Multiple Images ---');
  const uploadRes2 = await makeMultipartUploadRequest(
    '/api/v1/media/upload',
    [
      {
        fieldname: 'files',
        filename: 'rice-back.jpg',
        contentType: 'image/jpeg',
        content: samplePngBuffer,
      },
      {
        fieldname: 'files',
        filename: 'rice-nutritional.webp',
        contentType: 'image/webp',
        content: samplePngBuffer,
      },
    ],
    superToken,
  );

  assert(uploadRes2.status === 201, `Upload multiple failed: ${JSON.stringify(uploadRes2.body)}`);
  assert(uploadRes2.body.data.files.length === 2, 'Expected 2 uploaded files');
  assert(uploadRes2.body.data.urls.length === 2, 'Expected 2 URL strings in urls array');
  console.log('  ✔ Super Admin uploaded multiple images concurrently');

  const uploadedUrls = [uploadedUrl1, ...uploadRes2.body.data.urls];

  // -------------------------------------------------------------
  // TEST 3: Retailer Admin cannot upload (403 Forbidden)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Retailer Admin Upload Rejection (403 Forbidden) ---');
  const retailerUploadRes = await makeMultipartUploadRequest(
    '/api/v1/media/upload',
    [
      {
        fieldname: 'files',
        filename: 'hacked.png',
        contentType: 'image/png',
        content: samplePngBuffer,
      },
    ],
    retailerToken,
  );

  assert(
    retailerUploadRes.status === 403,
    `Expected 403 Forbidden for Retailer Admin, got ${retailerUploadRes.status}`,
  );
  console.log('  ✔ Retailer Admin correctly rejected with 403 Forbidden');

  // -------------------------------------------------------------
  // TEST 4: Unauthenticated upload rejection (401 Unauthorized)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Unauthenticated Upload Rejection (401 Unauthorized) ---');
  const unauthUploadRes = await makeMultipartUploadRequest(
    '/api/v1/media/upload',
    [
      {
        fieldname: 'files',
        filename: 'test.png',
        contentType: 'image/png',
        content: samplePngBuffer,
      },
    ],
    undefined,
  );

  assert(
    unauthUploadRes.status === 401,
    `Expected 401 Unauthorized for missing token, got ${unauthUploadRes.status}`,
  );
  console.log('  ✔ Unauthenticated upload correctly rejected with 401');

  // -------------------------------------------------------------
  // TEST 5: Unsupported MIME type rejection (400 Bad Request)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Unsupported MIME Type Rejection (400 Bad Request) ---');
  const invalidMimeRes = await makeMultipartUploadRequest(
    '/api/v1/media/upload',
    [
      {
        fieldname: 'files',
        filename: 'document.pdf',
        contentType: 'application/pdf',
        content: Buffer.from('%PDF-1.4 test content'),
      },
    ],
    superToken,
  );

  assert(
    invalidMimeRes.status === 400,
    `Expected 400 for PDF upload, got ${invalidMimeRes.status}`,
  );
  console.log('  ✔ Non-image file type rejected with 400 Bad Request');

  // -------------------------------------------------------------
  // TEST 6: Create Product with Uploaded Images Gallery
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Create Product with Uploaded Images Array ---');
  const cat = await prisma.category.create({
    data: { name: `Grains & Rice ${timestamp}` },
  });

  const createProdRes = await makeRequest(
    'POST',
    '/api/v1/products',
    {
      name: 'Organic Jasmine Rice',
      sku: `JASMIN-${timestamp}`,
      description: 'Fragrant jasmine rice from organic farms',
      price: 180.0,
      categoryId: cat.id,
      unit: 'kg',
      images: uploadedUrls,
      packagingNote: 'Airtight nitrogen flushed packaging',
      variants: [
        {
          weight: '1kg',
          description: '1kg bag',
          image: uploadedUrls[0],
          price: 190.0,
        },
        {
          weight: '5kg',
          description: '5kg bag',
          image: uploadedUrls[1],
          price: 850.0,
        },
      ],
    },
    superToken,
  );

  assert(
    createProdRes.status === 201,
    `Create product failed: ${JSON.stringify(createProdRes.body)}`,
  );
  const createdProd = createProdRes.body.data.product;
  assert(createdProd.images.length === 3, `Expected 3 images, got ${createdProd.images.length}`);
  assert(createdProd.images[0] === uploadedUrls[0], 'First image URL mismatch');
  assert(createdProd.variants[0].image === uploadedUrls[0], 'Variant 1 image mismatch');
  assert(createdProd.variants[1].image === uploadedUrls[1], 'Variant 2 image mismatch');
  console.log('  ✔ Product created with uploaded Supabase image URLs and variant images');

  console.log('\n===========================================================');
  console.log('🎉 ALL SUPER ADMIN MEDIA UPLOAD TESTS PASSED! 🎉');
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
