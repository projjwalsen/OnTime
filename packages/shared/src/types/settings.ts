/**
 * Settings and platform configuration types.
 */

export interface TaxSettings {
  taxName: string;
  taxRate: number; // Percentage, e.g. 15 for 15%
  isEnabled: boolean;
  updatedAt?: string | null;
}

export interface UpdateTaxSettingsDto {
  taxName?: string | undefined;
  taxRate?: number | undefined;
  isEnabled?: boolean | undefined;
}

