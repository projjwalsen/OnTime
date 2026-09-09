import crypto from 'crypto';
import {
  type User,
  type Organisation,
  type AuthContext,
  type InvitationResponse,
  UserRole,
  InvitationStatus,
  INVITATION_EXPIRY_DAYS,
  isDistributorAdmin,
} from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type UpdateUserProfileInput, type InviteUserInput } from './validator';

export class UserError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export class UsersService {
  /**
   * List users scoped by organisation or for platform admin.
   */
  async listUsers(options: { organisationId?: string | null | undefined }): Promise<User[]> {
    const where = options.organisationId ? { organisationId: options.organisationId } : {};

    const users = await prisma.user.findMany({
      where,
      include: { organisation: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      mobile: u.mobile,
      role: u.role as UserRole,
      organisationId: u.organisationId,
      isActive: u.isActive,
      organisation: (u.organisation as unknown as Organisation) ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  /**
   * Get user by ID.
   */
  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { organisation: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      role: user.role as UserRole,
      organisationId: user.organisationId,
      isActive: user.isActive,
      organisation: (user.organisation as unknown as Organisation) ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user profile details.
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileInput): Promise<User> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
      },
      include: { organisation: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      mobile: updated.mobile,
      role: updated.role as UserRole,
      organisationId: updated.organisationId,
      isActive: updated.isActive,
      organisation: (updated.organisation as unknown as Organisation) ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Create an organisation invitation for an Org Admin or Staff user.
   */
  async inviteUser(caller: AuthContext, data: InviteUserInput): Promise<InvitationResponse> {
    let targetOrgId: string;

    if (isDistributorAdmin(caller.role)) {
      if (!data.organisationId) {
        throw new UserError('organisationId is required for distributor admin when inviting users.', 400);
      }
      targetOrgId = data.organisationId;
    } else {
      if (!caller.organisationId) {
        throw new UserError('Organisation context missing for caller.', 400);
      }
      targetOrgId = caller.organisationId;
    }

    // Verify target organisation exists and is active
    const organisation = await prisma.organisation.findUnique({
      where: { id: targetOrgId },
    });

    if (!organisation) {
      throw new UserError('Organisation not found.', 404);
    }

    if (organisation.status === 'SUSPENDED') {
      throw new UserError('Cannot invite users to a suspended organisation.', 403);
    }

    const email = data.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UserError('A user with this email address already exists.', 409);
    }

    // Revoke previous pending invitation for same email & org if any
    await prisma.organisationInvitation.updateMany({
      where: {
        email,
        organisationId: targetOrgId,
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.REVOKED,
      },
    });

    // Generate unique crypto token & expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await prisma.organisationInvitation.create({
      data: {
        email,
        role: data.role,
        organisationId: targetOrgId,
        token,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
      include: {
        organisation: true,
      },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role as UserRole,
      organisationId: invitation.organisationId,
      organisationName: invitation.organisation.name,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      status: invitation.status as InvitationStatus,
    };
  }
}

export const usersService = new UsersService();

