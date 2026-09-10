/**
 * UserRole defines the full permission hierarchy for the OnTime platform.
 *
 * SUPER_ADMIN — Platform administrator / owner. Has full access to
 *               all retailer organisations, products, categories, and orders.
 *               Has NO organisationId.
 *
 * ADMIN       — Primary administrator of a single retailer organisation.
 *               Can manage their organisation profile and invite staff.
 *               Requires organisationId.
 *
 * STAFF       — Standard staff member of a single retailer organisation.
 *               Can create/manage orders within their organisation.
 *               Cannot invite users or manage organisations.
 *               Requires organisationId.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

/**
 * Roles that belong to a retailer organisation.
 * Used to enforce that super admins have no organisationId.
 */
export const ORGANISATION_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.STAFF,
] as const;

/**
 * Roles that are allowed to invite new staff members.
 * Only organisation ADMIN can send invitations — staff cannot.
 */
export const INVITATION_ALLOWED_ROLES: readonly UserRole[] = [UserRole.ADMIN] as const;

/**
 * Roles that can be assigned via an invitation.
 * SUPER_ADMIN is never created through the invitation flow.
 */
export const INVITABLE_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.STAFF,
] as const;

/**
 * Helper predicates for role checking.
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isStaff(role: UserRole): boolean {
  return role === UserRole.STAFF;
}

export function isOrganisationUser(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.STAFF;
}

// Backward compatibility aliases
export const isDistributorAdmin = isSuperAdmin;
export const isOrganisationAdmin = isAdmin;
export const isOrganisationStaff = isStaff;
