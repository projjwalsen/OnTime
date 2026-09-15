import { prisma } from '../lib/prisma';

async function main() {
  console.log('Altering products table to add images and packagingNote...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "products" 
    ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "packagingNote" TEXT;
  `);
  console.log('Columns added successfully!');
}

main()
  .catch((e) => {
    console.error('Error altering table:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
