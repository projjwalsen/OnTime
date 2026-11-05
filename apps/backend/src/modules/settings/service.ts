import { prisma } from '../../lib/prisma';
import { type TaxSettings, type UpdateTaxSettingsDto } from '@ontime/shared';

export class SettingsService {
  private cachedSettings: TaxSettings = {
    taxName: 'VAT',
    taxRate: 0,
    isEnabled: false,
    updatedAt: null,
  };
  private isInitialized = false;

  /**
   * Ensure the tax_settings table exists in PostgreSQL.
   */
  private async ensureTable(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "tax_settings" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
          "taxName" TEXT NOT NULL DEFAULT 'VAT',
          "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
          "isEnabled" BOOLEAN NOT NULL DEFAULT false,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.isInitialized = true;
    } catch (err) {
      console.warn('[SettingsService] Table creation warning:', err);
    }
  }

  /**
   * Get current tax settings.
   */
  async getTaxSettings(): Promise<TaxSettings> {
    await this.ensureTable();
    try {
      const record = await prisma.taxSetting.findUnique({
        where: { id: 'default' },
      });

      if (!record) {
        // Return default / cached
        return this.cachedSettings;
      }

      this.cachedSettings = {
        taxName: record.taxName,
        taxRate: Number(record.taxRate),
        isEnabled: record.isEnabled,
        updatedAt: record.updatedAt.toISOString(),
      };

      return this.cachedSettings;
    } catch (err) {
      console.warn('[SettingsService] Failed to read tax settings, using cache:', err);
      return this.cachedSettings;
    }
  }

  /**
   * Update tax settings (Super Admin only).
   */
  async updateTaxSettings(input: UpdateTaxSettingsDto): Promise<TaxSettings> {
    await this.ensureTable();

    const current = await this.getTaxSettings();

    const newTaxName = input.taxName !== undefined ? input.taxName.trim() : current.taxName;
    const newTaxRate = input.taxRate !== undefined ? Number(input.taxRate) : current.taxRate;
    const newIsEnabled =
      input.isEnabled !== undefined ? Boolean(input.isEnabled) : current.isEnabled;

    try {
      const upserted = await prisma.taxSetting.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          taxName: newTaxName,
          taxRate: newTaxRate,
          isEnabled: newIsEnabled,
        },
        update: {
          taxName: newTaxName,
          taxRate: newTaxRate,
          isEnabled: newIsEnabled,
        },
      });

      this.cachedSettings = {
        taxName: upserted.taxName,
        taxRate: Number(upserted.taxRate),
        isEnabled: upserted.isEnabled,
        updatedAt: upserted.updatedAt.toISOString(),
      };

      return this.cachedSettings;
    } catch (err) {
      console.error('[SettingsService] Failed to upsert tax settings:', err);
      // Update memory cache
      this.cachedSettings = {
        taxName: newTaxName,
        taxRate: newTaxRate,
        isEnabled: newIsEnabled,
        updatedAt: new Date().toISOString(),
      };
      return this.cachedSettings;
    }
  }

  /**
   * Calculate tax for order items taking tax-exempt (noVat) products into account.
   */
  async calculateOrderTax(
    items: Array<{
      unitPrice: number;
      quantity: number;
      noVat: boolean;
    }>,
    discountAmount: number = 0,
  ): Promise<{
    taxAmount: number;
    taxRate: number;
    taxName: string;
    taxableSubtotal: number;
  }> {
    const settings = await this.getTaxSettings();

    if (!settings.isEnabled || settings.taxRate <= 0) {
      return {
        taxAmount: 0,
        taxRate: 0,
        taxName: settings.taxName,
        taxableSubtotal: 0,
      };
    }

    const totalSubtotal = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    const taxableSubtotal = items
      .filter((it) => !it.noVat)
      .reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

    if (taxableSubtotal <= 0) {
      return {
        taxAmount: 0,
        taxRate: settings.taxRate,
        taxName: settings.taxName,
        taxableSubtotal: 0,
      };
    }

    // Deduct proportional discount from taxable base
    let taxableBase = taxableSubtotal;
    if (discountAmount > 0 && totalSubtotal > 0) {
      const proportionalDiscount = (discountAmount * taxableSubtotal) / totalSubtotal;
      taxableBase = Math.max(0, taxableSubtotal - proportionalDiscount);
    }

    const taxAmount = Math.round(((taxableBase * settings.taxRate) / 100) * 100) / 100;

    return {
      taxAmount,
      taxRate: settings.taxRate,
      taxName: settings.taxName,
      taxableSubtotal: Math.round(taxableSubtotal * 100) / 100,
    };
  }
}

export const settingsService = new SettingsService();
