import { OrganisationStatus } from '../enums/organisation-status';

/**
 * Shared Organisation interface.
 * Represents a retailer/customer company onboarded by the distributor.
 *
 * Note: The platform owner is NOT modelled as an Organisation.
 *       Super admin users are identified by UserRole.SUPER_ADMIN.
 */

export interface Organisation {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  taxNumber?: string | null;
  status: OrganisationStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Business Details representation for retailer profiles.
 * Contains organisation info, formatted retailer ID, and primary contact person info.
 */
export interface BusinessDetails {
  id: string;
  retailerId: string;
  name: string;
  email: string;
  mobile?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  taxNumber?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactMobile?: string | null;
  status: OrganisationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * DTO for creating a new organisation (distributor-only operation).
 */
export interface CreateOrganisationDto {
  name: string;
  email: string;
  mobile?: string;
  address?: string;
  area?: string;
  city?: string;
  taxNumber?: string;
}

/**
 * DTO for updating an organisation.
 * Status changes are handled separately (distributor-only).
 */
export interface UpdateOrganisationDto {
  name?: string;
  email?: string;
  contactPerson?: string;
  mobile?: string;
  address?: string;
  area?: string;
  city?: string;
  taxNumber?: string;
  status?: OrganisationStatus;
}

/**
 * DTO for updating business details from retailer admin or super admin.
 */
export interface UpdateBusinessDetailsDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  mobile?: string;
  taxNumber?: string;
  address?: string;
  area?: string;
  city?: string;
}

export interface OrganisationFilterParams {
  search?: string | undefined;
  status?: OrganisationStatus | undefined;
  city?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}
