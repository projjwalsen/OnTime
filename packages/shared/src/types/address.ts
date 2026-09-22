export interface DeliveryAddress {
  id: string;
  organisationId: string;
  label: string; // e.g. "Main store", "Warehouse"
  streetAddress: string;
  city: string;
  postalCode: string;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAddressDto {
  label: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  label?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  deliveryInstructions?: string | null;
  isDefault?: boolean;
}
