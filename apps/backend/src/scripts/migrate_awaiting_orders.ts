import { prisma } from '../lib/prisma';

async function main() {
  console.log('Running safe DDL for OrderStatus enum extension and order fields...');

  // 1. Add AWAITING and REJECTED enum values
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log('OrderStatus enum extended with AWAITING and REJECTED.');

  // 2. Add columns to orders table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "modificationNote" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "modifiedAt" TIMESTAMP(3);
  `);
  console.log('Columns modificationNote and modifiedAt added to orders.');

  // 3. Add column to order_items table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "originalQuantity" INTEGER;
  `);
  console.log('Column originalQuantity added to order_items.');
}

main()
  .then(() => {
    console.log('Awaiting & order fields migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
