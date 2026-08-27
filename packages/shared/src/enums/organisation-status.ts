/**
 * OrganisationStatus represents the operational state of a retailer organisation
 * as managed by the distributor.
 *
 * ACTIVE    — Organisation is active and can place orders.
 * INACTIVE  — Organisation has been deactivated (e.g., no longer a customer).
 * SUSPENDED — Organisation is temporarily suspended (e.g., payment issues).
 */
export enum OrganisationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}
