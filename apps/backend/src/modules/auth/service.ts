import crypto from 'crypto';
import {
  type LoginCredentialsDto,
  type AuthTokens,
  type AuthResponse,
  type ChangePasswordDto,
  type AcceptInvitationDto,
  type VerifyInvitationResponse,
  type ResetPasswordDto,
  type RegisterRetailerDto,
  type SendOtpResponse,
  type VerifyLoginOtpDto,
  type VerifyForgotPasswordOtpDto,
  type ResetPasswordWithOtpDto,
  type VerifyRegistrationOtpDto,
  type User,
  type Organisation,
  UserRole,
  InvitationStatus,
  OrganisationStatus,
  OtpPurpose,
} from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { emailService } from '../../lib/email.service';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  parseDurationToSeconds,
} from '../../utils/jwt';
import { config } from '../../config/env';

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Format database user record into public User contract (excluding passwordHash).
 */
function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  mobile: string | null;
  role: unknown;
  organisationId: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
  organisation?: unknown;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    mobile: user.mobile,
    role: user.role as UserRole,
    organisationId: user.organisationId,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword ?? false,
    organisation: (user.organisation as Organisation) ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Calculate expiration date for a duration string (e.g. '7d').
 */
function calculateExpiryDate(duration: string): Date {
  const seconds = parseDurationToSeconds(duration);
  return new Date(Date.now() + seconds * 1000);
}

export class AuthService {
  /**
   * Authenticate a user with email and password.
   */
  async login(
    credentials: LoginCredentialsDto,
    meta?: {
      ipAddress?: string | undefined;
      userAgent?: string | undefined;
      deviceInfo?: string | undefined;
      location?: string | undefined;
    },
  ): Promise<AuthResponse> {

    const email = credentials.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organisation: true,
      },
    });

    if (!user) {
      throw new AuthError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      // Record failed sign-in attempt
      await prisma.userLoginActivity.create({
        data: {
          userId: user.id,
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
          device: meta?.deviceInfo || null,
          location: meta?.location || null,
          isSuccess: false,
        },
      }).catch(() => {});
      throw new AuthError('Account is deactivated. Please contact your administrator.', 403);
    }

    // Verify password hash
    const isPasswordValid = await comparePassword(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed sign-in attempt
      await prisma.userLoginActivity.create({
        data: {
          userId: user.id,
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
          device: meta?.deviceInfo || null,
          location: meta?.location || null,
          isSuccess: false,
        },
      }).catch(() => {});
      throw new AuthError('Invalid email or password.', 401);
    }

    // If organisation user, verify organisation is not suspended
    if (user.organisation && user.organisation.status === 'SUSPENDED') {
      throw new AuthError(
        'Your organisation is currently suspended. Please contact the distributor.',
        403,
      );
    }

    const userRole = user.role as unknown as UserRole;

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: userRole,
      organisationId: user.organisationId,
    });

    const refreshToken = signRefreshToken({ userId: user.id });
    const refreshExpiresAt = calculateExpiryDate(config.jwtRefreshExpiresIn);

    // Save refresh token with device/IP metadata to database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
        deviceInfo: meta?.deviceInfo || null,
        expiresAt: refreshExpiresAt,
      },
    });

    // Record successful login in activity log
    await prisma.userLoginActivity.create({
      data: {
        userId: user.id,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
        device: meta?.deviceInfo || null,
        location: meta?.location || null,
        isSuccess: true,
      },
    }).catch(() => {});

    const expiresInSeconds = parseDurationToSeconds(config.jwtExpiresIn);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      tokenType: 'Bearer',
    };

    return {
      user: sanitizeUser(user),
      tokens,
      organisation: (user.organisation as unknown as Organisation) ?? null,
      mustChangePassword: user.mustChangePassword,
    };
  }


  /**
   * Refresh JWT access token using a valid refresh token.
   */
  async refreshTokens(refreshTokenStr: string): Promise<AuthTokens> {
    try {
      verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new AuthError('Invalid or expired refresh token.', 401);
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: {
        user: {
          include: {
            organisation: true,
          },
        },
      },
    });

    if (!savedToken) {
      throw new AuthError('Refresh token not found.', 401);
    }

    if (savedToken.revokedAt) {
      throw new AuthError('Refresh token has been revoked.', 401);
    }

    if (savedToken.expiresAt < new Date()) {
      throw new AuthError('Refresh token has expired. Please log in again.', 401);
    }

    const user = savedToken.user;
    if (!user || !user.isActive) {
      throw new AuthError('User account is no longer active.', 401);
    }

    if (user.organisation && user.organisation.status === 'SUSPENDED') {
      throw new AuthError('Organisation is suspended.', 403);
    }

    // Revoke old refresh token (Token rotation)
    await prisma.refreshToken.update({
      where: { id: savedToken.id },
      data: { revokedAt: new Date() },
    });

    const userRole = user.role as unknown as UserRole;

    // Generate new access & refresh tokens
    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: userRole,
      organisationId: user.organisationId,
    });

    const newRefreshToken = signRefreshToken({ userId: user.id });
    const refreshExpiresAt = calculateExpiryDate(config.jwtRefreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const expiresInSeconds = parseDurationToSeconds(config.jwtExpiresIn);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: expiresInSeconds,
      tokenType: 'Bearer',
    };
  }

  /**
   * Revoke refresh token(s) for logout.
   */
  async logout(userId: string, refreshTokenStr?: string): Promise<void> {
    if (refreshTokenStr) {
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshTokenStr,
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      // Revoke all tokens for this user
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get current authenticated user profile and organisation details.
   */
  async getMe(userId: string): Promise<{ user: User; organisation?: Organisation | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organisation: true,
      },
    });

    if (!user) {
      throw new AuthError('User not found.', 404);
    }

    return {
      user: sanitizeUser(user),
      organisation: (user.organisation as unknown as Organisation) ?? null,
    };
  }

  /**
   * Change password for authenticated user.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError('User not found.', 404);
    }

    const isMatch = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AuthError('Current password does not match.', 400);
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash, mustChangePassword: false },
      }),
      // Revoke all active refresh tokens on password change
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /**
   * Verify an invitation token before user accepts.
   */
  async verifyInvitation(token: string): Promise<VerifyInvitationResponse> {
    const invitation = await prisma.organisationInvitation.findUnique({
      where: { token },
      include: { organisation: true },
    });

    if (!invitation) {
      throw new AuthError('Invitation not found or link is invalid.', 404);
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new AuthError('This invitation has already been accepted.', 400);
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new AuthError('This invitation has been revoked.', 400);
    }

    if (invitation.expiresAt < new Date()) {
      if (invitation.status === InvitationStatus.PENDING) {
        await prisma.organisationInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
      }
      throw new AuthError('This invitation has expired. Please request a new invitation.', 400);
    }

    return {
      email: invitation.email,
      role: invitation.role as unknown as UserRole,
      organisationId: invitation.organisationId,
      organisationName: invitation.organisation.name,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Accept an invitation and register staff / admin user.
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<AuthResponse> {
    const invitation = await prisma.organisationInvitation.findUnique({
      where: { token: dto.token },
      include: { organisation: true },
    });

    if (!invitation) {
      throw new AuthError('Invitation not found or link is invalid.', 404);
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AuthError(
        `This invitation has already been ${invitation.status.toLowerCase()}.`,
        400,
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.organisationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new AuthError('This invitation has expired. Please request a new invitation.', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AuthError('A user with this email address already exists.', 409);
    }

    const passwordHash = await hashPassword(dto.password);

    // Create user and update invitation in a transaction
    const newUser = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: invitation.email.toLowerCase(),
            name: dto.name.trim(),
            mobile: dto.mobile?.trim() || null,
            passwordHash,
            role: invitation.role,
            organisationId: invitation.organisationId,
            isActive: true,
          },
          include: {
            organisation: true,
          },
        });

        await tx.organisationInvitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        });

        return user;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    const userRole = newUser.role as unknown as UserRole;

    // Generate tokens for immediate login
    const accessToken = signAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: userRole,
      organisationId: newUser.organisationId,
    });

    const refreshToken = signRefreshToken({ userId: newUser.id });
    const refreshExpiresAt = calculateExpiryDate(config.jwtRefreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: newUser.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const expiresInSeconds = parseDurationToSeconds(config.jwtExpiresIn);

    return {
      user: sanitizeUser(newUser),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: expiresInSeconds,
        tokenType: 'Bearer',
      },
      organisation: (newUser.organisation as unknown as Organisation) ?? null,
    };
  }

  /**
   * Request password reset token for unauthenticated user.
   */
  async forgotPassword(emailStr: string): Promise<{ message: string; resetToken?: string }> {
    const email = emailStr.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent email enumeration, return standard success message if not found/inactive
    if (!user || !user.isActive) {
      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Invalidate previous unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate 32-byte hex crypto token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
      ...((config.isDevelopment || config.isTest || !config.isProduction) && { resetToken: token }),
    };
  }

  /**
   * Reset user password using valid token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new AuthError('Invalid or expired password reset token.', 400);
    }

    if (resetRecord.usedAt) {
      throw new AuthError('This password reset token has already been used.', 400);
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new AuthError('This password reset token has expired. Please request a new one.', 400);
    }

    const user = resetRecord.user;
    if (!user || !user.isActive) {
      throw new AuthError('User account is no longer active.', 400);
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await prisma.$transaction(
      async (tx) => {
        // Update user password
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash: newPasswordHash, mustChangePassword: false },
        });

        // Mark reset token as used
        await tx.passwordResetToken.update({
          where: { id: resetRecord.id },
          data: { usedAt: new Date() },
        });

        // Revoke all active refresh tokens for the user
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }

  /**
   * Register a new retailer organisation and initial admin user account.
   */
  async registerRetailer(dto: RegisterRetailerDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AuthError('An account with this email address already exists.', 409);
    }

    // Check if organisation with this email already exists
    const existingOrg = await prisma.organisation.findUnique({
      where: { email },
    });

    if (existingOrg) {
      throw new AuthError('An organisation with this email address already exists.', 409);
    }

    const passwordHash = await hashPassword(dto.password);

    // Create organisation and user inside transaction
    const { newUser, newOrg } = await prisma.$transaction(
      async (tx) => {
        const org = await tx.organisation.create({
          data: {
            name: dto.businessName.trim(),
            email,
            mobile: dto.mobile?.trim() || null,
            address: dto.address?.trim() || null,
            area: dto.area?.trim() || null,
            city: dto.city?.trim() || null,
            taxNumber: dto.taxNumber?.trim() || null,
            status: OrganisationStatus.ACTIVE,
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            name: dto.name.trim(),
            mobile: dto.mobile?.trim() || null,
            passwordHash,
            role: UserRole.ADMIN,
            organisationId: org.id,
            isActive: true,
          },

          include: {
            organisation: true,
          },
        });

        return { newUser: user, newOrg: org };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    const userRole = newUser.role as unknown as UserRole;

    // Generate tokens for immediate login
    const accessToken = signAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: userRole,
      organisationId: newUser.organisationId,
    });

    const refreshToken = signRefreshToken({ userId: newUser.id });
    const refreshExpiresAt = calculateExpiryDate(config.jwtRefreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: newUser.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const expiresInSeconds = parseDurationToSeconds(config.jwtExpiresIn);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      tokenType: 'Bearer',
    };

    // Invalidate any previous unused registration OTPs for this email
    await prisma.otpCode.updateMany({
      where: {
        email,
        purpose: OtpPurpose.REGISTRATION,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate 6-digit registration verification OTP and save record
    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.REGISTRATION,
        expiresAt,
      },
    });

    // Send registration verification OTP email
    await emailService.sendRegistrationOtpEmail(
      email,
      otp,
      config.otpExpiryMinutes,
      dto.businessName,
    );

    return {
      user: sanitizeUser(newUser),
      tokens,
      organisation:
        (newUser.organisation as unknown as Organisation) ?? (newOrg as unknown as Organisation),
      ...(config.isDevelopment || config.isTest || !config.isProduction ? { otp } : {}),
    };
  }

  // ── OTP Authentication Methods ─────────────────────────────

  /**
   * Securely hash an OTP code using SHA-256 and platform secret.
   */
  private hashOtp(otp: string): string {
    return crypto
      .createHash('sha256')
      .update(otp + config.jwtSecret)
      .digest('hex');
  }

  /**
   * Generate a random 6-digit numeric OTP string.
   */
  private generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Request an OTP for email-based login.
   */
  async sendLoginOtp(emailStr: string): Promise<SendOtpResponse> {
    const email = emailStr.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organisation: true,
      },
    });

    if (!user) {
      throw new AuthError('No account found with this email address.', 404);
    }

    if (!user.isActive) {
      throw new AuthError('Account is deactivated. Please contact your administrator.', 403);
    }

    if (user.organisation && user.organisation.status === 'SUSPENDED') {
      throw new AuthError(
        'Your organisation is currently suspended. Please contact the distributor.',
        403,
      );
    }

    // Rate limiting: cooldown check
    const cooldownThreshold = new Date(Date.now() - config.otpCooldownSeconds * 1000);
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.LOGIN,
        createdAt: { gt: cooldownThreshold },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const remainingSecs = Math.max(
        1,
        Math.ceil(
          (recentOtp.createdAt.getTime() + config.otpCooldownSeconds * 1000 - Date.now()) / 1000,
        ),
      );
      throw new AuthError(
        `Please wait ${remainingSecs} seconds before requesting a new verification code.`,
        429,
      );
    }

    // Invalidate previous unused login OTPs for this email
    await prisma.otpCode.updateMany({
      where: {
        email,
        purpose: OtpPurpose.LOGIN,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate 6-digit code and save hashed record
    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.LOGIN,
        expiresAt,
      },
    });

    // Send email notification
    await emailService.sendLoginOtpEmail(email, otp, config.otpExpiryMinutes);

    return {
      message: 'A verification code has been sent to your email address.',
      expiresInSeconds: config.otpExpiryMinutes * 60,
      ...(config.isDevelopment || config.isTest || !config.isProduction ? { otp } : {}),
    };
  }

  /**
   * Verify login OTP and issue JWT access & refresh tokens.
   */
  async verifyLoginOtp(dto: VerifyLoginOtpDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const submittedOtp = dto.otp.trim();

    const latestOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.LOGIN,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw new AuthError('Invalid or expired verification code. Please request a new code.', 400);
    }

    if (latestOtp.expiresAt < new Date()) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError('Verification code has expired. Please request a new code.', 400);
    }

    if (latestOtp.attempts >= config.otpMaxAttempts) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError(
        'Maximum verification attempts exceeded. Please request a new code.',
        400,
      );
    }

    const expectedHash = this.hashOtp(submittedOtp);
    if (latestOtp.codeHash !== expectedHash) {
      const updatedOtp = await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { attempts: { increment: 1 } },
      });
      const remainingAttempts = config.otpMaxAttempts - updatedOtp.attempts;
      if (remainingAttempts <= 0) {
        await prisma.otpCode.update({
          where: { id: latestOtp.id },
          data: { usedAt: new Date() },
        });
        throw new AuthError(
          'Maximum verification attempts exceeded. Please request a new code.',
          400,
        );
      }
      throw new AuthError(
        `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        400,
      );
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: latestOtp.id },
      data: { usedAt: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organisation: true,
      },
    });

    if (!user) {
      throw new AuthError('User account not found.', 404);
    }

    if (!user.isActive) {
      throw new AuthError('Account is deactivated. Please contact your administrator.', 403);
    }

    if (user.organisation && user.organisation.status === 'SUSPENDED') {
      throw new AuthError(
        'Your organisation is currently suspended. Please contact the distributor.',
        403,
      );
    }

    const userRole = user.role as unknown as UserRole;

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: userRole,
      organisationId: user.organisationId,
    });

    const refreshToken = signRefreshToken({ userId: user.id });
    const refreshExpiresAt = calculateExpiryDate(config.jwtRefreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const expiresInSeconds = parseDurationToSeconds(config.jwtExpiresIn);

    return {
      user: sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: expiresInSeconds,
        tokenType: 'Bearer',
      },
      organisation: (user.organisation as unknown as Organisation) ?? null,
      mustChangePassword: user.mustChangePassword,
    };
  }

  /**
   * Request an OTP for password reset.
   */
  async sendForgotPasswordOtp(emailStr: string): Promise<SendOtpResponse> {
    const email = emailStr.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Anti-enumeration: if user doesn't exist or is inactive, return standard message
    if (!user || !user.isActive) {
      return {
        message: 'If an account exists with this email, a password reset code has been sent.',
        expiresInSeconds: config.otpExpiryMinutes * 60,
      };
    }

    // Rate limiting: cooldown check
    const cooldownThreshold = new Date(Date.now() - config.otpCooldownSeconds * 1000);
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.PASSWORD_RESET,
        createdAt: { gt: cooldownThreshold },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const remainingSecs = Math.max(
        1,
        Math.ceil(
          (recentOtp.createdAt.getTime() + config.otpCooldownSeconds * 1000 - Date.now()) / 1000,
        ),
      );
      throw new AuthError(
        `Please wait ${remainingSecs} seconds before requesting a new reset code.`,
        429,
      );
    }

    // Invalidate previous unused reset OTPs for this email
    await prisma.otpCode.updateMany({
      where: {
        email,
        purpose: OtpPurpose.PASSWORD_RESET,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt,
      },
    });

    await emailService.sendPasswordResetOtpEmail(email, otp, config.otpExpiryMinutes);

    return {
      message: 'If an account exists with this email, a password reset code has been sent.',
      expiresInSeconds: config.otpExpiryMinutes * 60,
      ...(config.isDevelopment || config.isTest || !config.isProduction ? { otp } : {}),
    };
  }

  /**
   * Verify password reset OTP validity before submitting new password.
   */
  async verifyForgotPasswordOtp(
    dto: VerifyForgotPasswordOtpDto,
  ): Promise<{ valid: boolean; message: string }> {
    const email = dto.email.toLowerCase().trim();
    const submittedOtp = dto.otp.trim();

    const latestOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.PASSWORD_RESET,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw new AuthError('Invalid or expired verification code. Please request a new code.', 400);
    }

    if (latestOtp.expiresAt < new Date()) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError('Verification code has expired. Please request a new code.', 400);
    }

    if (latestOtp.attempts >= config.otpMaxAttempts) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError(
        'Maximum verification attempts exceeded. Please request a new code.',
        400,
      );
    }

    const expectedHash = this.hashOtp(submittedOtp);
    if (latestOtp.codeHash !== expectedHash) {
      const updatedOtp = await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { attempts: { increment: 1 } },
      });
      const remainingAttempts = config.otpMaxAttempts - updatedOtp.attempts;
      if (remainingAttempts <= 0) {
        await prisma.otpCode.update({
          where: { id: latestOtp.id },
          data: { usedAt: new Date() },
        });
        throw new AuthError(
          'Maximum verification attempts exceeded. Please request a new code.',
          400,
        );
      }
      throw new AuthError(
        `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        400,
      );
    }

    return {
      valid: true,
      message: 'Verification code is valid.',
    };
  }

  /**
   * Reset user password using verified OTP.
   */
  async resetPasswordWithOtp(dto: ResetPasswordWithOtpDto): Promise<void> {
    const email = dto.email.toLowerCase().trim();
    const submittedOtp = dto.otp.trim();

    const latestOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.PASSWORD_RESET,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw new AuthError('Invalid or expired verification code. Please request a new code.', 400);
    }

    if (latestOtp.expiresAt < new Date()) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError('Verification code has expired. Please request a new code.', 400);
    }

    if (latestOtp.attempts >= config.otpMaxAttempts) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError(
        'Maximum verification attempts exceeded. Please request a new code.',
        400,
      );
    }

    const expectedHash = this.hashOtp(submittedOtp);
    if (latestOtp.codeHash !== expectedHash) {
      const updatedOtp = await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { attempts: { increment: 1 } },
      });
      const remainingAttempts = config.otpMaxAttempts - updatedOtp.attempts;
      if (remainingAttempts <= 0) {
        await prisma.otpCode.update({
          where: { id: latestOtp.id },
          data: { usedAt: new Date() },
        });
        throw new AuthError(
          'Maximum verification attempts exceeded. Please request a new code.',
          400,
        );
      }
      throw new AuthError(
        `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        400,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new AuthError('User account not found or deactivated.', 400);
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await prisma.$transaction(
      async (tx) => {
        // Update user password
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash: newPasswordHash, mustChangePassword: false },
        });

        // Mark OTP as used
        await tx.otpCode.update({
          where: { id: latestOtp.id },
          data: { usedAt: new Date() },
        });

        // Revoke all active refresh tokens for this user
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }

  /**
   * Resend / request an OTP for retailer registration verification.
   */
  async sendRegistrationOtp(emailStr: string): Promise<SendOtpResponse> {
    const email = emailStr.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organisation: true },
    });

    if (!user) {
      throw new AuthError('No account found with this email address.', 404);
    }

    // Rate limiting: cooldown check
    const cooldownThreshold = new Date(Date.now() - config.otpCooldownSeconds * 1000);
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.REGISTRATION,
        createdAt: { gt: cooldownThreshold },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const remainingSecs = Math.max(
        1,
        Math.ceil(
          (recentOtp.createdAt.getTime() + config.otpCooldownSeconds * 1000 - Date.now()) / 1000,
        ),
      );
      throw new AuthError(
        `Please wait ${remainingSecs} seconds before requesting a new verification code.`,
        429,
      );
    }

    // Invalidate previous unused registration OTPs for this email
    await prisma.otpCode.updateMany({
      where: {
        email,
        purpose: OtpPurpose.REGISTRATION,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate 6-digit code and save hashed record
    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.REGISTRATION,
        expiresAt,
      },
    });

    // Send email notification
    await emailService.sendRegistrationOtpEmail(
      email,
      otp,
      config.otpExpiryMinutes,
      user.organisation?.name,
    );

    return {
      message: 'A verification code has been sent to your email address.',
      expiresInSeconds: config.otpExpiryMinutes * 60,
      ...(config.isDevelopment || config.isTest || !config.isProduction ? { otp } : {}),
    };
  }

  /**
   * Verify retailer registration OTP.
   */
  async verifyRegistrationOtp(
    dto: VerifyRegistrationOtpDto,
  ): Promise<{ message: string; valid: boolean; user: ReturnType<typeof sanitizeUser> }> {
    const email = dto.email.toLowerCase().trim();
    const submittedOtp = dto.otp.trim();

    const latestOtp = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: OtpPurpose.REGISTRATION,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw new AuthError('Invalid or expired verification code. Please request a new code.', 400);
    }

    if (latestOtp.expiresAt < new Date()) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError('Verification code has expired. Please request a new code.', 400);
    }

    if (latestOtp.attempts >= config.otpMaxAttempts) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { usedAt: new Date() },
      });
      throw new AuthError(
        'Maximum verification attempts exceeded. Please request a new code.',
        400,
      );
    }

    const expectedHash = this.hashOtp(submittedOtp);
    if (latestOtp.codeHash !== expectedHash) {
      const updatedOtp = await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { attempts: { increment: 1 } },
      });
      const remainingAttempts = config.otpMaxAttempts - updatedOtp.attempts;
      if (remainingAttempts <= 0) {
        await prisma.otpCode.update({
          where: { id: latestOtp.id },
          data: { usedAt: new Date() },
        });
        throw new AuthError(
          'Maximum verification attempts exceeded. Please request a new code.',
          400,
        );
      }
      throw new AuthError(
        `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        400,
      );
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: latestOtp.id },
      data: { usedAt: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organisation: true },
    });

    if (!user) {
      throw new AuthError('User account not found.', 404);
    }

    return {
      message: 'Retailer account email verified successfully.',
      valid: true,
      user: sanitizeUser(user),
    };
  }

  // ── Session & Security Methods ─────────────────────────────

  /**
   * Get all active sessions for a user.
   */
  async getActiveSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<
    Array<{
      id: string;
      tokenPreview: string;
      ipAddress: string | null;
      userAgent: string | null;
      deviceInfo: string | null;
      isCurrentSession: boolean;
      createdAt: Date;
      lastActiveAt: Date;
      expiresAt: Date;
    }>
  > {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      tokenPreview: s.token.length > 10 ? `...${s.token.slice(-8)}` : s.token,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceInfo: s.deviceInfo,
      isCurrentSession: currentRefreshToken ? s.token === currentRefreshToken : false,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * Revoke a specific session by ID.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new AuthError('Session not found.', 404);
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get recent login activity for a user.
   */
  async getSignInActivity(
    userId: string,
    limit: number = 20,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      ipAddress: string | null;
      userAgent: string | null;
      device: string | null;
      location: string | null;
      isSuccess: boolean;
      createdAt: Date;
    }>
  > {
    const activities = await prisma.userLoginActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });

    return activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      device: a.device,
      location: a.location,
      isSuccess: a.isSuccess,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Get Two-Step Verification (2FA) status.
   */
  async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user) {
      throw new AuthError('User not found.', 404);
    }

    return {
      enabled: user.twoFactorEnabled,
    };
  }

  /**
   * Toggle Two-Step Verification (2FA) status.
   */
  async toggleTwoFactor(
    userId: string,
    enabled: boolean,
    password?: string,
  ): Promise<{ enabled: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError('User not found.', 404);
    }

    // Require password confirmation when enabling/disabling 2FA
    if (password) {
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        throw new AuthError('Incorrect password. Cannot change two-step verification.', 400);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    });

    return {
      enabled,
      message: `Two-step verification has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
    };
  }
}

export const authService = new AuthService();

