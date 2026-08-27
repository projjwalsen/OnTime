/**
 * @ontime/shared
 *
 * Shared TypeScript types, enums, and constants for the OnTime platform.
 * This package contains NO business logic — only type contracts.
 */

// Enums
export { UserRole, ORGANISATION_ROLES, INVITATION_ALLOWED_ROLES, INVITABLE_ROLES } from './enums/roles';
export { InvitationStatus } from './enums/invitation-status';
export { OrganisationStatus } from './enums/organisation-status';

// Types
export type { Organisation, CreateOrganisationDto, UpdateOrganisationDto } from './types/organisation';
export type { User, AuthContext } from './types/user';

// Constants
export {
  PLATFORM_NAME,
  API_VERSION,
  API_PREFIX,
  INVITATION_EXPIRY_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './constants/index';
