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
export {
  OrderStatus,
  isRetailerCancellable,
  isDistributorCancellable,
  ALLOWED_STATUS_TRANSITIONS,
} from './enums/order-status';

// Types
export type {
  PaginationParams,
  PaginationMeta,
  PaginatedResult,
} from './types/pagination';
export type {
  Organisation,
  CreateOrganisationDto,
  UpdateOrganisationDto,
  OrganisationFilterParams,
} from './types/organisation';
export type {
  User,
  AuthContext,
  InviteUserDto,
  OnboardUserDto,
  OnboardUserResponse,
  InvitationResponse,
  UserFilterParams,
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
  CategoryFilterParams,
  ProductFilterParams,
} from './types/product';
export type {
  OrderItem,
  Order,
  CreateOrderItemDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderFilterParams,
  OrderSummaryStats,
} from './types/order';
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
