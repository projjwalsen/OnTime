/**
 * UserRole defines the full permission hierarchy for the OnTime platform.
 *
 * DISTRIBUTOR_ADMIN  — Platform/distributor administrator. Has full access to
 *                      all retailer organisations, products, categories, and orders.
 *
 * ORGANISATION_ADMIN — Primary/admin user of a single retailer organisation.
 *                      Can manage their organisation profile and invite staff.
 *
 * ORGANISATION_STAFF — Standard staff member of a single retailer organisation.
 *                      Can create/manage orders within their organisation.
 *                      Cannot invite users or manage organisations.
 */
export enum UserRole {
  DISTRIBUTOR_ADMIN = 'DISTRIBUTOR_ADMIN',
  ORGANISATION_ADMIN = 'ORGANISATION_ADMIN',
  ORGANISATION_STAFF = 'ORGANISATION_STAFF',
}

/**
 * Roles that belong to a retailer organisation.
 * Used to enforce that distributor admins have no organisationId.
 */
export const ORGANISATION_ROLES: readonly UserRole[] = [
  UserRole.ORGANISATION_ADMIN,
  UserRole.ORGANISATION_STAFF,
] as const;

/**
 * Roles that are allowed to invite new staff members.
 * Only ORGANISATION_ADMIN can send invitations — staff cannot.
 */
export const INVITATION_ALLOWED_ROLES: readonly UserRole[] = [UserRole.ORGANISATION_ADMIN] as const;

/**
 * Roles that can be assigned via an invitation.
 * Distributor admins are never created through the invitation flow.
 */
export const INVITABLE_ROLES: readonly UserRole[] = [
  UserRole.ORGANISATION_ADMIN,
  UserRole.ORGANISATION_STAFF,
] as const;

/**
 * Helper predicates for role checking.
 */
export function isDistributorAdmin(role: UserRole): boolean {
  return role === UserRole.DISTRIBUTOR_ADMIN;
}

export function isOrganisationAdmin(role: UserRole): boolean {
  return role === UserRole.ORGANISATION_ADMIN;
}

export function isOrganisationStaff(role: UserRole): boolean {
  return role === UserRole.ORGANISATION_STAFF;
}

export function isOrganisationUser(role: UserRole): boolean {
  return role === UserRole.ORGANISATION_ADMIN || role === UserRole.ORGANISATION_STAFF;
}
