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

  // 1. Seed Distributor Admin (no organisationId)
  const distributorAdmin = await prisma.user.upsert({
    where: { email: 'admin@ontime.com' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.DISTRIBUTOR_ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@ontime.com',
      name: 'Distributor Platform Admin',
      passwordHash: defaultPasswordHash,
      role: UserRole.DISTRIBUTOR_ADMIN,
      organisationId: null,
      isActive: true,
    },
  });
  console.log('✔ Distributor Admin seeded:', distributorAdmin.email);

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

  // 3. Seed Organisation Admin (Customer Primary User)
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@apexretailers.com' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.ORGANISATION_ADMIN,
      organisationId: organisation.id,
      isActive: true,
    },
    create: {
      email: 'admin@apexretailers.com',
      name: 'Sarah Admin (Apex)',
      passwordHash: defaultPasswordHash,
      role: UserRole.ORGANISATION_ADMIN,
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
      role: UserRole.ORGANISATION_STAFF,
      organisationId: organisation.id,
      isActive: true,
    },
    create: {
      email: 'staff@apexretailers.com',
      name: 'John Staff (Apex)',
      passwordHash: defaultPasswordHash,
      role: UserRole.ORGANISATION_STAFF,
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
      status: InvitationStatus.PENDING,
      expiresAt,
    },
    create: {
      email: 'newstaff@apexretailers.com',
      token: inviteToken,
      role: UserRole.ORGANISATION_STAFF,
      organisationId: organisation.id,
      status: InvitationStatus.PENDING,
      expiresAt,
    },
  });
  console.log('✔ Sample Organisation Invitation seeded for:', invitation.email);

  console.log('\n=============================================');
  console.log('Initial Auth Seed Completed Successfully!');
  console.log('Default Seed Credentials:');
  console.log('  1. DISTRIBUTOR_ADMIN : admin@ontime.com / Password123!');
  console.log('  2. ORGANISATION_ADMIN: admin@apexretailers.com / Password123!');
  console.log('  3. ORGANISATION_STAFF: staff@apexretailers.com / Password123!');
  console.log('  4. INVITATION TOKEN  : ' + inviteToken);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
