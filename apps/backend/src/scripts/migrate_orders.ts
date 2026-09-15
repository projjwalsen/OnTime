import { prisma } from '../lib/prisma';

async function main() {
  console.log('Running safe DDL for OrderStatus, orders, and order_items...');

  // 1. Create OrderStatus enum if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log('OrderStatus enum created/verified.');

  // 2. Create orders table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "orders" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderNumber" TEXT NOT NULL UNIQUE,
      "organisationId" TEXT NOT NULL,
      "createdByUserId" TEXT NOT NULL,
      "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
      "subtotal" DECIMAL(10, 2) NOT NULL,
      "taxAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      "totalAmount" DECIMAL(10, 2) NOT NULL,
      "notes" TEXT,
      "deliveryAddress" TEXT,
      "cancellationReason" TEXT,
      "cancelledAt" TIMESTAMP(3),
      "deliveredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "orders_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  console.log('Table orders created/verified.');

  // 3. Create indexes for orders
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_organisationId_idx" ON "orders"("organisationId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_createdByUserId_idx" ON "orders"("createdByUserId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON "orders"("orderNumber");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");`);
  console.log('Indexes for orders created/verified.');

  // 4. Create order_items table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_items" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "variantId" TEXT,
      "productName" TEXT NOT NULL,
      "productSku" TEXT NOT NULL,
      "variantWeight" TEXT,
      "unitPrice" DECIMAL(10, 2) NOT NULL,
      "quantity" INTEGER NOT NULL,
      "totalPrice" DECIMAL(10, 2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log('Table order_items created/verified.');

  // 5. Create indexes for order_items
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_items_variantId_idx" ON "order_items"("variantId");`);
  console.log('Indexes for order_items created/verified.');
}

main()
  .then(() => {
    console.log('Orders DDL migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Orders migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
