import { type DeliveryAddress } from '@ontime/shared';
import { prisma } from '../../lib/prisma';
import { type CreateAddressInput, type UpdateAddressInput } from './validator';

export class AddressError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AddressError';
  }
}

export class AddressesService {
  /**
   * List all delivery addresses for an organisation.
   */
  async listAddresses(organisationId: string): Promise<DeliveryAddress[]> {
    const addresses = await prisma.deliveryAddress.findMany({
      where: { organisationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((addr) => ({
      id: addr.id,
      organisationId: addr.organisationId,
      label: addr.label,
      streetAddress: addr.streetAddress,
      city: addr.city,
      postalCode: addr.postalCode,
      deliveryInstructions: addr.deliveryInstructions,
      isDefault: addr.isDefault,
      createdAt: addr.createdAt,
      updatedAt: addr.updatedAt,
    }));
  }

  /**
   * Get an address by ID with organisation scoping.
   */
  async getAddressById(id: string, organisationId?: string): Promise<DeliveryAddress | null> {
    const address = await prisma.deliveryAddress.findUnique({
      where: { id },
    });

    if (!address) return null;
    if (organisationId && address.organisationId !== organisationId) {
      throw new AddressError('Forbidden: Cannot access another organisation address.', 403);
    }

    return {
      id: address.id,
      organisationId: address.organisationId,
      label: address.label,
      streetAddress: address.streetAddress,
      city: address.city,
      postalCode: address.postalCode,
      deliveryInstructions: address.deliveryInstructions,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * Create a new delivery address.
   * If isDefault is true or this is the first address, set isDefault: true and unset previous default.
   */
  async createAddress(organisationId: string, data: CreateAddressInput): Promise<DeliveryAddress> {
    const count = await prisma.deliveryAddress.count({ where: { organisationId } });
    const shouldBeDefault = data.isDefault || count === 0;

    const created = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.deliveryAddress.updateMany({
          where: { organisationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.deliveryAddress.create({
        data: {
          organisationId,
          label: data.label.trim(),
          streetAddress: data.streetAddress.trim(),
          city: data.city.trim(),
          postalCode: data.postalCode.trim(),
          deliveryInstructions: data.deliveryInstructions?.trim() || null,
          isDefault: shouldBeDefault,
        },
      });
    });

    return {
      id: created.id,
      organisationId: created.organisationId,
      label: created.label,
      streetAddress: created.streetAddress,
      city: created.city,
      postalCode: created.postalCode,
      deliveryInstructions: created.deliveryInstructions,
      isDefault: created.isDefault,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Update delivery address.
   */
  async updateAddress(
    id: string,
    organisationId: string | null,
    data: UpdateAddressInput,
  ): Promise<DeliveryAddress> {
    const existing = await prisma.deliveryAddress.findUnique({ where: { id } });
    if (!existing) {
      throw new AddressError('Address not found.', 404);
    }
    if (organisationId && existing.organisationId !== organisationId) {
      throw new AddressError('Forbidden: Cannot update another organisation address.', 403);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.deliveryAddress.updateMany({
          where: { organisationId: existing.organisationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.deliveryAddress.update({
        where: { id },
        data: {
          ...(data.label && { label: data.label.trim() }),
          ...(data.streetAddress && { streetAddress: data.streetAddress.trim() }),
          ...(data.city && { city: data.city.trim() }),
          ...(data.postalCode && { postalCode: data.postalCode.trim() }),
          ...(data.deliveryInstructions !== undefined && {
            deliveryInstructions: data.deliveryInstructions?.trim() || null,
          }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        },
      });
    });

    return {
      id: updated.id,
      organisationId: updated.organisationId,
      label: updated.label,
      streetAddress: updated.streetAddress,
      city: updated.city,
      postalCode: updated.postalCode,
      deliveryInstructions: updated.deliveryInstructions,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Set address as default delivery location.
   */
  async setDefaultAddress(id: string, organisationId: string | null): Promise<DeliveryAddress> {
    return this.updateAddress(id, organisationId, { isDefault: true });
  }

  /**
   * Delete a delivery address.
   */
  async deleteAddress(id: string, organisationId: string | null): Promise<void> {
    const existing = await prisma.deliveryAddress.findUnique({ where: { id } });
    if (!existing) {
      throw new AddressError('Address not found.', 404);
    }
    if (organisationId && existing.organisationId !== organisationId) {
      throw new AddressError('Forbidden: Cannot delete another organisation address.', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.deliveryAddress.delete({ where: { id } });

      // If the deleted address was default, make the most recent remaining address default
      if (existing.isDefault) {
        const remaining = await tx.deliveryAddress.findFirst({
          where: { organisationId: existing.organisationId },
          orderBy: { createdAt: 'desc' },
        });

        if (remaining) {
          await tx.deliveryAddress.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }
}

export const addressesService = new AddressesService();
