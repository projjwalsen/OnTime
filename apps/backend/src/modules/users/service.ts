import crypto from 'crypto';
import {
  type User,
  type Organisation,
  type AuthContext,
  type PaginationMeta,
  type InvitationResponse,
  type OnboardUserResponse,
  UserRole,
  InvitationStatus,
  isSuperAdmin,
} from '@ontime/shared';

import { prisma } from '../../lib/prisma';
import { emailService } from '../../lib/email.service';
import { hashPassword } from '../../utils/password';
import { config } from '../../config/env';
import {
  type UpdateUserProfileInput,
  type OnboardUserInput,
  type UserFilterInput,
} from './validator';

export class UserError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export interface ListUsersResult {
  users: User[];
  pagination: PaginationMeta;
}

export class UsersService {
  /**
   * List users scoped by organisation or for platform admin with search, filter, and pagination.
   */
  async listUsers(caller: AuthContext, filters?: UserFilterInput): Promise<ListUsersResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Multi-tenant scoping
    if (caller.role !== UserRole.SUPER_ADMIN) {
      where.organisationId = caller.organisationId;
    } else if (filters?.organisationId) {
      where.organisationId = filters.organisationId;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { organisation: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        mobile: u.mobile,
        role: u.role as UserRole,
        organisationId: u.organisationId,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        organisation: (u.organisation as unknown as Organisation) ?? null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
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
      mustChangePassword: user.mustChangePassword,
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
      mustChangePassword: updated.mustChangePassword,
      organisation: (updated.organisation as unknown as Organisation) ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Generate a random, high-entropy temporary password.
   * Format: 12 characters including uppercase, lowercase, numbers, and symbols.
   */
  private generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';

    let password = '';
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];

    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 0; i < 8; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }

    // Shuffle characters
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }

  /**
   * Directly onboard a new staff or admin user to an organisation with auto-generated credentials.
   */
  async onboardUser(caller: AuthContext, data: OnboardUserInput): Promise<OnboardUserResponse> {
    let targetOrgId: string;

    if (isSuperAdmin(caller.role)) {
      if (!data.organisationId) {
        throw new UserError(
          'organisationId is required for super admin when onboarding users.',
          400,
        );
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
      throw new UserError('Cannot onboard users to a suspended organisation.', 403);
    }

    const email = data.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UserError('A user with this email address already exists.', 409);
    }

    // Auto-generate secure temporary password and hash it
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    // Create user in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        email,
        name: data.name.trim(),
        mobile: data.mobile?.trim() || null,
        passwordHash,
        role: data.role,
        organisationId: targetOrgId,
        isActive: true,
        mustChangePassword: true,
      },
      include: {
        organisation: true,
      },
    });

    // Send credentials welcome email with temporary password
    await emailService.sendStaffCredentialsEmail(email, {
      name: newUser.name,
      username: email,
      temporaryPassword,
      organisationName: organisation.name,
    });

    const userContract: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      mobile: newUser.mobile,
      role: newUser.role as UserRole,
      organisationId: newUser.organisationId,
      isActive: newUser.isActive,
      mustChangePassword: newUser.mustChangePassword,
      organisation: (newUser.organisation as unknown as Organisation) ?? null,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return {
      user: userContract,
      ...(config.isDevelopment || config.isTest || !config.isProduction
        ? { temporaryPassword }
        : {}),
    };
  }

  /**
   * Alias for backward compatibility with inviteUser.
   */
  async inviteUser(caller: AuthContext, data: OnboardUserInput): Promise<InvitationResponse> {
    const result = await this.onboardUser(caller, data);
    return {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      organisationId: result.user.organisationId ?? '',
      organisationName: result.user.organisation?.name ?? '',
      status: InvitationStatus.ACCEPTED,
      user: result.user,
      temporaryPassword: result.temporaryPassword,
    };
  }

  /**
   * Get complete team overview including active members, pending invitations, and team statistics.
   */
  async getTeamOverview(caller: AuthContext): Promise<{

    members: User[];
    invitations: Array<{
      id: string;
      email: string;
      role: UserRole;
      status: InvitationStatus;
      createdAt: Date;
      expiresAt: Date;
    }>;
    stats: {
      totalMembers: number;
      activeMembers: number;
      pendingInvites: number;
      rolesCount: number;
    };
  }> {
    const organisationId = caller.organisationId;
    if (!organisationId && caller.role !== UserRole.SUPER_ADMIN) {
      throw new UserError('Organisation context required.', 400);
    }

    const where: any = {};
    if (organisationId) {
      where.organisationId = organisationId;
    }

    const [users, invitations] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { organisation: true },
        orderBy: { createdAt: 'desc' },
      }),
      organisationId
        ? prisma.organisationInvitation.findMany({
            where: {
              organisationId,
              status: InvitationStatus.PENDING,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          })
        : [],
    ]);

    const activeMembers = users.filter((u) => u.isActive).length;
    const pendingInvites = invitations.length;

    // Distinct roles present in team
    const roleSet = new Set<string>();
    users.forEach((u) => roleSet.add(u.role));
    invitations.forEach((inv) => roleSet.add(inv.role));

    return {
      members: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        mobile: u.mobile,
        role: u.role as UserRole,
        organisationId: u.organisationId,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        organisation: (u.organisation as unknown as Organisation) ?? null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role as UserRole,
        status: inv.status as InvitationStatus,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
      stats: {
        totalMembers: users.length,
        activeMembers,
        pendingInvites,
        rolesCount: roleSet.size || 1,
      },
    };
  }

  /**
   * Update a team member's role (ADMIN or STAFF).
   */
  async updateUserRole(
    caller: AuthContext,
    userId: string,
    newRole: UserRole.ADMIN | UserRole.STAFF,
  ): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organisation: true },
    });

    if (!user) {
      throw new UserError('User not found.', 404);
    }

    if (caller.role !== UserRole.SUPER_ADMIN && user.organisationId !== caller.organisationId) {
      throw new UserError('Forbidden: Cannot update user from another organisation.', 403);
    }

    if (user.id === caller.userId && newRole !== UserRole.ADMIN) {
      throw new UserError('Cannot demote your own admin account.', 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
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
      mustChangePassword: updated.mustChangePassword,
      organisation: (updated.organisation as unknown as Organisation) ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Activate or deactivate a team member.
   */
  async updateUserStatus(caller: AuthContext, userId: string, isActive: boolean): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organisation: true },
    });

    if (!user) {
      throw new UserError('User not found.', 404);
    }

    if (caller.role !== UserRole.SUPER_ADMIN && user.organisationId !== caller.organisationId) {
      throw new UserError('Forbidden: Cannot modify user from another organisation.', 403);
    }

    if (user.id === caller.userId && !isActive) {
      throw new UserError('Cannot deactivate your own account.', 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: { organisation: true },
    });

    // If deactivating user, revoke all active sessions
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      mobile: updated.mobile,
      role: updated.role as UserRole,
      organisationId: updated.organisationId,
      isActive: updated.isActive,
      mustChangePassword: updated.mustChangePassword,
      organisation: (updated.organisation as unknown as Organisation) ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Revoke a pending invitation.
   */
  async revokeInvitation(caller: AuthContext, invitationId: string): Promise<void> {
    const invitation = await prisma.organisationInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new UserError('Invitation not found.', 404);
    }

    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      invitation.organisationId !== caller.organisationId
    ) {
      throw new UserError('Forbidden: Cannot revoke invitation for another organisation.', 403);
    }

    await prisma.organisationInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }
}

export const usersService = new UsersService();

