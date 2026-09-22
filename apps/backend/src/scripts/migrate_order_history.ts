import { prisma } from '../lib/prisma';

async function migrateOrderHistory() {
  console.log('🔄 Applying OrderHistory table migration...');
  
  // 1. Create order_history table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_history" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "status" "OrderStatus" NOT NULL,
      "action" TEXT NOT NULL,
      "note" TEXT,
      "performedByUserId" TEXT,
      "performedByUserName" TEXT,
      "performedByUserRole" "UserRole",
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  ✔ Created order_history table');

  // 2. Add foreign keys if not exists
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_history_orderId_fkey'
      ) THEN
        ALTER TABLE "order_history"
        ADD CONSTRAINT "order_history_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_history_performedByUserId_fkey'
      ) THEN
        ALTER TABLE "order_history"
        ADD CONSTRAINT "order_history_performedByUserId_fkey"
        FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('  ✔ Foreign keys added');

  // 3. Create indexes
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_history_orderId_idx" ON "order_history"("orderId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_history_createdAt_idx" ON "order_history"("createdAt");
  `);
  console.log('  ✔ Indexes created');

  console.log('✅ OrderHistory database migration completed successfully!');
}

migrateOrderHistory()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
