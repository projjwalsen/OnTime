/**
 * @ontime/shared
 *
 * Shared TypeScript types, enums, and constants for the OnTime platform.
 * This package contains NO business logic — only type contracts.
 */

// Enums & Role Predicates
export {
  UserRole,
  ORGANISATION_ROLES,
  INVITATION_ALLOWED_ROLES,
  INVITABLE_ROLES,
  isSuperAdmin,
  isAdmin,
  isStaff,
  isOrganisationUser,
  isDistributorAdmin,
  isOrganisationAdmin,
  isOrganisationStaff,
} from './enums/roles';

export { InvitationStatus } from './enums/invitation-status';
export { OrganisationStatus } from './enums/organisation-status';
export { OtpPurpose } from './enums/otp';

// Types
export type {
  Organisation,
  CreateOrganisationDto,
  UpdateOrganisationDto,
} from './types/organisation';
export type {
  User,
  AuthContext,
  InviteUserDto,
  OnboardUserDto,
  OnboardUserResponse,
  InvitationResponse,
} from './types/user';
export type {
  Product,
  ProductVariant,
  ProductVariantDto,
  Category,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './types/product';
export type {
  LoginCredentialsDto,
  AuthTokens,
  AuthResponse,
  RefreshTokenDto,
  ChangePasswordDto,
  AcceptInvitationDto,
  VerifyInvitationResponse,
  JwtPayload,
  ForgotPasswordDto,
  ResetPasswordDto,
  RegisterRetailerDto,
  SendOtpResponse,
  SendLoginOtpDto,
  VerifyLoginOtpDto,
  SendForgotPasswordOtpDto,
  VerifyForgotPasswordOtpDto,
  ResetPasswordWithOtpDto,
  SendRegistrationOtpDto,
  VerifyRegistrationOtpDto,
} from './types/auth';


// Constants
export {
  PLATFORM_NAME,
  API_VERSION,
  API_PREFIX,
  INVITATION_EXPIRY_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './constants/index';
