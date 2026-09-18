import { prisma } from '../lib/prisma';

async function main() {
  console.log('Applying draft orders table migration...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "draft_orders" (
        "id" TEXT NOT NULL,
        "organisationId" TEXT NOT NULL,
        "createdByUserId" TEXT NOT NULL,
        "title" TEXT,
        "notes" TEXT,
        "deliveryAddress" TEXT,
        "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "draft_orders_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "draft_order_items" (
        "id" TEXT NOT NULL,
        "draftOrderId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "variantId" TEXT,
        "productName" TEXT NOT NULL,
        "productSku" TEXT NOT NULL,
        "variantWeight" TEXT,
        "unitPrice" DECIMAL(10,2) NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "totalPrice" DECIMAL(10,2) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "draft_order_items_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "draft_orders_organisationId_idx" ON "draft_orders"("organisationId");
    CREATE INDEX IF NOT EXISTS "draft_orders_createdByUserId_idx" ON "draft_orders"("createdByUserId");
    CREATE INDEX IF NOT EXISTS "draft_orders_createdAt_idx" ON "draft_orders"("createdAt");
    CREATE INDEX IF NOT EXISTS "draft_order_items_draftOrderId_idx" ON "draft_order_items"("draftOrderId");
    CREATE INDEX IF NOT EXISTS "draft_order_items_productId_idx" ON "draft_order_items"("productId");
    CREATE INDEX IF NOT EXISTS "draft_order_items_variantId_idx" ON "draft_order_items"("variantId");
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'draft_orders_organisationId_fkey'
        ) THEN
            ALTER TABLE "draft_orders" ADD CONSTRAINT "draft_orders_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'draft_orders_createdByUserId_fkey'
        ) THEN
            ALTER TABLE "draft_orders" ADD CONSTRAINT "draft_orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'draft_order_items_draftOrderId_fkey'
        ) THEN
            ALTER TABLE "draft_order_items" ADD CONSTRAINT "draft_order_items_draftOrderId_fkey" FOREIGN KEY ("draftOrderId") REFERENCES "draft_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'draft_order_items_productId_fkey'
        ) THEN
            ALTER TABLE "draft_order_items" ADD CONSTRAINT "draft_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'draft_order_items_variantId_fkey'
        ) THEN
            ALTER TABLE "draft_order_items" ADD CONSTRAINT "draft_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END $$;
  `);

  console.log('Draft orders tables and foreign keys successfully created!');
}

void main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
