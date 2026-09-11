import crypto from 'crypto';
import {
  type User,
  type Organisation,
  type AuthContext,
  type InvitationResponse,
  type OnboardUserResponse,
  UserRole,
  InvitationStatus,
  INVITATION_EXPIRY_DAYS,
  isSuperAdmin,
} from '@ontime/shared';

import { prisma } from '../../lib/prisma';
import { emailService } from '../../lib/email.service';
import { hashPassword } from '../../utils/password';
import { config } from '../../config/env';
import { type UpdateUserProfileInput, type OnboardUserInput } from './validator';

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
      mustChangePassword: u.mustChangePassword,
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
}

export const usersService = new UsersService();
