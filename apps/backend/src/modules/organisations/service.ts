import {
  type Organisation,
  type BusinessDetails,
  type PaginationMeta,
  type AuthContext,
  OrganisationStatus,
  UserRole,
} from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import {
  type CreateOrganisationInput,
  type UpdateOrganisationInput,
  type UpdateBusinessDetailsInput,
  type OrganisationFilterInput,
} from './validator';

export class OrganisationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'OrganisationError';
  }
}

export interface ListOrganisationsResult {
  organisations: Organisation[];
  pagination: PaginationMeta;
}

/**
 * Generates a human-friendly Retailer ID format (e.g. RT-20418)
 */
export function formatRetailerId(orgId: string): string {
  const clean = orgId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `RT-${clean.slice(0, 5)}`;
}

export class OrganisationsService {
  /**
   * List organisations with search, filtering, and pagination (for distributor/super admin).
   */
  async listOrganisations(filters?: OrganisationFilterInput): Promise<ListOrganisationsResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { taxNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.city && filters.city.trim()) {
      where.city = { contains: filters.city.trim(), mode: 'insensitive' };
    }

    const [total, list] = await Promise.all([
      prisma.organisation.count({ where }),
      prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      organisations: list.map((org) => ({
        id: org.id,
        name: org.name,
        email: org.email,
        mobile: org.mobile,
        address: org.address,
        area: org.area,
        city: org.city,
        taxNumber: org.taxNumber,
        status: org.status as OrganisationStatus,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
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
   * Get organisation by ID.
   */
  async getOrganisationById(id: string): Promise<Organisation | null> {
    const org = await prisma.organisation.findUnique({
      where: { id },
    });

    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      email: org.email,
      mobile: org.mobile,
      address: org.address,
      area: org.area,
      city: org.city,
      taxNumber: org.taxNumber,
      status: org.status as OrganisationStatus,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Get comprehensive business details for a retailer organisation.
   */
  async getBusinessDetails(caller: AuthContext, targetOrgId?: string): Promise<BusinessDetails> {
    let orgId: string | null | undefined = caller.organisationId;

    if (caller.role === UserRole.SUPER_ADMIN) {
      orgId = targetOrgId || caller.organisationId;
      if (!orgId) {
        const firstOrg = await prisma.organisation.findFirst({
          orderBy: { createdAt: 'desc' },
        });
        if (!firstOrg) {
          throw new OrganisationError('No organisations found on the platform', 404);
        }
        orgId = firstOrg.id;
      }
    } else {
      if (targetOrgId && targetOrgId !== caller.organisationId) {
        throw new OrganisationError(
          'Forbidden: Cannot access business details of another organisation',
          403,
        );
      }
    }

    if (!orgId) {
      throw new OrganisationError('No organisation associated with this user account', 400);
    }

    const org = await prisma.organisation.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: { role: UserRole.ADMIN, isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!org) {
      throw new OrganisationError('Organisation not found', 404);
    }

    const primaryAdmin = org.users[0];

    return {
      id: org.id,
      retailerId: formatRetailerId(org.id),
      name: org.name,
      email: org.email,
      mobile: org.mobile,
      address: org.address,
      area: org.area,
      city: org.city,
      taxNumber: org.taxNumber,
      contactPerson: primaryAdmin?.name || null,
      contactEmail: primaryAdmin?.email || org.email,
      contactMobile: primaryAdmin?.mobile || org.mobile,
      status: org.status as OrganisationStatus,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Update business details (contact person, business name, tax ID, email, mobile, address).
   * Restricted to Retailer Admin (for their own org) or Super Admin.
   */
  async updateBusinessDetails(
    caller: AuthContext,
    data: UpdateBusinessDetailsInput,
    targetOrgId?: string,
  ): Promise<BusinessDetails> {
    if (caller.role === UserRole.STAFF) {
      throw new OrganisationError(
        'Forbidden: Only retailer admin or super admin can change business details',
        403,
      );
    }

    let orgId: string | null | undefined = caller.organisationId;

    if (caller.role === UserRole.SUPER_ADMIN) {
      orgId = targetOrgId || caller.organisationId;
      if (!orgId) {
        throw new OrganisationError('Organisation ID is required for Super Admin', 400);
      }
    } else {
      if (!caller.organisationId) {
        throw new OrganisationError('No organisation associated with this user account', 400);
      }
      if (targetOrgId && targetOrgId !== caller.organisationId) {
        throw new OrganisationError(
          'Forbidden: Cannot update business details of another organisation',
          403,
        );
      }
      orgId = caller.organisationId;
    }

    const existingOrg = await prisma.organisation.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: { role: UserRole.ADMIN },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!existingOrg) {
      throw new OrganisationError('Organisation not found', 404);
    }

    // Check email collision
    if (data.email && data.email !== existingOrg.email) {
      const conflict = await prisma.organisation.findUnique({
        where: { email: data.email },
      });
      if (conflict && conflict.id !== orgId) {
        throw new OrganisationError('An organisation with this email already exists', 409);
      }
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      await tx.organisation.update({
        where: { id: orgId! },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.mobile !== undefined && { mobile: data.mobile }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber }),
        },
      });

      if (data.contactPerson) {
        const adminUserId =
          caller.role === UserRole.ADMIN && caller.organisationId === orgId
            ? caller.userId
            : existingOrg.users[0]?.id;

        if (adminUserId) {
          await tx.user.update({
            where: { id: adminUserId },
            data: { name: data.contactPerson },
          });
        }
      }
    });

    return this.getBusinessDetails(caller, orgId!);
  }

  /**
   * Create a new retailer organisation (Distributor / Super Admin only).
   */
  async createOrganisation(data: CreateOrganisationInput): Promise<Organisation> {
    const org = await prisma.organisation.create({
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile || null,
        address: data.address || null,
        area: data.area || null,
        city: data.city || null,
        taxNumber: data.taxNumber || null,
        status: OrganisationStatus.ACTIVE,
      },
    });

    return {
      id: org.id,
      name: org.name,
      email: org.email,
      mobile: org.mobile,
      address: org.address,
      area: org.area,
      city: org.city,
      taxNumber: org.taxNumber,
      status: org.status as OrganisationStatus,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Update organisation details.
   */
  async updateOrganisation(
    caller: AuthContext,
    id: string,
    data: UpdateOrganisationInput,
  ): Promise<Organisation> {
    if (caller.role === UserRole.STAFF) {
      throw new OrganisationError(
        'Forbidden: Only retailer admin or super admin can change organisation details',
        403,
      );
    }

    if (caller.role === UserRole.ADMIN && caller.organisationId !== id) {
      throw new OrganisationError('Forbidden: Cannot update another organisation', 403);
    }

    const existingOrg = await prisma.organisation.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: UserRole.ADMIN },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!existingOrg) {
      throw new OrganisationError('Organisation not found', 404);
    }

    if (data.email && data.email !== existingOrg.email) {
      const conflict = await prisma.organisation.findUnique({
        where: { email: data.email },
      });
      if (conflict && conflict.id !== id) {
        throw new OrganisationError('An organisation with this email already exists', 409);
      }
    }

    const statusToUpdate = caller.role === UserRole.SUPER_ADMIN ? data.status : undefined;

    const org = await prisma.$transaction(async (tx) => {
      const updated = await tx.organisation.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.mobile !== undefined && { mobile: data.mobile }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber }),
          ...(statusToUpdate && { status: statusToUpdate }),
        },
      });

      if (data.contactPerson) {
        const adminUserId =
          caller.role === UserRole.ADMIN && caller.organisationId === id
            ? caller.userId
            : existingOrg.users[0]?.id;

        if (adminUserId) {
          await tx.user.update({
            where: { id: adminUserId },
            data: { name: data.contactPerson },
          });
        }
      }

      return updated;
    });

    return {
      id: org.id,
      name: org.name,
      email: org.email,
      mobile: org.mobile,
      address: org.address,
      area: org.area,
      city: org.city,
      taxNumber: org.taxNumber,
      status: org.status as OrganisationStatus,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  /**
   * Update organisation status (Distributor / Super Admin only).
   */
  async updateOrganisationStatus(
    caller: AuthContext,
    id: string,
    status: OrganisationStatus,
  ): Promise<Organisation> {
    if (caller.role !== UserRole.SUPER_ADMIN) {
      throw new OrganisationError(
        'Forbidden: Only super admin can change organisation operational status',
        403,
      );
    }

    const org = await prisma.organisation.update({
      where: { id },
      data: { status },
    });

    return {
      id: org.id,
      name: org.name,
      email: org.email,
      mobile: org.mobile,
      address: org.address,
      area: org.area,
      city: org.city,
      taxNumber: org.taxNumber,
      status: org.status as OrganisationStatus,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}

export const organisationsService = new OrganisationsService();
