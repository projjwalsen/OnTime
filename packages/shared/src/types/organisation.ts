import { OrganisationStatus } from '../enums/organisation-status';

/**
 * Shared Organisation interface.
 * Represents a retailer/customer company onboarded by the distributor.
 *
 * Note: The distributor is NOT modelled as an Organisation.
 *       Distributor users are identified by UserRole.DISTRIBUTOR_ADMIN.
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
export type UpdateOrganisationDto = Partial<Omit<CreateOrganisationDto, 'email'>>;
