import { type User, type Organisation, UserRole } from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type UpdateUserProfileInput } from './validator';

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
}

export const usersService = new UsersService();
