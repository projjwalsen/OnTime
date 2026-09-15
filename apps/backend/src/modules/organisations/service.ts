import { type Organisation, type PaginationMeta, OrganisationStatus } from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import {
  type CreateOrganisationInput,
  type UpdateOrganisationInput,
  type OrganisationFilterInput,
} from './validator';

export interface ListOrganisationsResult {
  organisations: Organisation[];
  pagination: PaginationMeta;
}

export class OrganisationsService {
  /**
   * List organisations with search, filtering, and pagination (for distributor).
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
   * Create a new retailer organisation (Distributor only).
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
  async updateOrganisation(id: string, data: UpdateOrganisationInput): Promise<Organisation> {
    const org = await prisma.organisation.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.area !== undefined && { area: data.area }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber }),
        ...(data.status && { status: data.status }),
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
}

export const organisationsService = new OrganisationsService();
