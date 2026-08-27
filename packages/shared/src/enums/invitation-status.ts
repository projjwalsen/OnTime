/**
 * InvitationStatus tracks the lifecycle of an OrganisationInvitation.
 *
 * PENDING  — Invitation has been sent; awaiting acceptance.
 * ACCEPTED — The invited user has accepted and joined the organisation.
 * REVOKED  — The invitation was manually revoked by an organisation admin.
 * EXPIRED  — The invitation passed its expiry date without being accepted.
 */
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}
