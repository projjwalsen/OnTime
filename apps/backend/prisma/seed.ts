import { UserRole, OrganisationStatus, InvitationStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function hash(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('Seeding initial database records...');

  const defaultPasswordHash = await hash('Password123!');

  // Clean up any previously created test invite user
  await prisma.user.deleteMany({
    where: { email: 'newstaff@apexretailers.com' },
  });

  // 1. Seed Super Admin (Platform Owner - no organisationId)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@ontime.com' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@ontime.com',
      name: 'Platform Super Admin',
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
      organisationId: null,
      isActive: true,
    },
  });
  console.log('✔ Super Admin seeded:', superAdmin.email);

  // 2. Seed Retailer Organisation (Customer Tenant)
  const organisation = await prisma.organisation.upsert({
    where: { email: 'contact@apexretailers.com' },
    update: {
      name: 'Apex Retailers Ltd',
      status: OrganisationStatus.ACTIVE,
    },
    create: {
      name: 'Apex Retailers Ltd',
      email: 'contact@apexretailers.com',
      mobile: '+91 9876543210',
      address: '101 Commercial Street, Suite 4B',
      area: 'Bandra West',
      city: 'Mumbai',
      taxNumber: 'GSTIN27AAAAA0000A1Z5',
      status: OrganisationStatus.ACTIVE,
    },
  });
  console.log('✔ Retailer Organisation seeded:', organisation.name);

  // 3. Seed Organisation Admin (Customer Primary Admin)
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@apexretailers.com' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      organisationId: organisation.id,
      isActive: true,
    },
    create: {
      email: 'admin@apexretailers.com',
      name: 'Sarah Admin (Apex)',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      organisationId: organisation.id,
      isActive: true,
    },
  });
  console.log('✔ Organisation Admin seeded:', orgAdmin.email);

  // 4. Seed Organisation Staff (Customer Staff User)
  const orgStaff = await prisma.user.upsert({
    where: { email: 'staff@apexretailers.com' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.STAFF,
      organisationId: organisation.id,
      isActive: true,
    },
    create: {
      email: 'staff@apexretailers.com',
      name: 'John Staff (Apex)',
      passwordHash: defaultPasswordHash,
      role: UserRole.STAFF,
      organisationId: organisation.id,
      isActive: true,
    },
  });
  console.log('✔ Organisation Staff seeded:', orgStaff.email);

  // 5. Seed a pending invitation for testing accept-invite workflow
  const inviteToken = 'invite-test-token-apex-staff-2026';
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.organisationInvitation.upsert({
    where: { token: inviteToken },
    update: {
      role: UserRole.STAFF,
      status: InvitationStatus.PENDING,
      expiresAt,
    },
    create: {
      email: 'newstaff@apexretailers.com',
      token: inviteToken,
      role: UserRole.STAFF,
      organisationId: organisation.id,
      status: InvitationStatus.PENDING,
      expiresAt,
    },
  });
  console.log('✔ Sample Organisation Invitation seeded for:', invitation.email);

  // 6. Seed Complete Client Product Catalog
  const clientCatalog = [
    // 1. SAUCE
    {
      category: 'SAUCE',
      name: 'LKK PANDA OYSTER SAUCE 1300660798',
      sku: 'SAU-001',
      unit: '6 X 2.2KG',
      price: 26.0,
      packagingNote: 'Pack of 6 bottles (2.2kg each)',
    },
    {
      category: 'SAUCE',
      name: 'TABASCO RED SAUCE',
      sku: 'SAU-002',
      unit: '6 X 12 X 60ML',
      price: 7.15,
      packagingNote: 'Pack of 6 x 12 bottles (60ml each)',
    },
    {
      category: 'SAUCE',
      name: 'SAPORITO HOT PEPPER SAUCE',
      sku: 'SAU-003',
      unit: '36 X 60ML',
      price: 4.0,
      packagingNote: 'Pack of 36 bottles (60ml each)',
    },
    {
      category: 'SAUCE',
      name: 'KIKKOMAN SOY SAUCE - FANCY GRADE KSE11842-01',
      sku: 'SAU-038',
      unit: '6 X 1.6LTR',
      price: 28.0,
      packagingNote: 'Pack of 6 bottles (1.6L each)',
    },
    {
      category: 'SAUCE',
      name: 'SAPORITO TOMATO SACHET',
      sku: 'SAU-028',
      unit: '1000 X 10GM',
      price: 100.0,
      packagingNote: 'Master carton containing 1000 sachets of 10g',
    },

    // 2. BREAKFAST
    {
      category: 'BREAKFAST',
      name: 'SAPORITO BAKED BEANS IN TOMATO SAUCE',
      sku: 'BRK-004',
      unit: '6 X 2.7KG',
      price: 18.0,
      packagingNote: 'Pack of 6 cans (2.7kg each)',
    },

    // 3. MUSHROOM
    {
      category: 'MUSHROOM',
      name: 'YOWE DRIED MUSHROOM "LC" 3-4CM',
      sku: 'MSH-006',
      unit: '6 X 500GM',
      price: 25.0,
      packagingNote: 'Pack of 6 packets (500g each)',
    },
    {
      category: 'MUSHROOM',
      name: 'YOWE MUSHROOM WHOLE',
      sku: 'MSH-007',
      unit: '6 X 2.84KG',
      price: 25.0,
      packagingNote: 'Pack of 6 cans (2.84kg each)',
    },
    {
      category: 'MUSHROOM',
      name: 'YOWE MUSHROOM PIECES & STEMS',
      sku: 'MSH-008',
      unit: '6 X 2.84KG',
      price: 25.0,
      packagingNote: 'Pack of 6 cans (2.84kg each)',
    },

    // 4. PICKLE
    {
      category: 'PICKLE',
      name: 'FIGARO CAPERS IN VINEGAR',
      sku: 'PCK-012',
      unit: '6 X 920GM',
      price: 25.0,
      packagingNote: 'Pack of 6 jars (920g each)',
    },
    {
      category: 'PICKLE',
      name: 'SAPORITO SUNDRIED TOMATO IN SUNFLOWER OIL',
      sku: 'PCK-005',
      unit: '2 X 3KG',
      price: 72.0,
      packagingNote: 'Pack of 2 jars (3kg each)',
    },
    {
      category: 'PICKLE',
      name: 'PINK GINGER SLICED FOR SUSHI - GARI SHOGA',
      sku: 'PCK-037',
      unit: '10 X 1.5KG',
      price: 17.5,
      packagingNote: 'Pack of 10 pouches (1.5kg each)',
    },

    // 5. OLIVE
    {
      category: 'OLIVE',
      name: 'SAPORITO KALAMATA OLIVE PITTED',
      sku: 'OLV-009',
      unit: '6 X 3.3KG',
      price: 62.0,
      packagingNote: 'Pack of 6 jars (3.3kg each)',
    },
    {
      category: 'OLIVE',
      name: 'SAPORITO WHOLE GREEN OLIVE',
      sku: 'OLV-034',
      unit: '6 X 3KG',
      price: 30.0,
      packagingNote: 'Pack of 6 jars (3kg each)',
    },
    {
      category: 'OLIVE',
      name: 'SAPORITO SLICED BLACK OLIVE',
      sku: 'OLV-035',
      unit: '6 X 3KG',
      price: 30.0,
      packagingNote: 'Pack of 6 jars (3kg each)',
    },
    {
      category: 'OLIVE',
      name: 'SAPORITO PITTED BLACK OLIVE',
      sku: 'OLV-036',
      unit: '6 X 3KG',
      price: 30.0,
      packagingNote: 'Pack of 6 jars (3kg each)',
    },

    // 6. OIL
    {
      category: 'OIL',
      name: 'SAPORRINI BLENDED POMACE OLIVE OIL "ITALY" - PET BTL',
      sku: 'OIL-010',
      unit: '2 X 5 LTR',
      price: 85.0,
      packagingNote: 'Pack of 2 PET bottles (5L each)',
    },

    // 7. PASTA
    {
      category: 'PASTA',
      name: 'SAPORRINI PENNE',
      sku: 'PST-015',
      unit: '20 X 500GM',
      price: 4.25,
      packagingNote: 'Carton of 20 packets (500g each)',
    },
    {
      category: 'PASTA',
      name: 'SAPORITO PENNE ZITI RIGATI',
      sku: 'PST-016',
      unit: '24 X 500GM',
      price: 4.25,
      packagingNote: 'Carton of 24 packets (500g each)',
    },
    {
      category: 'PASTA',
      name: 'SAPORITO FUSILLI',
      sku: 'PST-017',
      unit: '24 X 500GM',
      price: 4.25,
      packagingNote: 'Carton of 24 packets (500g each)',
    },
    {
      category: 'PASTA',
      name: 'SAPORRINI CHIFFERINI RIGATI (SMALL ELBOW)',
      sku: 'PST-018',
      unit: '20 X 500GM',
      price: 4.25,
      packagingNote: 'Carton of 20 packets (500g each)',
    },
    {
      category: 'PASTA',
      name: 'SAPORITO SPAGHETTI RISTORANTE',
      sku: 'PST-019',
      unit: '24 X 500GM',
      price: 4.25,
      packagingNote: 'Carton of 24 packets (500g each)',
    },
    {
      category: 'PASTA',
      name: 'SAPORITO LINGUINE',
      sku: 'PST-020',
      unit: '24 X 500GM',
      price: 4.25,
      packagingNote: 'Carton of 24 packets (500g each)',
    },

    // 8. CURRY PASTE
    {
      category: 'CURRY PASTE',
      name: 'MAE PLOY RED CURRY PASTE',
      sku: 'CRP-014-RED',
      unit: '12 X 1KG',
      price: 18.0,
      packagingNote: 'Pack of 12 tubs (1kg each)',
    },
    {
      category: 'CURRY PASTE',
      name: 'MAE PLOY YELLOW CURRY PASTE',
      sku: 'CRP-014-YEL',
      unit: '12 X 1KG',
      price: 18.0,
      packagingNote: 'Pack of 12 tubs (1kg each)',
    },
    {
      category: 'CURRY PASTE',
      name: 'MAE PLOY GREEN CURRY PASTE',
      sku: 'CRP-014-GRN',
      unit: '12 X 1KG',
      price: 18.0,
      packagingNote: 'Pack of 12 tubs (1kg each)',
    },

    // 9. SPICES
    {
      category: 'SPICES',
      name: 'SAPORITO SWEET PAPRIKA 120 ASTA POWDER',
      sku: 'SPC-013',
      unit: '12 X 1KG',
      price: 35.0,
      packagingNote: 'Pack of 12 packets (1kg each)',
    },
    {
      category: 'SPICES',
      name: 'YOWE WHITE PEPPER WHOLE "LC"',
      sku: 'SPC-029',
      unit: '20 X 500GM',
      price: 35.0,
      packagingNote: 'Pack of 20 packets (500g each)',
    },
    {
      category: 'SPICES',
      name: 'BLACK PEPPER WHOLE',
      sku: 'SPC-030',
      unit: '20 X 500GM',
      price: 25.0,
      packagingNote: 'Pack of 20 packets (500g each)',
    },

    // 10. SEEDS
    {
      category: 'SEEDS',
      name: 'YOWE WHITE SESAME SEED "LC"',
      sku: 'SED-031-WHT',
      unit: '40 X 500GM',
      price: 12.0,
      packagingNote: 'Pack of 40 packets (500g each)',
    },
    {
      category: 'SEEDS',
      name: 'YOWE BLACK SESAME SEED "LC"',
      sku: 'SED-031-BLK',
      unit: '40 X 500GM',
      price: 12.0,
      packagingNote: 'Pack of 40 packets (500g each)',
    },

    // 11. VINEGAR
    {
      category: 'VINEGAR',
      name: 'SAPORITO BALSAMIC VINEGAR',
      sku: 'VNG-023',
      unit: '12 X 500ML',
      price: 7.5,
      packagingNote: 'Pack of 12 bottles (500ml each)',
    },
    {
      category: 'VINEGAR',
      name: 'HON MIRIN',
      sku: 'VNG-033',
      unit: '6 X 1.8LTR',
      price: 32.0,
      packagingNote: 'Pack of 6 bottles (1.8L each)',
    },

    // 12. CORN
    {
      category: 'CORN',
      name: 'YOWE CREAM CORN',
      sku: 'CRN-022',
      unit: '24 X 425GM',
      price: 3.5,
      packagingNote: 'Pack of 24 cans (425g each)',
    },
    {
      category: 'CORN',
      name: 'YOWE WHOLE KERNEL CORN',
      sku: 'CRN-023',
      unit: '24 X 425GM',
      price: 3.5,
      packagingNote: 'Pack of 24 cans (425g each)',
    },

    // 13. BREADCRUMBS
    {
      category: 'BREADCRUMBS',
      name: 'YOWE WHITE BREAD CRUMBS',
      sku: 'BCR-021',
      unit: '10 X 1KG',
      price: 12.0,
      packagingNote: 'Pack of 10 packets (1kg each)',
    },

    // 14. JUICE
    {
      category: 'JUICE',
      name: 'TWIST MANGO JUICE',
      sku: 'JCE-025',
      unit: '12 X 1 LTR',
      price: 4.25,
      packagingNote: 'Pack of 12 cartons (1L each)',
    },

    // 15. CANNED FRUITS & VEGETABLES
    {
      category: 'CANNED FRUITS & VEGETABLES',
      name: 'SAPORITO JALAPENO PEPPER SLICED',
      sku: 'CFV-026',
      unit: '6 X 2.9KG',
      price: 25.0,
      packagingNote: 'Pack of 6 cans (2.9kg each)',
    },
    {
      category: 'CANNED FRUITS & VEGETABLES',
      name: 'YOWE LYCHEE IN SYRUP',
      sku: 'CFV-024',
      unit: '12 X 565GM',
      price: 7.0,
      packagingNote: 'Pack of 12 cans (565g each)',
    },

    // 16. NOODLE
    {
      category: 'NOODLE',
      name: 'YOWE RICE VERMICELLI - BEE HOON',
      sku: 'NDL-027',
      unit: '30 X 500GM',
      price: 4.5,
      packagingNote: 'Pack of 30 packets (500g each)',
    },

    // 17. JAPANESE RANGE
    {
      category: 'JAPANESE RANGE',
      name: 'SAPORITO RISO ARBORIO RICE',
      sku: 'JPN-039',
      unit: '12 X 1KG',
      price: 18.5,
      packagingNote: 'Pack of 12 packets (1kg each)',
    },

    // 18. NON FOOD
    {
      category: 'NON FOOD',
      name: '8" (20cm) BAMBOO STICK / SATAY STICK',
      sku: 'NFD-011',
      unit: '125 X 200GM',
      price: 5.5,
      packagingNote: 'Carton of 125 packs (200g each)',
    },

    // 19. OTHERS
    {
      category: 'OTHERS',
      name: 'YOWE COCONUT MILK 5%~7%',
      sku: 'OTH-032',
      unit: '24 X 400ML',
      price: 3.0,
      packagingNote: 'Pack of 24 cans (400ml each)',
    },
  ];

  const categoryNames = Array.from(new Set(clientCatalog.map((i) => i.category)));
  const categoryMap = new Map<string, string>();

  for (const catName of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: {
        name: catName,
        description: `${catName} wholesale products for distributor supply`,
      },
    });
    categoryMap.set(catName, category.id);
  }

  for (const item of clientCatalog) {
    const categoryId = categoryMap.get(item.category);
    await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        price: item.price,
        unit: item.unit,
        packagingNote: item.packagingNote ?? null,
        categoryId: categoryId || null,
        isActive: true,
      },
      create: {
        name: item.name,
        sku: item.sku,
        description: `${item.name} (${item.unit})`,
        price: item.price,
        unit: item.unit,
        categoryId: categoryId || null,
        isActive: true,
        images: [],
        packagingNote: item.packagingNote ?? null,
      },
    });
  }
  console.log(
    `✔ Seeded ${categoryNames.length} categories and ${clientCatalog.length} client products.`,
  );

  console.log('\n=============================================');
  console.log('Initial Auth & Client Catalog Seed Completed Successfully!');
  console.log('Default Seed Credentials:');
  console.log('  1. SUPER_ADMIN: admin@ontime.com / Password123!');
  console.log('  2. ADMIN      : admin@apexretailers.com / Password123!');
  console.log('  3. STAFF      : staff@apexretailers.com / Password123!');
  console.log('  4. INVITATION TOKEN  : ' + inviteToken);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
