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

  /**
   * Request email change (Requirement 2.B):
   * Workflow: Settings > Change Email > OTP code sent to original email
   */
  async requestEmailChange(
    caller: AuthContext,
    newEmail: string,
  ): Promise<{ message: string; otp?: string; expiresInSeconds: number }> {
    const cleanNew = newEmail.trim().toLowerCase();

    // Check if new email is already in use
    const existing = await prisma.user.findUnique({
      where: { email: cleanNew },
    });
    if (existing) {
      throw new UserError('An account with this new email address already exists.', 409);
    }

    const user = await prisma.user.findUnique({
      where: { id: caller.userId },
    });
    if (!user) {
      throw new UserError('User account not found.', 404);
    }

    if (user.email.toLowerCase() === cleanNew) {
      throw new UserError('New email must be different from your current email.', 400);
    }

    // Clean up any pending email change requests for this user
    await prisma.emailChangeRequest.deleteMany({
      where: { userId: caller.userId },
    });

    const oldEmailToken = crypto.randomBytes(32).toString('hex');
    const oldEmailOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const oldEmailOtpHash = crypto.createHash('sha256').update(oldEmailOtp).digest('hex');
    const expiresInSeconds = 15 * 60; // 15 mins
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await prisma.emailChangeRequest.create({
      data: {
        userId: caller.userId,
        oldEmail: user.email,
        newEmail: cleanNew,
        oldEmailToken,
        newEmailOtpHash: oldEmailOtpHash, // Stores old email OTP hash until verified
        expiresAt,
      },
    });

    // Send OTP verification code to original email
    emailService.enqueueEmail({
      to: user.email,
      subject: 'Security Alert: Your Verification Code to Change Email Address',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">Verify Email Address Change</h2>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">Hi ${user.name},</p>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">We received a request to update your login email address from <strong>${user.email}</strong> to <strong>${cleanNew}</strong>.</p>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">Your one-time verification code is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; margin: 20px 0; background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px;">
            ${oldEmailOtp}
          </div>
          <p style="font-size: 0.85rem; color: #64748b;">This code expires in 15 minutes. Enter this code to verify your current email address.</p>
          <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0;">If you did not request this change, please ignore this email and your email will remain unchanged.</p>
        </div>
      `,
      text: `Verify Email Change: Your verification code to update your email to ${cleanNew} is: ${oldEmailOtp}. Valid for 15 minutes.`,
    });

    return {
      message: 'A 4-digit verification code has been sent to your current email address.',
      expiresInSeconds,
      ...(config.isDevelopment || config.isTest || !config.isProduction ? { otp: oldEmailOtp } : {}),
    };
  }

  /**
   * Verify old email OTP and trigger OTP to new email.
   */
  async verifyOldEmailOtp(payload: {
    token?: string | undefined;
    otp?: string | undefined;
    userId?: string | undefined;
  }): Promise<{ message: string; newEmail: string; otp?: string; expiresInSeconds: number }> {
    const rawToken = payload.token?.trim();
    const rawOtp = payload.otp?.trim();

    // Determine the OTP and token
    const otp = rawOtp || (rawToken && rawToken.length <= 6 ? rawToken : undefined);
    const token = rawToken && rawToken.length > 6 ? rawToken : undefined;

    if (!otp && !token) {
      throw new UserError('Verification code (OTP) is required.', 400);
    }

    let request = null;

    if (payload.userId) {
      request = await prisma.emailChangeRequest.findFirst({
        where: {
          userId: payload.userId,
          confirmedAt: null,
          oldEmailVerified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!request && token) {
      request = await prisma.emailChangeRequest.findUnique({
        where: { oldEmailToken: token },
      });
    }

    if (!request && otp) {
      const providedHash = crypto.createHash('sha256').update(otp).digest('hex');
      request = await prisma.emailChangeRequest.findFirst({
        where: {
          newEmailOtpHash: providedHash,
          oldEmailVerified: false,
          confirmedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!request || request.confirmedAt || request.expiresAt < new Date()) {
      throw new UserError('Invalid or expired email change request.', 400);
    }

    if (request.oldEmailVerified) {
      throw new UserError('Original email has already been verified.', 400);
    }

    // Verify OTP or token
    if (otp) {
      const providedHash = crypto.createHash('sha256').update(otp).digest('hex');
      if (providedHash !== request.newEmailOtpHash) {
        throw new UserError('Invalid OTP verification code.', 400);
      }
    } else if (!token || token !== request.oldEmailToken) {
      throw new UserError('Verification code (OTP) is required.', 400);
    }

    // Generate fresh 4-digit OTP for new email
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const newEmailOtpHash = crypto.createHash('sha256').update(newOtp).digest('hex');
    const expiresInSeconds = 15 * 60;

    await prisma.emailChangeRequest.update({
      where: { id: request.id },
      data: {
        oldEmailVerified: true,
        newEmailOtpHash,
      },
    });

    // Send OTP to new email
    emailService.enqueueEmail({
      to: request.newEmail,
      subject: 'Your Verification Code for Email Change',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">Verify Your New Email Address</h2>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">Your one-time verification code to confirm this email address is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; margin: 20px 0; background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px;">
            ${newOtp}
          </div>
          <p style="font-size: 0.85rem; color: #64748b;">This code expires in 15 minutes. Enter this code to finalize your email change.</p>
        </div>
      `,
      text: `Your verification code for email change is: ${newOtp}. Valid for 15 minutes.`,
    });

    return {
      message: 'Original email verified. A 4-digit verification code has been sent to your new email.',
      newEmail: request.newEmail,
      expiresInSeconds,
      ...(config.isDevelopment || config.isTest || !config.isProduction ? { otp: newOtp } : {}),
    };
  }

  /**
   * Alias for backward compatibility.
   */
  async verifyOldEmailToken(
    token: string,
    otp?: string | undefined,
  ): Promise<{ message: string; newEmail: string }> {
    return this.verifyOldEmailOtp({ token, otp });
  }

  /**
   * Confirm email change with OTP. Preserves all history.
   */
  async confirmEmailChange(
    payloadOrToken: string | { otp: string; token?: string | undefined; userId?: string | undefined },
    possibleOtp?: string,
  ): Promise<{ message: string; email: string }> {
    let token: string | undefined;
    let otp: string | undefined;
    let userId: string | undefined;

    if (typeof payloadOrToken === 'string') {
      token = payloadOrToken.trim();
      otp = possibleOtp?.trim();
    } else {
      otp = payloadOrToken.otp?.trim();
      token = payloadOrToken.token?.trim();
      userId = payloadOrToken.userId;
    }

    // If otp is provided in token field
    if (!otp && token && token.length <= 6) {
      otp = token;
      token = undefined;
    }

    if (!otp) {
      throw new UserError('Verification code (OTP) is required.', 400);
    }

    const providedHash = crypto.createHash('sha256').update(otp).digest('hex');

    let request = null;

    if (userId) {
      request = await prisma.emailChangeRequest.findFirst({
        where: {
          userId,
          oldEmailVerified: true,
          confirmedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    }

    if (!request && token && token.length > 6) {
      request = await prisma.emailChangeRequest.findUnique({
        where: { oldEmailToken: token },
        include: { user: true },
      });
    }

    if (!request) {
      request = await prisma.emailChangeRequest.findFirst({
        where: {
          newEmailOtpHash: providedHash,
          oldEmailVerified: true,
          confirmedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    }

    if (!request || request.confirmedAt || request.expiresAt < new Date()) {
      throw new UserError('Invalid or expired email change request.', 400);
    }

    if (!request.oldEmailVerified) {
      throw new UserError('Original email has not been verified yet.', 400);
    }

    if (providedHash !== request.newEmailOtpHash) {
      throw new UserError('Invalid OTP verification code.', 400);
    }

    // Transaction to update email and preserve all history
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail },
      });

      // If user is primary contact for organisation, sync org email
      if (request.user.organisationId) {
        await tx.organisation.updateMany({
          where: { id: request.user.organisationId, email: request.oldEmail },
          data: { email: request.newEmail },
        });
      }

      await tx.emailChangeRequest.update({
        where: { id: request.id },
        data: { confirmedAt: new Date(), newEmailVerified: true },
      });
    });

    // Notify old and new email addresses about successful update
    emailService.enqueueEmail({
      to: [request.oldEmail, request.newEmail],
      subject: 'Security Alert: Your Account Email Has Been Changed',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">Email Address Successfully Updated</h2>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">Hi ${request.user.name},</p>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">Your account email address has been successfully changed from <strong>${request.oldEmail}</strong> to <strong>${request.newEmail}</strong>.</p>
          <p style="color: #334155; font-size: 1rem; line-height: 1.5;">All your past orders, organization data, and account history remain intact and accessible under your new email.</p>
        </div>
      `,
      text: `Your account email address has been updated to ${request.newEmail}. All account history remains intact.`,
    });

    return {
      message:
        'Email address updated successfully! All order history and account details are preserved.',
      email: request.newEmail,
    };
  }

  /**
   * Admin direct update of customer email without verification or resetting passwords (Requirement 2.B).
   */
  async adminUpdateEmail(
    caller: AuthContext,
    targetUserId: string,
    newEmail: string,
  ): Promise<User> {
    if (caller.role !== UserRole.SUPER_ADMIN && caller.role !== UserRole.ADMIN) {
      throw new UserError('Forbidden: Only admins can directly update user emails.', 403);
    }

    const cleanNew = newEmail.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { organisation: true },
    });

    if (!existingUser) {
      throw new UserError('User not found.', 404);
    }

    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      existingUser.organisationId !== caller.organisationId
    ) {
      throw new UserError('Forbidden: Cannot modify users from another organisation.', 403);
    }

    if (existingUser.email.toLowerCase() === cleanNew) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        mobile: existingUser.mobile,
        role: existingUser.role as UserRole,
        organisationId: existingUser.organisationId,
        isActive: existingUser.isActive,
        mustChangePassword: existingUser.mustChangePassword,
        organisation: (existingUser.organisation as unknown as Organisation) ?? null,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      };
    }

    const conflict = await prisma.user.findUnique({
      where: { email: cleanNew },
    });

    if (conflict && conflict.id !== targetUserId) {
      throw new UserError(`An account with email "${cleanNew}" already exists.`, 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: targetUserId },
        data: { email: cleanNew },
        include: { organisation: true },
      });

      if (u.organisationId) {
        await tx.organisation.updateMany({
          where: { id: u.organisationId, email: existingUser.email },
          data: { email: cleanNew },
        });
      }

      return u;
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
}

export const usersService = new UsersService();
