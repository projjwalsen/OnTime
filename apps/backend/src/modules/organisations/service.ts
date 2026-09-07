import { type Organisation, OrganisationStatus } from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type CreateOrganisationInput, type UpdateOrganisationInput } from './validator';

export class OrganisationsService {
  /**
   * List all organisations (for distributor) or single organisation.
   */
  async listOrganisations(): Promise<Organisation[]> {
    const list = await prisma.organisation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return list.map((org) => ({
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
    }));
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
